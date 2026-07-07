import { DirectedGraph } from "graphology";
import Redis from "ioredis";
import crypto from "crypto";
import "dotenv/config";

// Reuse the exact connection pattern from the worker
const redis = new Redis({
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
});

/**
 * Serializes and saves the graphology graph to Redis.
 * The key is constructed using an MD5 hash of the repository URL.
 */
export async function saveGraph(repoUrl: string, graph: DirectedGraph): Promise<void> {
  const hash = crypto.createHash("md5").update(repoUrl).digest("hex");
  const key = `graph:${hash}`;
  
  const serialized = JSON.stringify(graph.export());
  await redis.set(key, serialized);
  
  console.log(`[Structural Store] Saved graph to Redis (key: ${key}) with ${graph.order} nodes and ${graph.size} edges.`);
}

/**
 * Loads and deserializes a graph from Redis for a given repository URL.
 * Returns null if the graph does not exist in the store.
 */
export async function loadGraph(repoUrl: string): Promise<DirectedGraph | null> {
  const hash = crypto.createHash("md5").update(repoUrl).digest("hex");
  const key = `graph:${hash}`;
  
  const serialized = await redis.get(key);
  if (!serialized) return null;

  try {
    const data = JSON.parse(serialized);
    const graph = new DirectedGraph();
    graph.import(data);
    return graph;
  } catch (err) {
    console.error(`[Structural Store] Failed to deserialize graph for ${repoUrl}`, err);
    return null;
  }
}
