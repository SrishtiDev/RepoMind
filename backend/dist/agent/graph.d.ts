import { GraphContextNode } from "./nodes/graphRetrieve";
import { MergedContext } from "./nodes/mergeContext";
import { AgentState, Chunk, Source } from "./state";
export declare const repoMindGraph: import("@langchain/langgraph").CompiledStateGraph<{
    question: string;
    repoUrl: string | undefined;
    refinedQuery: string | undefined;
    retrievedChunks: Chunk[];
    matchedTags: string[] | undefined;
    graphContext: GraphContextNode[] | undefined;
    mergedContext: MergedContext[] | undefined;
    isSufficient: boolean;
    retryCount: number;
    answer: string | undefined;
    sources: Source[] | undefined;
}, {
    question?: string | import("@langchain/langgraph").OverwriteValue<string> | undefined;
    repoUrl?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
    refinedQuery?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
    retrievedChunks?: Chunk[] | import("@langchain/langgraph").OverwriteValue<Chunk[]> | undefined;
    matchedTags?: string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined;
    graphContext?: GraphContextNode[] | import("@langchain/langgraph").OverwriteValue<GraphContextNode[] | undefined> | undefined;
    mergedContext?: MergedContext[] | import("@langchain/langgraph").OverwriteValue<MergedContext[] | undefined> | undefined;
    isSufficient?: boolean | import("@langchain/langgraph").OverwriteValue<boolean> | undefined;
    retryCount?: number | import("@langchain/langgraph").OverwriteValue<number> | undefined;
    answer?: string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined;
    sources?: Source[] | import("@langchain/langgraph").OverwriteValue<Source[] | undefined> | undefined;
}, "retrieve" | "classify_tags" | "graph_retrieve" | "merge_context" | "assess" | "generate_answer" | "__start__", {
    question: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    repoUrl: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    refinedQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    retrievedChunks: import("@langchain/langgraph").BaseChannel<Chunk[], Chunk[] | import("@langchain/langgraph").OverwriteValue<Chunk[]>, unknown>;
    matchedTags: import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
    graphContext: import("@langchain/langgraph").BaseChannel<GraphContextNode[] | undefined, GraphContextNode[] | import("@langchain/langgraph").OverwriteValue<GraphContextNode[] | undefined> | undefined, unknown>;
    mergedContext: import("@langchain/langgraph").BaseChannel<MergedContext[] | undefined, MergedContext[] | import("@langchain/langgraph").OverwriteValue<MergedContext[] | undefined> | undefined, unknown>;
    isSufficient: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    retryCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    answer: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    sources: import("@langchain/langgraph").BaseChannel<Source[] | undefined, Source[] | import("@langchain/langgraph").OverwriteValue<Source[] | undefined> | undefined, unknown>;
}, {
    question: import("@langchain/langgraph").BaseChannel<string, string | import("@langchain/langgraph").OverwriteValue<string>, unknown>;
    repoUrl: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    refinedQuery: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    retrievedChunks: import("@langchain/langgraph").BaseChannel<Chunk[], Chunk[] | import("@langchain/langgraph").OverwriteValue<Chunk[]>, unknown>;
    matchedTags: import("@langchain/langgraph").BaseChannel<string[] | undefined, string[] | import("@langchain/langgraph").OverwriteValue<string[] | undefined> | undefined, unknown>;
    graphContext: import("@langchain/langgraph").BaseChannel<GraphContextNode[] | undefined, GraphContextNode[] | import("@langchain/langgraph").OverwriteValue<GraphContextNode[] | undefined> | undefined, unknown>;
    mergedContext: import("@langchain/langgraph").BaseChannel<MergedContext[] | undefined, MergedContext[] | import("@langchain/langgraph").OverwriteValue<MergedContext[] | undefined> | undefined, unknown>;
    isSufficient: import("@langchain/langgraph").BaseChannel<boolean, boolean | import("@langchain/langgraph").OverwriteValue<boolean>, unknown>;
    retryCount: import("@langchain/langgraph").BaseChannel<number, number | import("@langchain/langgraph").OverwriteValue<number>, unknown>;
    answer: import("@langchain/langgraph").BaseChannel<string | undefined, string | import("@langchain/langgraph").OverwriteValue<string | undefined> | undefined, unknown>;
    sources: import("@langchain/langgraph").BaseChannel<Source[] | undefined, Source[] | import("@langchain/langgraph").OverwriteValue<Source[] | undefined> | undefined, unknown>;
}, import("@langchain/langgraph").StateDefinition, {
    retrieve: Partial<AgentState>;
    classify_tags: {
        matchedTags: string[];
    };
    graph_retrieve: {
        graphContext: GraphContextNode[];
    };
    merge_context: {
        mergedContext: MergedContext[];
        retrievedChunks: MergedContext[];
    };
    assess: Partial<AgentState>;
    generate_answer: Partial<AgentState>;
}, unknown, unknown, []>;
//# sourceMappingURL=graph.d.ts.map