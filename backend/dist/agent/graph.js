"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repoMindGraph = void 0;
const langgraph_1 = require("@langchain/langgraph");
const retrieve_1 = require("./nodes/retrieve");
const assess_1 = require("./nodes/assess");
const answer_1 = require("./nodes/answer");
const classifyTags_1 = require("./nodes/classifyTags");
const graphRetrieve_1 = require("./nodes/graphRetrieve");
const mergeContext_1 = require("./nodes/mergeContext");
// ─── State Annotation ────────────────────────────────────────────────────────
//
// LangGraph requires an Annotation object to describe state shape and reducer
// behaviour. We use the default "last write wins" reducer for all fields since
// each node returns only the slice it mutates.
const GraphAnnotation = langgraph_1.Annotation.Root({
    question: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => "",
    }),
    repoUrl: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    refinedQuery: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    retrievedChunks: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => [],
    }),
    matchedTags: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    graphContext: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    mergedContext: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    isSufficient: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => false,
    }),
    retryCount: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => 0,
    }),
    answer: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
    sources: (0, langgraph_1.Annotation)({
        reducer: (_, next) => next,
        default: () => undefined,
    }),
});
// ─── Node Names ───────────────────────────────────────────────────────────────
// String constants prevent typos when wiring edges.
const RETRIEVE = "retrieve";
const CLASSIFY_TAGS = "classify_tags";
const GRAPH_RETRIEVE = "graph_retrieve";
const MERGE_CONTEXT = "merge_context";
const ASSESS = "assess";
const ANSWER = "generate_answer";
// ─── Node Wrappers ────────────────────────────────────────────────────────────
async function classifyTagsNode(state) {
    const tags = await (0, classifyTags_1.classifyQuestionTags)(state.question);
    return { matchedTags: tags };
}
async function graphRetrieveNode(state) {
    const repoUrl = state.repoUrl ?? "";
    const tags = state.matchedTags ?? [];
    const graphNodes = await (0, graphRetrieve_1.retrieveFromGraph)(repoUrl, tags);
    return { graphContext: graphNodes };
}
async function mergeContextNode(state) {
    const vectorChunks = state.retrievedChunks || [];
    const graphNodes = state.graphContext || [];
    const repoUrl = state.repoUrl ?? "";
    const merged = await (0, mergeContext_1.mergeContexts)(repoUrl, vectorChunks, graphNodes);
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
function routeAfterAssess(state) {
    return state.isSufficient ? ANSWER : RETRIEVE;
}
// ─── Graph Assembly ───────────────────────────────────────────────────────────
const workflow = new langgraph_1.StateGraph(GraphAnnotation)
    // Register nodes
    .addNode(RETRIEVE, retrieve_1.retrieveNode)
    .addNode(CLASSIFY_TAGS, classifyTagsNode)
    .addNode(GRAPH_RETRIEVE, graphRetrieveNode)
    .addNode(MERGE_CONTEXT, mergeContextNode)
    .addNode(ASSESS, assess_1.assessNode)
    .addNode(ANSWER, answer_1.answerNode)
    // Entry point fans out to vector retrieve and tag classification
    .addEdge(langgraph_1.START, RETRIEVE)
    .addEdge(langgraph_1.START, CLASSIFY_TAGS)
    // Graph retrieval path
    .addEdge(CLASSIFY_TAGS, GRAPH_RETRIEVE)
    // Fan in: both retrieval paths must complete before merge
    .addEdge([RETRIEVE, GRAPH_RETRIEVE], MERGE_CONTEXT)
    // Proceed to assess
    .addEdge(MERGE_CONTEXT, ASSESS)
    // Conditional edge: assess → retry (both paths) OR assess → answer (done)
    .addConditionalEdges(ASSESS, (state) => {
    if (state.isSufficient)
        return ANSWER;
    // On retry, fan out again
    return ["retry_vector", "retry_tags"];
}, {
    ["retry_vector"]: RETRIEVE,
    ["retry_tags"]: CLASSIFY_TAGS,
    [ANSWER]: ANSWER,
})
    // Terminal edge
    .addEdge(ANSWER, langgraph_1.END);
// ─── Compiled Graph (module singleton) ───────────────────────────────────────
//
// Compiling once at module load means the graph is reused across requests
// without re-building the topology on every invocation.
exports.repoMindGraph = workflow.compile();
//# sourceMappingURL=graph.js.map