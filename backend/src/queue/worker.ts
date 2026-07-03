import { Worker, Job, ConnectionOptions } from "bullmq";
import { cloneRepo, cleanupRepo } from "../ingestion/clone";
import { chunkRepository } from "../ingestion/chunker";
import { embedAndStore } from "../ingestion/embed";
import { IngestionJobData } from "./producer";
import "dotenv/config";

// ─── Redis Connection ─────────────────────────────────────────────────────────
// Pass a plain options object — BullMQ bundles its own ioredis internally.
const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

const QUEUE_NAME = process.env.QUEUE_NAME ?? "ingestion";

// ─── Job Processor ────────────────────────────────────────────────────────────

/**
 * Core ingestion pipeline:
 *   1. Clone the GitHub repo into a temp directory
 *   2. Chunk all supported source files
 *   3. Embed chunks with Gemini and store in Qdrant
 *   4. Clean up the temp directory
 */
async function processIngestionJob(job: Job<IngestionJobData>): Promise<void> {
  const { repoUrl } = job.data;
  console.log(`\n[Worker] ▶ Starting ingestion for job ${job.id}: ${repoUrl}`);

  let cloneDir: string | null = null;

  try {
    // Step 1: Clone
    await job.updateProgress(10);
    cloneDir = await cloneRepo(repoUrl);

    // Step 2: Chunk
    await job.updateProgress(30);
    const chunks = await chunkRepository(cloneDir, repoUrl);

    if (chunks.length === 0) {
      console.warn(`[Worker] No chunks produced for ${repoUrl}. Job done.`);
      return;
    }

    // Step 3: Embed + Store
    await job.updateProgress(50);
    await embedAndStore(chunks);

    await job.updateProgress(100);
    console.log(`\n✅ Ingestion complete for ${repoUrl}`);
  } finally {
    // Step 4: Cleanup (always runs, even on error)
    if (cloneDir) {
      await cleanupRepo(cloneDir);
    }
  }
}

// ─── Worker Initialisation ────────────────────────────────────────────────────

const worker = new Worker<IngestionJobData>(QUEUE_NAME, processIngestionJob, {
  connection,
  concurrency: 2,   // process up to 2 repos in parallel
});

// ─── Lifecycle Hooks ─────────────────────────────────────────────────────────

worker.on("completed", (job) => {
  console.log(`[Worker] ✔ Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] ✖ Job ${job?.id} failed:`, err.message);
});

worker.on("progress", (job, progress) => {
  console.log(`[Worker] ⏳ Job ${job.id} progress: ${progress}%`);
});

console.log(`[Worker] Listening on queue "${QUEUE_NAME}"...`);

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("[Worker] SIGTERM received — closing worker...");
  await worker.close();
  process.exit(0);
});
