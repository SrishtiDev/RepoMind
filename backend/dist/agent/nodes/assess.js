"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assessNode = assessNode;
const groq_1 = require("@langchain/groq");
const messages_1 = require("@langchain/core/messages");
const state_1 = require("../state");
// ─── LLM Factory ─────────────────────────────────────────────────────────────
function getLLM() {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("[Assess] GROQ_API_KEY is not set. Cannot initialise Groq.");
    }
    return new groq_1.ChatGroq({
        apiKey: process.env.GROQ_API_KEY,
        model: "openai/gpt-oss-20b",
        temperature: 0, // deterministic YES/NO judgement
        maxRetries: 0, // Custom retry logic handles this
    });
}
// ─── Helper ───────────────────────────────────────────────────────────────────
async function invokeWithRetry(llm, messages, nodeName) {
    try {
        return await llm.invoke(messages);
    }
    catch (err) {
        if (err?.status === 429 || err?.message?.includes("429")) {
            console.warn(`[${nodeName}] Groq 429 Rate Limit hit. Retrying in 2 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            return await llm.invoke(messages);
        }
        throw err;
    }
}
// ─── Node ─────────────────────────────────────────────────────────────────────
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
async function assessNode(state) {
    const llm = getLLM();
    // Build a compact context string from the retrieved chunks.
    const contextText = state.retrievedChunks
        .map((c, i) => `[${i + 1}] File: ${c.filename} (chunk ${c.chunkIndex})\n${c.content}`)
        .join("\n\n---\n\n");
    // ── Sufficiency check ──────────────────────────────────────────────────────
    const sufficiencyPrompt = `You are evaluating whether a set of code snippets contains enough information to answer a developer's question.

Question: ${state.question}

Retrieved Context:
${contextText}

Reply with exactly one of:
  YES: <one-line reason>
  NO: <one-line reason>

Do not add anything else.`;
    let judgement;
    try {
        const response = await invokeWithRetry(llm, [
            new messages_1.SystemMessage("You are a strict technical relevance judge. Be concise."),
            new messages_1.HumanMessage(sufficiencyPrompt),
        ], "Assess");
        judgement = String(response.content).trim().toUpperCase();
    }
    catch (err) {
        throw new Error(`[Assess] Groq sufficiency check failed: ${err?.message ?? err}`);
    }
    const isSufficient = judgement.startsWith("YES");
    console.log(`[Assess] Sufficiency verdict (retry ${state.retryCount}/${state_1.MAX_RETRY_COUNT}): ${judgement.slice(0, 80)}`);
    // ── YES path ───────────────────────────────────────────────────────────────
    if (isSufficient) {
        return { isSufficient: true };
    }
    // ── NO path — retry limit reached, force answer with current context ───────
    if (state.retryCount >= state_1.MAX_RETRY_COUNT) {
        console.warn(`[Assess] Retry cap (${state_1.MAX_RETRY_COUNT}) reached. Forcing answer with available context.`);
        return { isSufficient: true }; // break the loop; answer node will caveat
    }
    // ── NO path — generate a refined query for the next retrieval pass ─────────
    const refinePrompt = `The retrieved context was insufficient to answer this question:

Question: ${state.question}

Suggest a single, improved search query (no more than 15 words) that is more likely to retrieve the relevant code. Reply with only the query text.`;
    let refinedQuery;
    try {
        const refineResponse = await invokeWithRetry(llm, [
            new messages_1.HumanMessage(refinePrompt),
        ], "Assess");
        refinedQuery = String(refineResponse.content).trim();
    }
    catch (err) {
        throw new Error(`[Assess] Groq query refinement failed: ${err?.message ?? err}`);
    }
    console.log(`[Assess] Refined query for retry ${state.retryCount + 1}: "${refinedQuery}"`);
    return {
        isSufficient: false,
        refinedQuery,
        retryCount: state.retryCount + 1,
    };
}
//# sourceMappingURL=assess.js.map