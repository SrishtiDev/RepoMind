import { Queue, ConnectionOptions } from "bullmq";
import "dotenv/config";

// ─── Shared Redis Connection ───────────────────────────────────────────────────
// Pass a plain options object — BullMQ bundles its own ioredis internally,
// so passing an external ioredis instance causes a type conflict.
const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

const QUEUE_NAME = process.env.QUEUE_NAME ?? "ingestion";

// Lazily-initialised singleton queue instance
let ingestionQueue: Queue | null = null;

function getQueue(): Queue {
  if (!ingestionQueue) {
    ingestionQueue = new Queue(QUEUE_NAME, { connection });
  }
  return ingestionQueue;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface IngestionJobData {
  repoUrl: string;
}

/**
 * Adds an ingestion job to the BullMQ queue.
 * The worker will pick it up and run clone → chunk → embed.
 *
 * NOTE: attempts is intentionally set to 1 (no automatic retry).
 * BullMQ retries currently re-run the ENTIRE pipeline (re-clone, re-parse,
 * re-tag, re-embed) rather than resuming from the failure point. On the
 * Gemini free tier (5 RPM), a failed rate-limited run followed immediately by
 * a full retry doubles the API usage and guarantees another 429. The worker
 * instead implements idempotency at each stage so individual steps can be
 * re-triggered safely via a fresh /ingest call.
 */
export async function addIngestionJob(data: IngestionJobData): Promise<string> {
  const queue = getQueue();
  const job = await queue.add("ingest-repo", data, {
    attempts: 1,              // No automatic retry — see comment above
    removeOnComplete: 100,    // Keep last 100 completed jobs
    removeOnFail: 50,
  });

  // Log queue depth so production logs make it clear when a job is waiting
  // behind an active one rather than silently doing nothing.
  try {
    const [active, waiting] = await Promise.all([
      queue.getActiveCount(),
      queue.getWaitingCount(),
    ]);
    console.log(
      `[Producer] Job ${job.id} added for repo: ${data.repoUrl} | ` +
      `Queue state: ${active} active, ${waiting} waiting.` +
      (active > 0 ? " (Job will start after current active job completes.)" : "")
    );
  } catch {
    console.log(`[Producer] Job ${job.id} added for repo: ${data.repoUrl}`);
  }

  return job.id!;
}
