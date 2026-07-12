import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import Redis from "ioredis";
import pLimit from "p-limit";
import { CodeChunk } from "./chunker";
import { geminiRateLimiter } from "../lib/rateLimiter";
import "dotenv/config";

// ─── Config ───────────────────────────────────────────────────────────────────

const COLLECTION_NAME = "repomind";
const VECTOR_SIZE = 3072;          // Gemini gemini-embedding-2 output dimension
const EMBED_BATCH_SIZE = 10;       // Reduced from 50 → smaller batches = fewer 429s
const INTER_BATCH_DELAY_MS = 2000; // 2s pause between batches to stay under RPM
const FAILED_CHUNKS_KEY = "repomind:failed-embeddings";

// ─── Clients (module-level singletons) ────────────────────────────────────────

function getEmbeddingModel() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY!,
    model: "gemini-embedding-2",   // 3072-dim
  });
}

function getQdrantClient() {
  return new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,  // undefined → no auth (local dev)
  });
}

function getRedisClient() {
  return new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
  });
}

// ─── Collection Bootstrap ─────────────────────────────────────────────────────

async function ensureCollection(client: QdrantClient): Promise<void> {
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === COLLECTION_NAME);

  if (!exists) {
    console.log(`[Embed] Creating Qdrant collection "${COLLECTION_NAME}"...`);
    await client.createCollection(COLLECTION_NAME, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
    console.log(`[Embed] Collection created.`);
  }

  // Ensure a keyword payload index on "repoUrl" exists so Qdrant can
  // efficiently execute filtered searches (filter: must[repoUrl == X]).
  // Without this index Qdrant returns "Bad Request" on filtered queries.
  // createPayloadIndex is idempotent — safe to call on every ingestion run.
  try {
    await client.createPayloadIndex(COLLECTION_NAME, {
      field_name: "repoUrl",
      field_schema: "keyword",
      wait: true,
    });
    console.log(`[Embed] Payload index on "repoUrl" ensured.`);
  } catch (indexErr: any) {
    // Qdrant may return a conflict/400 if the index already exists —
    // treat that as a no-op; log only unexpected errors.
    const alreadyExists =
      indexErr?.data?.status?.error?.toLowerCase().includes("already exists") ||
      indexErr?.message?.toLowerCase().includes("already exists");
    if (!alreadyExists) {
      console.warn(
        `[Embed] Could not ensure repoUrl payload index:`,
        indexErr?.data ?? indexErr?.message
      );
    } else {
      console.log(`[Embed] repoUrl payload index already exists — no-op.`);
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function batchArray<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Embeds a single chunk's text with exponential backoff on 429 / rate-limit errors.
 * Returns the vector on success, or null if all retries are exhausted.
 */
async function embedWithRetry(
  embedder: GoogleGenerativeAIEmbeddings,
  text: string,
  chunkId: string | number
): Promise<number[] | null> {
  const delays = [10_000, 30_000, 60_000]; // 10s, 30s, 60s

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const vectors = await geminiRateLimiter.schedule(() =>
        embedder.embedDocuments([text])
      );

      const vector = vectors[0];
      if (!vector || vector.length === 0) {
        throw new Error("Empty vector returned by API");
      }
      return vector;
    } catch (err: any) {
      const is429 =
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.toLowerCase().includes("rate") ||
        err?.message?.toLowerCase().includes("quota");

      const isLastAttempt = attempt === delays.length;

      if (isLastAttempt) {
        console.warn(
          `[Embed] ⚠ Chunk ${chunkId}: all ${delays.length + 1} attempts failed. ` +
          `Last error: ${err?.message ?? err}. Skipping this chunk.`
        );
        return null;
      }

      if (is429) {
        const waitMs = delays[attempt];
        console.warn(
          `[Embed] 429/quota error on chunk ${chunkId} (attempt ${attempt + 1}). ` +
          `Retrying after ${waitMs / 1000}s...`
        );
        await sleep(waitMs);
      } else {
        // Non-rate-limit error: still retry but log differently
        console.warn(
          `[Embed] Non-rate-limit error on chunk ${chunkId} (attempt ${attempt + 1}): ` +
          `${err?.message ?? err}. Retrying after ${delays[attempt] / 1000}s...`
        );
        await sleep(delays[attempt]);
      }
    }
  }
  return null; // TypeScript safety — never reached
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Embeds all chunks using Gemini and upserts them into Qdrant.
 * - Per-chunk exponential backoff on 429s (10s → 30s → 60s).
 * - Failed chunks are SKIPPED (not thrown), so one bad chunk never kills the job.
 * - Skipped chunk IDs are pushed to Redis key `repomind:failed-embeddings` for later retry.
 * - 2s inter-batch pause to reduce sustained rate-limit pressure.
 */
export async function embedAndStore(chunks: CodeChunk[]): Promise<void> {
  if (chunks.length === 0) {
    console.warn("[Embed] No chunks to embed. Skipping.");
    return;
  }

  const embedder = getEmbeddingModel();
  const qdrant = getQdrantClient();
  const redis = getRedisClient();

  try {
    await redis.connect();
  } catch {
    console.warn("[Embed] Redis not reachable — failed chunks won't be tracked in Redis.");
  }

  await ensureCollection(qdrant);

  const limit = pLimit(3); // Cap at 3 concurrent API calls
  console.log(`[Embed] Processing ${chunks.length} chunks with concurrency limit of 3...`);

  let totalUpserted = 0;
  let totalSkipped = 0;
  const skippedChunkIds: string[] = [];

  // Process all chunks concurrently up to the limit
  const embedPromises = chunks.map((chunk) => 
    limit(async () => {
      const chunkLabel = `${chunk.metadata.filepath}#${chunk.metadata.chunkIndex}`;
      const vector = await embedWithRetry(embedder, chunk.content, chunkLabel);

      if (vector === null) {
        totalSkipped++;
        skippedChunkIds.push(chunkLabel);
        try {
          await redis.lpush(
            FAILED_CHUNKS_KEY,
            JSON.stringify({
              repoUrl: chunk.metadata.repoUrl,
              filepath: chunk.metadata.filepath,
              chunkIndex: chunk.metadata.chunkIndex,
              failedAt: new Date().toISOString(),
            })
          );
        } catch (redisErr) {
          console.warn("[Embed] Could not push failed chunk to Redis:", redisErr);
        }
        return null;
      }

      return {
        id: uuidv4(),
        vector,
        payload: {
          content: chunk.content,
          filename: chunk.metadata.filename,
          filepath: chunk.metadata.filepath,
          chunkIndex: chunk.metadata.chunkIndex,
          repoUrl: chunk.metadata.repoUrl,
        },
      };
    })
  );

  const results = await Promise.all(embedPromises);
  const points = results.filter((p): p is NonNullable<typeof p> => p !== null);

  if (points.length > 0) {
    // Upsert to Qdrant in batches of 50 to avoid payload size issues
    const qdrantBatches = batchArray(points, 50);
    for (let i = 0; i < qdrantBatches.length; i++) {
      try {
        await qdrant.upsert(COLLECTION_NAME, { wait: true, points: qdrantBatches[i] });
        totalUpserted += qdrantBatches[i].length;
      } catch (err: any) {
        console.error(
          `[Embed] ⚠ Qdrant upsert failed for batch ${i + 1}:`,
          err?.data ?? err?.message ?? err
        );
      }
    }
  }

  try {
    await redis.quit();
  } catch { /* ignore */ }

  console.log(
    `[Embed] Done. ✅ Upserted: ${totalUpserted} | ⚠ Skipped: ${totalSkipped}` +
    (skippedChunkIds.length > 0 ? ` | Skipped IDs tracked in Redis key "${FAILED_CHUNKS_KEY}"` : "")
  );
}
