import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { retrieveNode } from "./nodes/retrieve";
import { assessNode } from "./nodes/assess";
import { answerNode } from "./nodes/answer";
import { classifyQuestionTags } from "./nodes/classifyTags";
import { retrieveFromGraph, GraphContextNode } from "./nodes/graphRetrieve";
import { mergeContexts, MergedContext } from "./nodes/mergeContext";
import { AgentState, Chunk, Source } from "./state";

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

  // Proceed to assess
  .addEdge(MERGE_CONTEXT, ASSESS)

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
