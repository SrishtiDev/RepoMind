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
 */
export async function addIngestionJob(data: IngestionJobData): Promise<string> {
  const queue = getQueue();
  const job = await queue.add("ingest-repo", data, {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: 100,  // keep last 100 completed jobs
    removeOnFail: 50,
  });

  console.log(`[Producer] Job ${job.id} added for repo: ${data.repoUrl}`);
  return job.id!;
}
