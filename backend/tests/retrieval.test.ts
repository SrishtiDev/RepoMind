import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { QdrantClient } from "@qdrant/js-client-rest";
import { retrieveForTenant } from "../src/lib/retrieval";

// Qdrant container config
const QDRANT_IMAGE = "qdrant/qdrant:v1.9.0";
const QDRANT_PORT = 6333;

describe("Retrieval Choke-point Data Isolation", () => {
  let qdrantContainer: StartedTestContainer;
  let qdrantClient: QdrantClient;

  beforeAll(async () => {
    // 1. Start Qdrant in Docker via Testcontainers
    qdrantContainer = await new GenericContainer(QDRANT_IMAGE)
      .withExposedPorts(QDRANT_PORT)
      .start();

    const host = qdrantContainer.getHost();
    const port = qdrantContainer.getMappedPort(QDRANT_PORT);
    const qdrantUrl = `http://${host}:${port}`;

    // Point the retrieval module's process.env to the test container
    process.env.QDRANT_URL = qdrantUrl;
    delete process.env.QDRANT_API_KEY;

    qdrantClient = new QdrantClient({ url: qdrantUrl, checkCompatibility: false });

    // 2. Create the repomind collection
    await qdrantClient.createCollection("repomind", {
      vectors: { size: 3, distance: "Cosine" }, // Use dim 3 for test vectors
    });

    // 3. Seed test data: 
    // Repo A (Normal Content)
    // Repo B (Includes Canary Content)
    await qdrantClient.upsert("repomind", {
      wait: true,
      points: [
        {
          id: "a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1",
          vector: [0.9, 0.1, 0.1],
          payload: { repoUrl: "repo-a", content: "repo-a normal chunk 1", filename: "file1.ts" },
        },
        {
          id: "a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2",
          vector: [0.8, 0.2, 0.1],
          payload: { repoUrl: "repo-a", content: "repo-a normal chunk 2", filename: "file2.ts" },
        },
        {
          id: "b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1",
          vector: [0.9, 0.1, 0.1], // VERY similar to repo-a chunk 1
          payload: { repoUrl: "repo-b", content: "CANARY_SECRET_CHUNK_B", filename: "secret.ts" },
        },
        {
          id: "b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2",
          vector: [0.1, 0.9, 0.1],
          payload: { repoUrl: "repo-b", content: "repo-b normal chunk 2", filename: "file2.ts" },
        },
      ],
    });
  }, 60000); // Allow up to 60s for image pull and start

  afterAll(async () => {
    if (qdrantContainer) {
      await qdrantContainer.stop();
    }
  });

  it("should never return the canary chunk when scoped to repo-a, even with a similar vector", async () => {
    // We search using a vector very close to the canary chunk [0.9, 0.1, 0.1]
    const searchResults = await retrieveForTenant({
      repoUrl: "repo-a",
      queryVector: [0.9, 0.1, 0.1],
      topK: 5, // Request more chunks to maximize chance of grabbing canary if unfiltered
    });

    // 1. Assert canary chunk is completely absent
    const contents = searchResults.map(res => String(res.payload?.content));
    const canaryFound = contents.some(c => c.includes("CANARY_SECRET_CHUNK_B"));
    expect(canaryFound).toBe(false);

    // 2. Assert every returned chunk belongs to repo-a
    for (const res of searchResults) {
      expect(res.payload?.repoUrl).toBe("repo-a");
    }
  });

  it("basic isolation test: querying repo-a only returns repo-a chunks", async () => {
    const searchResults = await retrieveForTenant({
      repoUrl: "repo-a",
      queryVector: [0.85, 0.15, 0.1], // A generic search vector
      topK: 10,
    });

    // Expecting to find something
    expect(searchResults.length).toBeGreaterThan(0);

    // Every chunk must be repo-a
    for (const res of searchResults) {
      expect(res.payload?.repoUrl).toBe("repo-a");
    }
  });

  it("basic isolation test: querying repo-b only returns repo-b chunks", async () => {
    const searchResults = await retrieveForTenant({
      repoUrl: "repo-b",
      queryVector: [0.85, 0.15, 0.1], 
      topK: 10,
    });

    expect(searchResults.length).toBeGreaterThan(0);

    for (const res of searchResults) {
      expect(res.payload?.repoUrl).toBe("repo-b");
    }
  });
});
