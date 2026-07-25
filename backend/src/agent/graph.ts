import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { retrieveNode } from "./nodes/retrieve";
import { assessNode } from "./nodes/assess";
import { answerNode } from "./nodes/answer";
import { classifyQuestionTags } from "./nodes/classifyTags";
import { retrieveFromGraph, GraphContextNode } from "./nodes/graphRetrieve";
import { mergeContexts, MergedContext } from "./nodes/mergeContext";
import { AgentState, Chunk, Source } from "./state";

// ─── Routing Threshold ───────────────────────────────────────────────────────
//
// When the average cosine similarity of the top-k retrieved chunks is at or
// above this value, the ASSESS node (which makes an extra LLM call) is skipped
// entirely and we route straight to ANSWER.
// Cosine similarity range: 0.0 (orthogonal) → 1.0 (identical).
// For gemini-embedding-2 on code, scores typically fall between 0.60–0.90.
// Tune this constant to trade off latency vs. answer quality gate:
//   higher → more questions go through ASSESS (safer, slower)
//   lower  → more questions skip ASSESS (faster, fewer safety checks)
const ASSESS_SKIP_THRESHOLD = 0.75;

// ─── State Annotation ────────────────────────────────────────────────────────
//
// LangGraph requires an Annotation object to describe state shape and reducer
// behaviour. We use the default "last write wins" reducer for all fields since
// each node returns only the slice it mutates.

const GraphAnnotation = Annotation.Root({
  question: Annotation<string>({
    reducer: (_, next) => next,
    default: () => "",
  }),
  repoUrl: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  refinedQuery: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  retrievedChunks: Annotation<Chunk[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
  /** Average cosine similarity (0–1) of top-k chunks from the last RETRIEVE pass. */
  retrievalConfidence: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  matchedTags: Annotation<string[] | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  graphContext: Annotation<GraphContextNode[] | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  mergedContext: Annotation<MergedContext[] | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  isSufficient: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  retryCount: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
  answer: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  sources: Annotation<Source[] | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
});

// ─── Node Names ───────────────────────────────────────────────────────────────
// String constants prevent typos when wiring edges.

const RETRIEVE = "retrieve" as const;
const CLASSIFY_TAGS = "classify_tags" as const;
const GRAPH_RETRIEVE = "graph_retrieve" as const;
const MERGE_CONTEXT = "merge_context" as const;
const ASSESS = "assess" as const;
const ANSWER = "generate_answer" as const;

// ─── Node Wrappers ────────────────────────────────────────────────────────────

async function classifyTagsNode(state: AgentState) {
  const tags = await classifyQuestionTags(state.question);
  return { matchedTags: tags };
}

async function graphRetrieveNode(state: AgentState) {
  const repoUrl = state.repoUrl ?? "";
  const tags = state.matchedTags ?? [];
  const graphNodes = await retrieveFromGraph(repoUrl, tags);
  return { graphContext: graphNodes };
}

async function mergeContextNode(state: AgentState) {
  const vectorChunks = state.retrievedChunks || [];
  const graphNodes = state.graphContext || [];
  const repoUrl = state.repoUrl ?? "";
  
  const merged = await mergeContexts(repoUrl, vectorChunks, graphNodes);
  
  // We overwrite retrievedChunks with merged so assess.ts uses it transparently
  return { mergedContext: merged, retrievedChunks: merged };
}

// ─── Conditional Routing ──────────────────────────────────────────────────────

/**
 * Decides the next node after the assess step.
 *  - If the LLM judged context insufficient (and retry cap not hit), loop back
 *    to retrieve with the refined query.
 *  - Otherwise, proceed to answer.
 */
function routeAfterAssess(state: AgentState): typeof RETRIEVE | typeof ANSWER {
  return state.isSufficient ? ANSWER : RETRIEVE;
}

// ─── Graph Assembly ───────────────────────────────────────────────────────────

const workflow = new StateGraph(GraphAnnotation)
  // Register nodes
  .addNode(RETRIEVE, retrieveNode)
  .addNode(CLASSIFY_TAGS, classifyTagsNode)
  .addNode(GRAPH_RETRIEVE, graphRetrieveNode)
  .addNode(MERGE_CONTEXT, mergeContextNode)
  .addNode(ASSESS, assessNode)
  .addNode(ANSWER, answerNode)

  // Entry point fans out to vector retrieve and tag classification
  .addEdge(START, RETRIEVE)
  .addEdge(START, CLASSIFY_TAGS)

  // Graph retrieval path
  .addEdge(CLASSIFY_TAGS, GRAPH_RETRIEVE)

  // Fan in: both retrieval paths must complete before merge
  .addEdge([RETRIEVE, GRAPH_RETRIEVE], MERGE_CONTEXT)

  // Proceed to assess — but only when retrieval confidence is low.
  // If the average cosine similarity of the retrieved chunks already meets
  // ASSESS_SKIP_THRESHOLD, we bypass the LLM-based sufficiency check entirely
  // and route straight to ANSWER (saves ~1-2s per query).
  .addConditionalEdges(MERGE_CONTEXT, (state: AgentState) => {
    const conf = state.retrievalConfidence ?? 0;
    if (conf >= ASSESS_SKIP_THRESHOLD) {
      console.log(
        `[Graph] retrievalConfidence=${conf.toFixed(3)} >= ${ASSESS_SKIP_THRESHOLD} → SKIP_ASSESS, routing direct to ANSWER`
      );
      return ANSWER;
    }
    console.log(
      `[Graph] retrievalConfidence=${conf.toFixed(3)} < ${ASSESS_SKIP_THRESHOLD} → RUN_ASSESS`
    );
    return ASSESS;
  })

  // Conditional edge: assess → retry (both paths) OR assess → answer (done)
  .addConditionalEdges(ASSESS, (state: AgentState) => {
    if (state.isSufficient) return ANSWER;
    // On retry, fan out again
    return ["retry_vector", "retry_tags"];
  }, {
    ["retry_vector"]: RETRIEVE,
    ["retry_tags"]: CLASSIFY_TAGS,
    [ANSWER]: ANSWER,
  })

  // Terminal edge
  .addEdge(ANSWER, END);

// ─── Compiled Graph (module singleton) ───────────────────────────────────────
//
// Compiling once at module load means the graph is reused across requests
// without re-building the topology on every invocation.

export const repoMindGraph = workflow.compile();
