import { Router, Request, Response } from "express";
import { repoMindGraph } from "../agent/graph";
import { AgentState } from "../agent/state";

const router = Router();

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
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { question, repoUrl } = req.body as { question?: string; repoUrl?: string };

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!question || typeof question !== "string" || !question.trim()) {
    res.status(400).json({
      success: false,
      error: "Missing or invalid field: question (non-empty string required)",
    });
    return;
  }

  if (!repoUrl || typeof repoUrl !== "string" || !repoUrl.trim()) {
    res.status(400).json({
      success: false,
      error: "Missing or invalid field: repoUrl (required to scope search to a specific repository)",
    });
    return;
  }

  // ── Graph Invocation ────────────────────────────────────────────────────────
  try {
    const initialState: AgentState = {
      question: question.trim(),
      repoUrl: repoUrl.trim(),
      retrievedChunks: [],
      isSufficient: false,
      retryCount: 0,
    };

    const finalState = await repoMindGraph.invoke(initialState);

    res.status(200).json({
      success: true,
      answer: finalState.answer ?? "No answer was generated.",
      sources: finalState.sources ?? [],
    });
  } catch (err: any) {
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

export default router;
