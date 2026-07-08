import { AgentState } from "../state";
/**
 * Assess node: sends the retrieved chunks + original question to Gemini and
 * asks it to decide whether the context is sufficient.
 *
 * Decision logic:
 *  - YES → mark isSufficient=true, flow proceeds to answer node.
 *  - NO + retryCount < MAX_RETRY_COUNT → generate a refined query, increment
 *    retryCount, isSufficient=false (triggers retrieve retry via graph edge).
 *  - NO + retryCount >= MAX_RETRY_COUNT → force isSufficient=true so we answer
 *    with whatever we have rather than looping forever.
 */
export declare function assessNode(state: AgentState): Promise<Partial<AgentState>>;
//# sourceMappingURL=assess.d.ts.map