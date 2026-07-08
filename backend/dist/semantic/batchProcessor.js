"use strict";
/**
 * batchProcessor.ts - Orchestrates the extraction of code snippets, batching,
 * and calling the classifier. Tags are then attached to the graph.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BATCH_SIZE = void 0;
exports.tagGraph = tagGraph;
const classifier_1 = require("./classifier");
exports.BATCH_SIZE = 12;
const MAX_CONCURRENCY = 3;
/**
 * Extracts the snippet for a node given the start/end lines and the full file content.
 */
function extractSnippet(fileContent, startLine, endLine) {
    const lines = fileContent.split("\n");
    const startIdx = Math.max(0, startLine - 1);
    const endIdx = Math.min(lines.length, endLine);
    return lines.slice(startIdx, endIdx).join("\n");
}
/**
 * Runs an array of tasks with a concurrency limit.
 */
async function processWithConcurrency(items, concurrency, processor) {
    const results = [];
    const executing = [];
    for (const item of items) {
        const p = Promise.resolve().then(() => processor(item));
        results.push(p);
        const e = p.then(() => {
            executing.splice(executing.indexOf(e), 1);
        });
        executing.push(e);
        if (executing.length >= concurrency) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}
/**
 * Main entry point for tagging the structural graph.
 *
 * @param graph - The structural graphology DirectedGraph
 * @param fileContents - Map of filepath -> raw file content
 * @returns The updated graph with "tags" attached to nodes
 */
async function tagGraph(graph, fileContents) {
    const nodesToProcess = [];
    // 1. Gather nodes
    graph.forEachNode((node, attrs) => {
        if (attrs.type === "function" || attrs.type === "class") {
            const filepath = attrs.filepath;
            const content = fileContents.get(filepath);
            if (!content || attrs.startLine === undefined || attrs.endLine === undefined) {
                return;
            }
            try {
                const snippet = extractSnippet(content, attrs.startLine, attrs.endLine);
                // Find imports for this file to provide context
                const imports = [];
                graph.forEachOutboundEdge(filepath, (edge, edgeAttrs, source, target) => {
                    if (edgeAttrs.type === "imports") {
                        imports.push(target);
                    }
                });
                nodesToProcess.push({
                    nodeId: node,
                    filepath,
                    name: attrs.name,
                    codeSnippet: snippet,
                    imports
                });
            }
            catch (err) {
                console.warn(`[Semantic BatchProcessor] Failed to extract snippet for node ${node}`);
            }
        }
    });
    console.log(`[Semantic BatchProcessor] Found ${nodesToProcess.length} nodes to tag.`);
    // 2. Batch nodes
    const batches = [];
    for (let i = 0; i < nodesToProcess.length; i += exports.BATCH_SIZE) {
        batches.push(nodesToProcess.slice(i, i + exports.BATCH_SIZE));
    }
    // 3. Process batches
    console.log(`[Semantic BatchProcessor] Processing ${batches.length} batches...`);
    const allResults = await processWithConcurrency(batches, MAX_CONCURRENCY, async (batch) => {
        return await (0, classifier_1.classifyBatch)(batch);
    });
    // 4. Attach tags to graph
    let tagsApplied = 0;
    for (const batchResult of allResults) {
        for (const res of batchResult) {
            if (graph.hasNode(res.nodeId)) {
                graph.setNodeAttribute(res.nodeId, "tags", res.tags);
                tagsApplied++;
            }
        }
    }
    console.log(`[Semantic BatchProcessor] Applied tags to ${tagsApplied} nodes.`);
    return graph;
}
//# sourceMappingURL=batchProcessor.js.map