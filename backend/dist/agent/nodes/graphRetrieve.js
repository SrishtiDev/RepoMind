"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveFromGraph = retrieveFromGraph;
/**
 * graphRetrieve.ts - Traverses the code graph from tagged nodes to gather context.
 */
const graphStore_1 = require("../../structural/graphStore");
const MAX_HOPS = 1; // MVP tradeoff: limits noise from deep traversal
const MAX_GRAPH_NODES = 15;
async function retrieveFromGraph(repoUrl, tags) {
    if (!tags || tags.length === 0)
        return [];
    // Gracefully degrade to empty if structural/semantic pipelines failed or haven't run
    const graph = await (0, graphStore_1.loadGraph)(repoUrl);
    if (!graph)
        return [];
    const directMatches = new Set();
    const connectedMatches = new Set();
    // 1. Direct tag matches
    graph.forEachNode((node, attrs) => {
        if (attrs.type === "function" || attrs.type === "class") {
            const nodeTags = (attrs.tags || []);
            if (nodeTags.some(t => tags.includes(t))) {
                directMatches.add(node);
            }
        }
    });
    // 2. Traverse outward up to MAX_HOPS
    let currentLevel = Array.from(directMatches);
    for (let hop = 0; hop < MAX_HOPS; hop++) {
        const nextLevel = new Set();
        for (const node of currentLevel) {
            graph.forEachEdge(node, (edge, edgeAttrs, source, target) => {
                if (edgeAttrs.type === "calls" || edgeAttrs.type === "imports") {
                    const neighbor = source === node ? target : source;
                    const nAttrs = graph.getNodeAttributes(neighbor);
                    if ((nAttrs.type === "function" || nAttrs.type === "class") && !directMatches.has(neighbor)) {
                        nextLevel.add(neighbor);
                        connectedMatches.add(neighbor);
                    }
                }
            });
        }
        currentLevel = Array.from(nextLevel);
    }
    // 3. Assemble and cap results (direct matches get priority)
    const results = [];
    const addNodeToResult = (node, relation) => {
        if (results.length >= MAX_GRAPH_NODES)
            return;
        const attrs = graph.getNodeAttributes(node);
        results.push({
            nodeId: node,
            filepath: attrs.filepath,
            name: attrs.name,
            type: attrs.type,
            startLine: attrs.startLine,
            endLine: attrs.endLine,
            tags: attrs.tags || [],
            relation
        });
    };
    for (const node of directMatches)
        addNodeToResult(node, "direct-match");
    for (const node of connectedMatches)
        addNodeToResult(node, "connected");
    return results;
}
//# sourceMappingURL=graphRetrieve.js.map