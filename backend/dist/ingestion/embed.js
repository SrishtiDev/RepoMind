"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.embedAndStore = embedAndStore;
const google_genai_1 = require("@langchain/google-genai");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const uuid_1 = require("uuid");
require("dotenv/config");
// ─── Config ───────────────────────────────────────────────────────────────────
const COLLECTION_NAME = "repomind";
const VECTOR_SIZE = 768; // Gemini text-embedding-004 output dimension
const EMBED_BATCH_SIZE = 50; // chunks per embedding API call
// ─── Clients (module-level singletons) ────────────────────────────────────────
function getEmbeddingModel() {
    return new google_genai_1.GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: "text-embedding-004", // 768-dim
    });
}
function getQdrantClient() {
    return new js_client_rest_1.QdrantClient({
        url: process.env.QDRANT_URL ?? "http://localhost:6333",
        apiKey: process.env.QDRANT_API_KEY, // undefined → no auth (local dev)
    });
}
// ─── Collection Bootstrap ─────────────────────────────────────────────────────
/**
 * Creates the Qdrant collection if it doesn't already exist.
 * Safe to call on every run — it's a no-op if the collection is present.
 */
async function ensureCollection(client) {
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
    }
    else {
        console.log(`[Embed] Collection "${COLLECTION_NAME}" already exists.`);
    }
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Splits an array into sub-arrays of at most `size` items. */
function batchArray(arr, size) {
    const batches = [];
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
async function embedAndStore(chunks) {
    if (chunks.length === 0) {
        console.warn("[Embed] No chunks to embed. Skipping.");
        return;
    }
    const embedder = getEmbeddingModel();
    const qdrant = getQdrantClient();
    await ensureCollection(qdrant);
    const batches = batchArray(chunks, EMBED_BATCH_SIZE);
    console.log(`[Embed] Processing ${chunks.length} chunks in ${batches.length} batches...`);
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];
        const texts = batch.map((c) => c.content);
        console.log(`[Embed] Batch ${batchIdx + 1}/${batches.length} — embedding ${batch.length} chunks...`);
        // Generate embeddings via Google Gemini
        const vectors = await embedder.embedDocuments(texts);
        // Guard: ensure no empty embeddings
        for (let i = 0; i < vectors.length; i++) {
            if (!vectors[i] || vectors[i].length === 0) {
                throw new Error(`Embedding generation returned empty vector for chunk ${batch[i].metadata.chunkIndex} — check API key/model configuration`);
            }
        }
        // Build Qdrant upsert points
        const points = batch.map((chunk, i) => ({
            id: (0, uuid_1.v4)(), // unique UUID per chunk
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
        try {
            await qdrant.upsert(COLLECTION_NAME, {
                wait: true, // block until indexing is complete for reliability
                points,
            });
        }
        catch (err) {
            console.error("[Embed] Qdrant upsert error:", err?.data || err);
            throw err;
        }
        console.log(`[Embed] Batch ${batchIdx + 1} upserted to Qdrant.`);
    }
    console.log(`[Embed] All ${chunks.length} chunks stored successfully.`);
}
//# sourceMappingURL=embed.js.map