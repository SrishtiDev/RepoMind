import { QdrantClient } from "@qdrant/js-client-rest";

// ─── Config ───────────────────────────────────────────────────────────────────
const COLLECTION_NAME = "repomind";

// Singleton client to avoid reconnect overhead
let clientInstance: QdrantClient | null = null;
function getQdrantClient(): QdrantClient {
  if (!clientInstance) {
    clientInstance = new QdrantClient({
      url: process.env.QDRANT_URL ?? "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY,
    });
  }
  return clientInstance;
}

export interface RetrievalParams {
  repoUrl: string; // Required, no default.
  queryVector: number[];
  topK: number;
}

/**
 * Single retrieval choke-point for vector searches.
 * Enforces mandatory data-isolation by applying the repoUrl filter
 * at the Qdrant query level.
 * 
 * NOTE: DO NOT import or use QdrantClient's search/scroll methods outside of this module
 * for the vector collection.
 */
export async function retrieveForTenant({
  repoUrl,
  queryVector,
  topK,
}: RetrievalParams) {
  const qdrant = getQdrantClient();

  // Search Qdrant for the nearest chunks — SCOPED to the target repo.
  // Using Qdrant's payload filter prevents chunks from other repos from
  // leaking into results.
  return qdrant.search(COLLECTION_NAME, {
    vector: queryVector,
    limit: topK,
    with_payload: true,
    filter: {
      must: [
        {
          key: "repoUrl",
          match: { value: repoUrl },
        },
      ],
    },
  });
}
