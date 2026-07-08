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
          label: attrs.name || attrs.filepath || node,
          filepath: attrs.filepath,
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

    res.status(200).json({ nodes, edges });
  } catch (err: any) {
    console.error("[Route /graph] Failed to load graph:", err);
    res.status(500).json({ error: "Failed to load graph data" });
  }
});

export default router;
