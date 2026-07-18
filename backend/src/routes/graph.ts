/**
 * graph.ts - Serves the structural+semantic code graph for visualization.
 */
import { Router, Request, Response } from "express";
import { loadGraph } from "../structural/graphStore";

const router = Router();

/**
 * GET /graph?repoUrl=<url>
 * Returns a serialized graph matching react-flow's expected node/edge shape.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const repoUrl = req.query.repoUrl as string;

  if (!repoUrl) {
    res.status(400).json({ error: "Missing repoUrl parameter" });
    return;
  }

  try {
    const graph = await loadGraph(repoUrl);
    
    if (!graph) {
      console.log(`[Route /graph] Graph request for ${repoUrl}: no graph found in Qdrant`);
      res.status(404).json({ error: "Code map isn't ready yet for this repo" });
      return;
    }

    const nodes: any[] = [];
    const edges: any[] = [];

    graph.forEachNode((node, attrs) => {
      nodes.push({
        id: node,
        type: attrs.type || "file",
        data: {
          // For file nodes the key IS the filepath (no attrs.filepath set by graphBuilder),
          // so we fall back to `node` (the graphology key) to ensure filepath is always defined.
          label: attrs.name || attrs.filepath || node,
          filepath: attrs.filepath ?? (attrs.type === "file" ? node : undefined),
          tags: attrs.tags || [],
          startLine: attrs.startLine,
          endLine: attrs.endLine
        },
        position: { x: 0, y: 0 } // required by react-flow, will be auto-layouted on frontend
      });
    });

    graph.forEachEdge((edge, attrs, source, target) => {
      edges.push({
        id: edge,
        source,
        target,
        label: attrs.type
      });
    });

    console.log(`[Route /graph] Graph request for ${repoUrl}: ${nodes.length} nodes, ${edges.length} edges`);
    res.status(200).json({ nodes, edges });
  } catch (err: any) {
    console.error("[Route /graph] Failed to load graph:", err);
    res.status(500).json({ error: "Failed to load graph data" });
  }
});

/**
 * GET /graph/node-snippet?repoUrl=<github-url>&filepath=<path>&startLine=<n>&endLine=<n>
 *
 * Fetches raw file content from GitHub's raw content CDN and returns only the
 * requested line range. Uses the public raw.githubusercontent.com endpoint so
 * we don't need to keep a clone on disk after ingestion.
 *
 * Line numbers are 1-indexed and both bounds are inclusive.
 */
router.get("/node-snippet", async (req: Request, res: Response): Promise<void> => {
  const { repoUrl, filepath, startLine, endLine } = req.query as Record<string, string>;

  if (!repoUrl || !filepath) {
    res.status(400).json({ error: "Missing repoUrl or filepath" });
    return;
  }

  try {
    // Convert https://github.com/owner/repo → https://raw.githubusercontent.com/owner/repo/HEAD/<filepath>
    const ghMatch = repoUrl.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
    if (!ghMatch) {
      res.status(400).json({ error: "repoUrl must be a GitHub repository URL" });
      return;
    }

    const rawUrl = `https://raw.githubusercontent.com/${ghMatch[1]}/HEAD/${filepath}`;
    const response = await fetch(rawUrl);

    if (!response.ok) {
      res.status(response.status).json({ error: `GitHub raw fetch failed: ${response.statusText}` });
      return;
    }

    const fullContent = await response.text();
    const allLines = fullContent.split("\n");

    // Clamp to valid bounds (lines are 1-indexed)
    const start = Math.max(1, parseInt(startLine ?? "1", 10)) - 1;
    const end = Math.min(allLines.length, parseInt(endLine ?? String(allLines.length), 10));
    const snippet = allLines.slice(start, end).join("\n");

    res.status(200).json({ snippet, startLine: start + 1, endLine: end });
  } catch (err: any) {
    console.error("[Route /graph/node-snippet] Failed to fetch snippet:", err);
    res.status(500).json({ error: "Failed to fetch code snippet" });
  }
});

export default router;
