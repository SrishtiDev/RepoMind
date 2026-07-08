/**
 * classifier.ts - Sends a batch of code nodes to the LLM for tagging based on the taxonomy.
 * Batching is a tradeoff: fewer LLM calls means it is significantly cheaper and faster,
 * but it might be slightly less precise per-node than making individual calls.
 * This is an excellent MVP tradeoff.
 */
export interface NodeSummary {
    nodeId: string;
    filepath: string;
    name: string;
    codeSnippet: string;
    imports: string[];
}
export interface TaggedNode {
    nodeId: string;
    tags: string[];
}
export declare function classifyBatch(nodes: NodeSummary[]): Promise<TaggedNode[]>;
//# sourceMappingURL=classifier.d.ts.map