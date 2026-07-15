import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { retrieveForTenant } from "../../lib/retrieval";
import { AgentState, Chunk } from "../state";

// ─── Config ───────────────────────────────────────────────────────────────────

const COLLECTION_NAME = "repomind";
const TOP_K = 5; // number of nearest-neighbour chunks to retrieve

// ─── Singletons ───────────────────────────────────────────────────────────────

// Instantiated lazily so the module can be imported without env vars loaded.
function getEmbedder(): GoogleGenerativeAIEmbeddings {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error(
      "[Retrieve] GOOGLE_API_KEY is not set. Cannot initialise embedder."
    );
  }
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-embedding-2", // 3072-dim — must match ingestion dimension
  });
}


// ─── Node ─────────────────────────────────────────────────────────────────────

/**
 * Retrieval node: embeds the active query and performs a vector similarity
 * search against the Qdrant "repomind" collection.
 *
 * Uses `refinedQuery` when the assess node has suggested a better query,
 * otherwise falls back to the original `question`.
 */
export async function retrieveNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  // Prefer the refined query produced by the assess node on retry passes.
  const queryText = state.refinedQuery?.trim() || state.question.trim();
  const repoUrl = state.repoUrl?.trim();

  if (!queryText) {
    throw new Error(
      "[Retrieve] Cannot embed an empty query. Both question and refinedQuery are blank."
    );
  }

  if (!repoUrl) {
    throw new Error(
      "[Retrieve] No repoUrl in state — cannot scope search to a specific repository."
    );
  }

  const embedder = getEmbedder();

  // Embed the query into the same vector space used at ingestion time.
  let queryVector: number[];
  try {
    queryVector = await embedder.embedQuery(queryText);
  } catch (err: any) {
    throw new Error(
      `[Retrieve] Embedding failed for query "${queryText.slice(0, 60)}...": ${err?.message ?? err}`
    );
  }

  // Search Qdrant for the nearest chunks — SCOPED to the target repo.
  // Using Qdrant's payload filter prevents chunks from other repos from
  // leaking into results, which would cause the LLM to hallucinate answers
  // about the wrong codebase.
  let searchResults: any;
  try {
    searchResults = await retrieveForTenant({
      repoUrl,
      queryVector,
      topK: TOP_K,
    });
  } catch (err: any) {
    throw new Error(
      `[Retrieve] Qdrant search failed (collection="${COLLECTION_NAME}"): ${err?.message ?? err}`
    );
  }

  // Safety: if zero chunks match this repo, the repo hasn't finished indexing.
  // Do NOT fall through with empty results — the LLM would either refuse or
  // hallucinate from stale context. Return a sentinel answer instead.
  if (searchResults.length === 0) {
    console.warn(
      `[Retrieve] Zero chunks found for repoUrl="${repoUrl}". Repo likely not indexed yet.`
    );
    // Return special state that answer node will recognise
    return {
      retrievedChunks: [],
      isSufficient: true,      // skip assess/retry loop — we have nothing to search
      answer: "This repository hasn't been indexed yet (or indexing is still in progress). Please wait a moment and try again.",
      sources: [],
    };
  }

  // Map raw Qdrant results into typed Chunk objects.
  const retrievedChunks: Chunk[] = searchResults
    .filter((r) => r.payload) // guard against missing payloads
    .map((r) => {
      const p = r.payload as Record<string, unknown>;
      return {
        content: String(p.content ?? ""),
        filename: String(p.filename ?? "unknown"),
        filepath: String(p.filepath ?? "unknown"),
        chunkIndex: Number(p.chunkIndex ?? 0),
      };
    });

  console.log(
    `[Retrieve] Query: "${queryText.slice(0, 60)}..." → ${retrievedChunks.length} chunks returned (repo-scoped: ${repoUrl}).`
  );

  return { retrievedChunks };
}
