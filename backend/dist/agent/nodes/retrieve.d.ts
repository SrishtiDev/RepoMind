import { AgentState } from "../state";
/**
 * Retrieval node: embeds the active query and performs a vector similarity
 * search against the Qdrant "repomind" collection.
 *
 * Uses `refinedQuery` when the assess node has suggested a better query,
 * otherwise falls back to the original `question`.
 */
export declare function retrieveNode(state: AgentState): Promise<Partial<AgentState>>;
//# sourceMappingURL=retrieve.d.ts.map