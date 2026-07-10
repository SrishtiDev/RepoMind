/**
 * graphStore.ts
 *
 * Stores and retrieves the structural code graph using Qdrant as a durable
 * key-value store, using a special "graph_metadata" point.
 *
 * Why Qdrant instead of Redis?
 * - The free-tier Redis instance (shared with BullMQ) uses allkeys-lru eviction.
 *   Under memory pressure it silently deletes graph keys, causing 404s on /graph.
 * - Qdrant is a dedicated vector DB with persistent disk storage — no eviction.
 * - No new dependency: Qdrant is already used for chunk embeddings.
 *
 * Storage scheme:
 *   Collection : "repomind_graphs" (separate from the "repomind" chunk collection)
 *   Point ID   : deterministic UUID v5 derived from repoUrl (stable across saves)
 *   Vector     : single zero-dimension placeholder [0] (we only use payload)
 *   Payload    : { type, repoUrl, graphJson, savedAt }
 */

import { DirectedGraph } from "graphology";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v5 as uuidv5 } from "uuid";
import crypto from "crypto";
import "dotenv/config";

// ─── Config ───────────────────────────────────────────────────────────────────

const GRAPH_COLLECTION = "repomind_graphs";
// Qdrant requires vectors; we use a 1-dim zero vector as a dummy since
// we're only using the payload for document storage.
const DUMMY_VECTOR_SIZE = 1;

// Fixed UUID namespace for generating deterministic point IDs from repo URLs
const REPOMIND_GRAPH_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

// ─── Client ───────────────────────────────────────────────────────────────────

function getQdrantClient(): QdrantClient {
  return new QdrantClient({
    url: process.env.QDRANT_URL ?? "http://localhost:6333",
    apiKey: process.env.QDRANT_API_KEY,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Derives a stable, deterministic Qdrant point ID (UUIDv5)
 * from the repo URL so saves are idempotent (upsert == overwrite).
 */
function repoUrlToPointId(repoUrl: string): string {
  return uuidv5(repoUrl, REPOMIND_GRAPH_NAMESPACE);
}

/**
 * Creates the graph metadata collection if it doesn't exist.
 * Safe to call on every run — no-op if already present.
 */
async function ensureGraphCollection(client: QdrantClient): Promise<void> {
  const { collections } = await client.getCollections();
  const exists = collections.some((c) => c.name === GRAPH_COLLECTION);

  if (!exists) {
    console.log(`[Structural Store] Creating Qdrant collection "${GRAPH_COLLECTION}"...`);
    await client.createCollection(GRAPH_COLLECTION, {
      vectors: {
        size: DUMMY_VECTOR_SIZE,
        distance: "Cosine",
      },
    });
    console.log(`[Structural Store] Collection "${GRAPH_COLLECTION}" created.`);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Serializes and saves the graphology graph to Qdrant.
 * Uses upsert so calling this twice for the same repo is safe (idempotent).
 */
export async function saveGraph(repoUrl: string, graph: DirectedGraph): Promise<void> {
  const client = getQdrantClient();
  await ensureGraphCollection(client);

  const pointId = repoUrlToPointId(repoUrl);
  const graphJson = JSON.stringify(graph.export());

  await client.upsert(GRAPH_COLLECTION, {
    wait: true,
    points: [
      {
        id: pointId,
        vector: [0],           // dummy vector — we only care about the payload
        payload: {
          type: "graph_metadata",
          repoUrl,
          graphJson,
          nodeCount: graph.order,
          edgeCount: graph.size,
          savedAt: new Date().toISOString(),
        },
      },
    ],
  });

  console.log(
    `[Structural Store] Saved graph to Qdrant (id: ${pointId}, repo: ${repoUrl}) ` +
    `with ${graph.order} nodes and ${graph.size} edges.`
  );
}

/**
 * Loads and deserializes a graph from Qdrant for a given repository URL.
 * Returns null if no graph has been saved for that repo yet.
 */
export async function loadGraph(repoUrl: string): Promise<DirectedGraph | null> {
  const client = getQdrantClient();

  try {
    await ensureGraphCollection(client);
  } catch {
    // If the collection doesn't exist yet, there's no graph to return
    return null;
  }

  const pointId = repoUrlToPointId(repoUrl);

  try {
    const response = await client.retrieve(GRAPH_COLLECTION, {
      ids: [pointId],
      with_payload: true,
      with_vector: false,
    });

    if (!response || response.length === 0) {
      return null;
    }

    const payload = response[0].payload as Record<string, any>;
    if (!payload?.graphJson) {
      console.warn(`[Structural Store] Point found for ${repoUrl} but graphJson is missing.`);
      return null;
    }

    const data = JSON.parse(payload.graphJson as string);
    const graph = new DirectedGraph();
    graph.import(data);

    console.log(
      `[Structural Store] Loaded graph from Qdrant for ${repoUrl}: ` +
      `${graph.order} nodes, ${graph.size} edges.`
    );
    return graph;
  } catch (err) {
    console.error(`[Structural Store] Failed to load/deserialize graph for ${repoUrl}:`, err);
    return null;
  }
}
