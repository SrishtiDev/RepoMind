"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveNode = retrieveNode;
const google_genai_1 = require("@langchain/google-genai");
const js_client_rest_1 = require("@qdrant/js-client-rest");
// ─── Config ───────────────────────────────────────────────────────────────────
const COLLECTION_NAME = "repomind";
const TOP_K = 5; // number of nearest-neighbour chunks to retrieve
// ─── Singletons ───────────────────────────────────────────────────────────────
// Instantiated lazily so the module can be imported without env vars loaded.
function getEmbedder() {
    if (!process.env.GOOGLE_API_KEY) {
        throw new Error("[Retrieve] GOOGLE_API_KEY is not set. Cannot initialise embedder.");
    }
    return new google_genai_1.GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: "gemini-embedding-2", // 3072-dim — must match ingestion dimension
    });
}
function getQdrantClient() {
    return new js_client_rest_1.QdrantClient({
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
async function retrieveNode(state) {
    // Prefer the refined query produced by the assess node on retry passes.
    const queryText = state.refinedQuery?.trim() || state.question.trim();
    if (!queryText) {
        throw new Error("[Retrieve] Cannot embed an empty query. Both question and refinedQuery are blank.");
    }
    const embedder = getEmbedder();
    const qdrant = getQdrantClient();
    // Embed the query into the same vector space used at ingestion time.
    let queryVector;
    try {
        queryVector = await embedder.embedQuery(queryText);
    }
    catch (err) {
        throw new Error(`[Retrieve] Embedding failed for query "${queryText.slice(0, 60)}...": ${err?.message ?? err}`);
    }
    // Search Qdrant for the nearest chunks.
    let searchResults;
    try {
        searchResults = await qdrant.search(COLLECTION_NAME, {
            vector: queryVector,
            limit: TOP_K,
            with_payload: true, // we need filename/filepath/chunkIndex from payload
        });
    }
    catch (err) {
        throw new Error(`[Retrieve] Qdrant search failed (collection="${COLLECTION_NAME}"): ${err?.message ?? err}`);
    }
    // Map raw Qdrant results into typed Chunk objects.
    const retrievedChunks = searchResults
        .filter((r) => r.payload) // guard against missing payloads
        .map((r) => {
        const p = r.payload;
        return {
            content: String(p.content ?? ""),
            filename: String(p.filename ?? "unknown"),
            filepath: String(p.filepath ?? "unknown"),
            chunkIndex: Number(p.chunkIndex ?? 0),
        };
    });
    console.log(`[Retrieve] Query: "${queryText.slice(0, 60)}..." → ${retrievedChunks.length} chunks returned.`);
    return { retrievedChunks };
}
//# sourceMappingURL=retrieve.js.map