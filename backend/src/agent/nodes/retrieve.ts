import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantClient } from "@qdrant/js-client-rest";
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

function getQdrantClient(): QdrantClient {
  return new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY, // undefined → no auth (local dev)
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

  if (!queryText) {
    throw new Error(
      "[Retrieve] Cannot embed an empty query. Both question and refinedQuery are blank."
    );
  }

  const embedder = getEmbedder();
  const qdrant = getQdrantClient();

  // Embed the query into the same vector space used at ingestion time.
  let queryVector: number[];
  try {
    queryVector = await embedder.embedQuery(queryText);
  } catch (err: any) {
    throw new Error(
      `[Retrieve] Embedding failed for query "${queryText.slice(0, 60)}...": ${err?.message ?? err}`
    );
  }

  // Search Qdrant for the nearest chunks.
  let searchResults: Awaited<ReturnType<typeof qdrant.search>>;
  try {
    searchResults = await qdrant.search(COLLECTION_NAME, {
      vector: queryVector,
      limit: TOP_K,
      with_payload: true, // we need filename/filepath/chunkIndex from payload
    });
  } catch (err: any) {
    throw new Error(
      `[Retrieve] Qdrant search failed (collection="${COLLECTION_NAME}"): ${err?.message ?? err}`
    );
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
    `[Retrieve] Query: "${queryText.slice(0, 60)}..." → ${retrievedChunks.length} chunks returned.`
  );

  return { retrievedChunks };
}
