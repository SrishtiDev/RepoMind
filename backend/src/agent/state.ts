// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum number of retrieval retries before forcing an answer with what we have. */
export const MAX_RETRY_COUNT = 2;

// ─── Domain Types ─────────────────────────────────────────────────────────────

/** A retrieved code chunk with its source provenance. */
export interface Chunk {
  content: string;
  filename: string;
  filepath: string;
  chunkIndex: number;
}

/** Source reference included in the final answer for attribution. */
export interface Source {
  filename: string;
  filepath: string;
  chunkIndex: number;
}

// ─── Graph State ──────────────────────────────────────────────────────────────

/**
 * The shared state object passed between every node in the LangGraph.
 *
 * Lifecycle:
 *  1. `question` is set once by the caller and never mutated.
 *  2. `refinedQuery` is optionally set by assess.ts when the LLM suggests a
 *     better search query — retrieve.ts prefers this over `question`.
 *  3. `retrievedChunks` is overwritten on every retrieve pass.
 *  4. `isSufficient` gates the conditional edge in graph.ts.
 *  5. `retryCount` is incremented by assess.ts; capped at MAX_RETRY_COUNT.
 *  6. `answer` and `sources` are populated by answer.ts at the terminal node.
 */
export interface AgentState {
  question: string;
  refinedQuery?: string;
  retrievedChunks: Chunk[];
  isSufficient: boolean;
  retryCount: number;
  answer?: string;
  sources?: Source[];
}
