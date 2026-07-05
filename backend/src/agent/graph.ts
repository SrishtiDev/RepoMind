import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { retrieveNode } from "./nodes/retrieve";
import { assessNode } from "./nodes/assess";
import { answerNode } from "./nodes/answer";
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
  refinedQuery: Annotation<string | undefined>({
    reducer: (_, next) => next,
    default: () => undefined,
  }),
  retrievedChunks: Annotation<Chunk[]>({
    reducer: (_, next) => next,
    default: () => [],
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
const ASSESS = "assess" as const;
const ANSWER = "generate_answer" as const;

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
  .addNode(ASSESS, assessNode)
  .addNode(ANSWER, answerNode)

  // Entry point
  .addEdge(START, RETRIEVE)

  // Linear edge: retrieve → assess
  .addEdge(RETRIEVE, ASSESS)

  // Conditional edge: assess → retrieve (retry) OR assess → answer (done)
  .addConditionalEdges(ASSESS, routeAfterAssess, {
    [RETRIEVE]: RETRIEVE,
    [ANSWER]: ANSWER,
  })

  // Terminal edge
  .addEdge(ANSWER, END);

// ─── Compiled Graph (module singleton) ───────────────────────────────────────
//
// Compiling once at module load means the graph is reused across requests
// without re-building the topology on every invocation.

export const repoMindGraph = workflow.compile();
