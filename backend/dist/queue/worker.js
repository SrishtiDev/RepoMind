"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const clone_1 = require("../ingestion/clone");
const chunker_1 = require("../ingestion/chunker");
const embed_1 = require("../ingestion/embed");
const parser_1 = require("../structural/parser");
const extractor_1 = require("../structural/extractor");
const graphBuilder_1 = require("../structural/graphBuilder");
const graphStore_1 = require("../structural/graphStore");
const batchProcessor_1 = require("../semantic/batchProcessor");
const glob_1 = require("glob");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
require("dotenv/config");
// ─── Redis Connection ─────────────────────────────────────────────────────────
// Pass a plain options object — BullMQ bundles its own ioredis internally.
const connection = {
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
async function processIngestionJob(job) {
    const { repoUrl } = job.data;
    console.log(`\n[Worker] ▶ Starting ingestion for job ${job.id}: ${repoUrl}`);
    let cloneDir = null;
    try {
        // Step 1: Clone
        await job.updateProgress(10);
        cloneDir = await (0, clone_1.cloneRepo)(repoUrl);
        // Step 2: Chunk (and parallel Structural Graph)
        await job.updateProgress(30);
        const structuralTask = async () => {
            try {
                console.log(`[Worker] Starting structural extraction for ${repoUrl}`);
                const files = await (0, glob_1.glob)("**/*.{ts,tsx,js,jsx}", {
                    cwd: cloneDir,
                    ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
                    absolute: true,
                });
                const extractedData = [];
                const fileContents = new Map();
                for (const filepath of files) {
                    try {
                        const content = await promises_1.default.readFile(filepath, "utf-8");
                        const relPath = path_1.default.relative(cloneDir, filepath);
                        fileContents.set(relPath, content);
                        const tree = (0, parser_1.parseFile)(filepath, content);
                        if (tree) {
                            const data = (0, extractor_1.extractFileData)(relPath, tree);
                            extractedData.push(data);
                        }
                    }
                    catch (e) {
                        console.error(`[Worker] Structural extraction failed for ${filepath}`, e);
                    }
                }
                if (extractedData.length > 0) {
                    const graph = (0, graphBuilder_1.buildGraph)(extractedData);
                    console.log(`[Worker] Starting semantic tagging for ${repoUrl}`);
                    const taggedGraph = await (0, batchProcessor_1.tagGraph)(graph, fileContents);
                    console.log(`[Worker] Structural layer complete. Graph for ${repoUrl}: ${taggedGraph.order} nodes, ${taggedGraph.size} edges.`);
                    await (0, graphStore_1.saveGraph)(repoUrl, taggedGraph);
                }
                else {
                    console.log(`[Worker] No structural data extracted for ${repoUrl}`);
                }
            }
            catch (err) {
                console.error(`[Worker] Overall structural analysis failed for ${repoUrl}`, err);
            }
        };
        const [chunks] = await Promise.all([
            (0, chunker_1.chunkRepository)(cloneDir, repoUrl),
            structuralTask(),
        ]);
        if (chunks.length === 0) {
            console.warn(`[Worker] No chunks produced for ${repoUrl}. Job done.`);
            return;
        }
        // Step 3: Embed + Store
        await job.updateProgress(50);
        await (0, embed_1.embedAndStore)(chunks);
        await job.updateProgress(100);
        console.log(`\n✅ Ingestion complete for ${repoUrl}`);
    }
    finally {
        // Step 4: Cleanup (always runs, even on error)
        if (cloneDir) {
            await (0, clone_1.cleanupRepo)(cloneDir);
        }
    }
}
// ─── Worker Initialisation ────────────────────────────────────────────────────
const worker = new bullmq_1.Worker(QUEUE_NAME, processIngestionJob, {
    connection,
    concurrency: 2, // process up to 2 repos in parallel
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
//# sourceMappingURL=worker.js.map