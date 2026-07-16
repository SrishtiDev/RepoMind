import { describe, it, expect, vi } from "vitest";
import { mergeContexts } from "../src/agent/nodes/mergeContext";
import { cloneRepo } from "../src/ingestion/clone";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

vi.mock("../src/ingestion/clone", () => ({
  cloneRepo: vi.fn(),
  cleanupRepo: vi.fn()
}));

describe("mergeContexts", () => {
  it("should namespace filepaths to prevent collision and handle concurrent requests safely", async () => {
    const repoAUrl = "https://github.com/org/repoA";
    const repoBUrl = "https://github.com/org/repoB";

    const dirA = path.join(os.tmpdir(), `repoA-test-${crypto.randomUUID()}`);
    const dirB = path.join(os.tmpdir(), `repoB-test-${crypto.randomUUID()}`);

    await fs.mkdir(path.join(dirA, "src"), { recursive: true });
    await fs.mkdir(path.join(dirB, "src"), { recursive: true });

    await fs.writeFile(path.join(dirA, "src/index.ts"), "MARKER_A\nexport const a = 1;");
    await fs.writeFile(path.join(dirB, "src/index.ts"), "MARKER_B\nexport const b = 2;");

    // Mock cloneRepo to return these directories
    (cloneRepo as any).mockImplementation(async (url: string) => {
      if (url === repoAUrl) return dirA;
      if (url === repoBUrl) return dirB;
      return os.tmpdir();
    });

    const chunksA: any[] = [];
    const nodesA = [{ filepath: "src/index.ts", startLine: 1, endLine: 2, tags: [] }];

    const chunksB: any[] = [];
    const nodesB = [{ filepath: "src/index.ts", startLine: 1, endLine: 2, tags: [] }];

    // Call concurrently to simulate race condition
    const [resultA, resultB] = await Promise.all([
      mergeContexts(repoAUrl, chunksA, nodesA as any),
      mergeContexts(repoBUrl, chunksB, nodesB as any)
    ]);

    expect(resultA).toHaveLength(1);
    expect(resultA[0].content).toContain("MARKER_A");
    expect(resultA[0].content).not.toContain("MARKER_B");

    expect(resultB).toHaveLength(1);
    expect(resultB[0].content).toContain("MARKER_B");
    expect(resultB[0].content).not.toContain("MARKER_A");

    // Clean up
    await fs.rm(dirA, { recursive: true, force: true });
    await fs.rm(dirB, { recursive: true, force: true });
  });

  it("should exclude vector chunks with mismatched repoUrl", async () => {
    const repoUrl = "https://github.com/org/repoA";
    const goodChunk = { 
      content: "good", 
      filename: "f", 
      filepath: "f", 
      chunkIndex: 1, 
      repoUrl 
    };
    const badChunk = { 
      content: "bad", 
      filename: "f", 
      filepath: "f", 
      chunkIndex: 2, 
      repoUrl: "https://github.com/org/repoB" 
    };
    
    const result = await mergeContexts(repoUrl, [goodChunk, badChunk], []);
    
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe("good");
  });
});
