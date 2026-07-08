"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const graph_1 = require("../agent/graph");
const router = (0, express_1.Router)();
/**
 * POST /query
 * Body: { question: string }
 *
 * Runs the RepoMind retrieval-assess-answer agent graph and returns the
 * synthesised answer with source attribution.
 *
 * Response:
 *  200 { answer: string, sources: Array<{ filename, filepath, chunkIndex }> }
 *  400 if question is missing or empty
 *  500 on any graph/LLM/Qdrant failure
 */
router.post("/", async (req, res) => {
    const { question } = req.body;
    // ── Validation ──────────────────────────────────────────────────────────────
    if (!question || typeof question !== "string" || !question.trim()) {
        res.status(400).json({
            success: false,
            error: "Missing or invalid field: question (non-empty string required)",
        });
        return;
    }
    // ── Graph Invocation ────────────────────────────────────────────────────────
    try {
        const initialState = {
            question: question.trim(),
            retrievedChunks: [],
            isSufficient: false,
            retryCount: 0,
        };
        const finalState = await graph_1.repoMindGraph.invoke(initialState);
        res.status(200).json({
            success: true,
            answer: finalState.answer ?? "No answer was generated.",
            sources: finalState.sources ?? [],
        });
    }
    catch (err) {
        // Surface the specific failure reason — helps with debugging without
        // leaking internal stack traces to clients.
        const reason = err?.message ?? "Unknown error";
        console.error("[Route /query] Agent graph failed:", reason);
        res.status(500).json({
            success: false,
            error: `Query processing failed: ${reason}`,
        });
    }
});
exports.default = router;
//# sourceMappingURL=query.js.map