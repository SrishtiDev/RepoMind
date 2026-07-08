"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addIngestionJob = addIngestionJob;
const bullmq_1 = require("bullmq");
require("dotenv/config");
// ─── Shared Redis Connection ───────────────────────────────────────────────────
// Pass a plain options object — BullMQ bundles its own ioredis internally,
// so passing an external ioredis instance causes a type conflict.
const connection = {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
};
const QUEUE_NAME = process.env.QUEUE_NAME ?? "ingestion";
// Lazily-initialised singleton queue instance
let ingestionQueue = null;
function getQueue() {
    if (!ingestionQueue) {
        ingestionQueue = new bullmq_1.Queue(QUEUE_NAME, { connection });
    }
    return ingestionQueue;
}
/**
 * Adds an ingestion job to the BullMQ queue.
 * The worker will pick it up and run clone → chunk → embed.
 */
async function addIngestionJob(data) {
    const queue = getQueue();
    const job = await queue.add("ingest-repo", data, {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: 100, // keep last 100 completed jobs
        removeOnFail: 50,
    });
    console.log(`[Producer] Job ${job.id} added for repo: ${data.repoUrl}`);
    return job.id;
}
//# sourceMappingURL=producer.js.map