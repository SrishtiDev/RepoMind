import { Worker, Job, ConnectionOptions } from "bullmq";
import { cloneRepo, cleanupRepo } from "../ingestion/clone";
import { chunkRepository } from "../ingestion/chunker";
import { embedAndStore } from "../ingestion/embed";
import { IngestionJobData } from "./producer";
import { FileData } from "../structural/extractor";
import { buildGraph } from "../structural/graphBuilder";
import { saveGraph, loadGraph } from "../structural/graphStore";
import { tagGraph } from "../semantic/batchProcessor";
import { glob } from "glob";
import fs from "fs/promises";
import path from "path";
import Piscina from "piscina";
import "dotenv/config";

// Setup Piscina worker pool for CPU-bound AST parsing
const ext = path.extname(__filename); // .ts in dev, .js in prod
const workerPath = path.join(__dirname, `../structural/parserWorker${ext}`);
const parserPool = new Piscina({
  filename: workerPath,
  maxThreads: 2, // Keep thread count low on free tier
});


// ─── Redis Connection ─────────────────────────────────────────────────────────
const connection: ConnectionOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
};

const QUEUE_NAME = process.env.QUEUE_NAME ?? "ingestion";

// ─── Job Processor ────────────────────────────────────────────────────────────

async function processIngestionJob(job: Job<IngestionJobData>): Promise<void> {
  const { repoUrl } = job.data;
  console.log(`\n[Worker] ▶ Starting ingestion for job ${job.id}: ${repoUrl}`);

  let cloneDir: string | null = null;

  // Outer try/catch/finally:
  //   - catch  → log the error, swallow it so the process stays alive
  //   - finally → always cleanup the cloned directory
  // This means ONE bad job can NEVER crash the shared Express process.
  try {
    // Step 1: Clone
    await job.updateProgress(10);
    cloneDir = await cloneRepo(repoUrl);

    // Step 2: Chunk + Structural Graph (run in parallel)
    await job.updateProgress(30);

    const structuralTask = async () => {
      // Idempotency guard: skip if graph already built for this repo
      const existingGraph = await loadGraph(repoUrl);
      if (existingGraph) {
        console.log(`[Worker] Graph already exists for ${repoUrl} — skipping structural/semantic re-processing.`);
        return;
      }

      try {
        console.log(`[Worker] Starting structural extraction for ${repoUrl}`);
        const files = await glob("**/*.{ts,tsx,js,jsx}", {
          cwd: cloneDir as string,
          ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
          absolute: true,
        });

        const extractedData: FileData[] = [];
        const fileContents = new Map<string, string>();

        // Offload CPU-bound parsing to Piscina worker threads
        // This prevents AST parsing from blocking the main Express event loop
        const parsePromises = files.map(async (filepath) => {
          try {
            const content = await fs.readFile(filepath, "utf-8");
            const relPath = path.relative(cloneDir as string, filepath);
            
            // Execute parse and extract in the worker thread
            const data: FileData | null = await parserPool.run({ filepath, content, relPath });
            
            return { relPath, content, data };
          } catch (e) {
            console.error(`[Worker] Structural extraction failed for ${filepath}`, e);
            return null;
          }
        });

        const results = await Promise.all(parsePromises);

        for (const res of results) {
          if (!res) continue;
          fileContents.set(res.relPath, res.content);
          if (res.data) {
            extractedData.push(res.data);
          }
        }

        if (extractedData.length > 0) {
          const graph = buildGraph(extractedData);
          console.log(`[Worker] Starting semantic tagging for ${repoUrl}`);
          const taggedGraph = await tagGraph(graph, fileContents);
          console.log(
            `[Worker] Structural layer complete. Graph for ${repoUrl}: ` +
            `${taggedGraph.order} nodes, ${taggedGraph.size} edges.`
          );
          await saveGraph(repoUrl, taggedGraph);
        } else {
          console.log(`[Worker] No structural data extracted for ${repoUrl}`);
        }
      } catch (err) {
        console.error(`[Worker] Overall structural analysis failed for ${repoUrl}`, err);
      }
    };

    const [chunks] = await Promise.all([
      chunkRepository(cloneDir, repoUrl),
      structuralTask(),
    ]);

    if (chunks.length === 0) {
      console.warn(`[Worker] No chunks produced for ${repoUrl}. Job done.`);
      return;
    }

    // Step 3: Embed + Store (resilient — skips bad chunks, doesn't throw)
    await job.updateProgress(50);
    await embedAndStore(chunks);

    await job.updateProgress(100);
    console.log(`\n✅ Ingestion complete for ${repoUrl}`);

  } catch (jobErr: any) {
    // Log and swallow — never re-throw so the BullMQ runner / process stays up
    console.error(
      `[Worker] ✖ Job ${job.id} failed (process kept alive):`,
      jobErr?.message ?? jobErr
    );
  } finally {
    // Always clean up the temp clone directory
    if (cloneDir) {
      await cleanupRepo(cloneDir);
    }
  }
}

// ─── Worker Initialisation ────────────────────────────────────────────────────

const worker = new Worker<IngestionJobData>(QUEUE_NAME, processIngestionJob, {
  connection,
  concurrency: 1,   // 1 at a time on free tier to avoid OOM + rate limits
  lockDuration: 120000,
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

// "active" fires the moment the worker dequeues and starts processing a job.
// Seeing this log means the job is NOT stuck — it was queued and is now running.
worker.on("active", (job) => {
  console.log(`[Worker] ▶ Job ${job.id} is now ACTIVE (dequeued from waiting): ${job.data.repoUrl}`);
});

// "stalled" fires when a job was active but its keepalive heartbeat was lost
// (e.g. process crashed mid-job). BullMQ will re-queue it automatically.
worker.on("stalled", (jobId) => {
  console.warn(`[Worker] ⚠ Job ${jobId} stalled — will be re-queued by BullMQ.`);
});

console.log(`[Worker] Listening on queue "${QUEUE_NAME}"...`);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on("SIGTERM", async () => {
  console.log("[Worker] SIGTERM received — closing worker...");
  await worker.close();
  process.exit(0);
});

// ─── Process-level Safety Nets ────────────────────────────────────────────────
// Because the worker runs INSIDE the same process as the Express API (free-tier
// single-process setup), we MUST NOT let any unhandled async error kill Node.
// These handlers log the error and keep the process alive so the API stays up.
process.on("unhandledRejection", (reason: unknown) => {
  console.error(
    "[Worker] 🚨 unhandledRejection — process kept alive:",
    reason instanceof Error ? reason.message : reason
  );
});

process.on("uncaughtException", (err: Error) => {
  console.error(
    "[Worker] 🚨 uncaughtException — process kept alive:",
    err.message,
    err.stack
  );
});
