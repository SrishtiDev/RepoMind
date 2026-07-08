"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeContexts = mergeContexts;
/**
 * mergeContext.ts - Merges vector chunks + graph nodes into a unified, deduplicated context.
 */
const path_1 = __importDefault(require("path"));
const clone_1 = require("../../ingestion/clone");
const promises_1 = __importDefault(require("fs/promises"));
const glob_1 = require("glob");
async function mergeContexts(repoUrl, vectorChunks, graphNodes) {
    const merged = [];
    // Note: For this node to extract snippets for the graph nodes, we read the files.
    // The worker deletes the cloneDir. So we must clone it temporarily or read from GitHub.
    // We'll clone here. This takes a moment but ensures accuracy. (In a full scale app, 
    // you might store the raw content in Qdrant payloads or Redis).
    let cloneDir = null;
    const fileContents = new Map();
    if (graphNodes.length > 0) {
        try {
            cloneDir = await (0, clone_1.cloneRepo)(repoUrl);
            const files = await (0, glob_1.glob)("**/*.{ts,tsx,js,jsx}", {
                cwd: cloneDir,
                ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**"],
                absolute: true,
            });
            for (const filepath of files) {
                const content = await promises_1.default.readFile(filepath, "utf-8");
                const relPath = path_1.default.relative(cloneDir, filepath);
                fileContents.set(relPath, content);
            }
        }
        catch (err) {
            console.warn("[Merge Context] Failed to clone/read repository files for graph node snippets.", err);
        }
    }
    // 1. Add graph nodes
    for (const node of graphNodes) {
        const rawContent = fileContents.get(node.filepath);
        if (!rawContent)
            continue;
        const lines = rawContent.split("\n");
        const startIdx = Math.max(0, node.startLine - 1);
        const endIdx = Math.min(lines.length, node.endLine);
        const content = lines.slice(startIdx, endIdx).join("\n");
        merged.push({
            source: "graph",
            filepath: node.filepath,
            filename: path_1.default.basename(node.filepath),
            content,
            chunkIndex: -1, // Distinguishes from vector chunks for citation purposes
            tags: node.tags
        });
    }
    // 2. Add vector chunks, deduplicating if overlapping
    for (const chunk of vectorChunks) {
        let isOverlapping = false;
        for (const node of graphNodes) {
            if (node.filepath === chunk.filepath) {
                const rawContent = fileContents.get(node.filepath);
                if (rawContent) {
                    const lines = rawContent.split("\n");
                    const nodeContent = lines.slice(Math.max(0, node.startLine - 1), node.endLine).join("\n");
                    // Deduplicate by string inclusion
                    if (nodeContent.includes(chunk.content.trim()) || chunk.content.includes(nodeContent.trim())) {
                        isOverlapping = true;
                        break;
                    }
                }
            }
        }
        if (!isOverlapping) {
            merged.push({
                ...chunk,
                source: "vector"
            });
        }
    }
    if (cloneDir) {
        await (0, clone_1.cleanupRepo)(cloneDir);
    }
    return merged;
}
//# sourceMappingURL=mergeContext.js.map