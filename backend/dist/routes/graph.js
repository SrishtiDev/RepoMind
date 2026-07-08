"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * graph.ts - Serves the structural+semantic code graph for visualization.
 */
const express_1 = require("express");
const graphStore_1 = require("../structural/graphStore");
const router = (0, express_1.Router)();
/**
 * GET /graph?repoUrl=<url>
 * Returns a serialized graph matching react-flow's expected node/edge shape.
 */
router.get("/", async (req, res) => {
    const repoUrl = req.query.repoUrl;
    if (!repoUrl) {
        res.status(400).json({ error: "Missing repoUrl parameter" });
        return;
    }
    try {
        const graph = await (0, graphStore_1.loadGraph)(repoUrl);
        if (!graph) {
            res.status(404).json({ error: "Code map isn't ready yet for this repo" });
            return;
        }
        const nodes = [];
        const edges = [];
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
    }
    catch (err) {
        console.error("[Route /graph] Failed to load graph:", err);
        res.status(500).json({ error: "Failed to load graph data" });
    }
});
exports.default = router;
//# sourceMappingURL=graph.js.map