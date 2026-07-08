"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveGraph = saveGraph;
exports.loadGraph = loadGraph;
const graphology_1 = require("graphology");
const ioredis_1 = __importDefault(require("ioredis"));
const crypto_1 = __importDefault(require("crypto"));
require("dotenv/config");
// Reuse the exact connection pattern from the worker
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD,
});
/**
 * Serializes and saves the graphology graph to Redis.
 * The key is constructed using an MD5 hash of the repository URL.
 */
async function saveGraph(repoUrl, graph) {
    const hash = crypto_1.default.createHash("md5").update(repoUrl).digest("hex");
    const key = `graph:${hash}`;
    const serialized = JSON.stringify(graph.export());
    await redis.set(key, serialized);
    console.log(`[Structural Store] Saved graph to Redis (key: ${key}) with ${graph.order} nodes and ${graph.size} edges.`);
}
/**
 * Loads and deserializes a graph from Redis for a given repository URL.
 * Returns null if the graph does not exist in the store.
 */
async function loadGraph(repoUrl) {
    const hash = crypto_1.default.createHash("md5").update(repoUrl).digest("hex");
    const key = `graph:${hash}`;
    const serialized = await redis.get(key);
    if (!serialized)
        return null;
    try {
        const data = JSON.parse(serialized);
        const graph = new graphology_1.DirectedGraph();
        graph.import(data);
        return graph;
    }
    catch (err) {
        console.error(`[Structural Store] Failed to deserialize graph for ${repoUrl}`, err);
        return null;
    }
}
//# sourceMappingURL=graphStore.js.map