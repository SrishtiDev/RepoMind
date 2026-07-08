import { AgentState } from "../state";
/**
 * Answer node: synthesises a grounded response from the final retrieved chunks.
 *
 * Key constraints enforced via the system prompt:
 *  1. Answer ONLY from the provided context — no external knowledge.
 *  2. Inline citations in the form [filename:chunkIndex] must be included.
 *  3. If the context is empty or irrelevant, return the standard fallback
 *     message rather than hallucinating an answer.
 */
export declare function answerNode(state: AgentState): Promise<Partial<AgentState>>;
//# sourceMappingURL=answer.d.ts.map