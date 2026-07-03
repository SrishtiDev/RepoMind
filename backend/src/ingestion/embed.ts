import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import { CodeChunk } from "./chunker";
import "dotenv/config";

// ─── Config ───────────────────────────────────────────────────────────────────

const COLLECTION_NAME = "repomind";
const VECTOR_SIZE = 768;           // Gemini text-embedding-004 output dimension
const EMBED_BATCH_SIZE = 50;       // chunks per embedding API call

// ─── Clients (module-level singletons) ────────────────────────────────────────

function getEmbeddingModel() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "text-embedding-004",   // 768-dim, optimal for retrieval
  });
}

function getQdrantClient() {
  return new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,  // undefined → no auth (local dev)
  });
}

// ─── Collection Bootstrap ─────────────────────────────────────────────────────

/**
 * Creates the Qdrant collection if it doesn't already exist.
 * Safe to call on every run — it's a no-op if the collection is present.
 */
async function ensureCollection(client: QdrantClient): Promise<void> {
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    console.log(`[Embed] Creating Qdrant collection "${COLLECTION_NAME}"...`);
    await client.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });
    console.log(`[Embed] Collection created.`);
  } else {
    console.log(`[Embed] Collection "${COLLECTION_NAME}" already exists.`);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Splits an array into sub-arrays of at most `size` items. */
function batchArray<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Embeds all chunks using Gemini and upserts them into Qdrant.
 * Processes in batches to avoid rate-limiting.
 *
 * @param chunks - Flat array of CodeChunk objects from the chunker
 */
export async function embedAndStore(chunks: CodeChunk[]): Promise<void> {
  if (chunks.length === 0) {
    console.warn("[Embed] No chunks to embed. Skipping.");
    return;
  }

  const embedder = getEmbeddingModel();
  const qdrant = getQdrantClient();

  await ensureCollection(qdrant);

  const batches = batchArray(chunks, EMBED_BATCH_SIZE);
  console.log(
    `[Embed] Processing ${chunks.length} chunks in ${batches.length} batches...`
  );

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const texts = batch.map((c) => c.content);

    console.log(
      `[Embed] Batch ${batchIdx + 1}/${batches.length} — embedding ${batch.length} chunks...`
    );

    // Generate embeddings via Google Gemini
    const vectors = await embedder.embedDocuments(texts);

    // Build Qdrant upsert points
    const points = batch.map((chunk, i) => ({
      id: uuidv4(),            // unique UUID per chunk
      vector: vectors[i],
      payload: {
        content: chunk.content,
        filename: chunk.metadata.filename,
        filepath: chunk.metadata.filepath,
        chunkIndex: chunk.metadata.chunkIndex,
        repoUrl: chunk.metadata.repoUrl,
      },
    }));

    // Upsert directly via Qdrant REST client (no LangChain wrapper)
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,   // block until indexing is complete for reliability
      points,
    });

    console.log(`[Embed] Batch ${batchIdx + 1} upserted to Qdrant.`);
  }

  console.log(`[Embed] All ${chunks.length} chunks stored successfully.`);
}
