"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkRepository = chunkRepository;
const glob_1 = require("glob");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
// ─── Config ───────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters
const SUPPORTED_EXTENSIONS = ["**/*.ts", "**/*.js", "**/*.py", "**/*.md"];
// Directories to exclude from scanning
const IGNORED_DIRS = [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/__pycache__/**",
    "**/.venv/**",
];
// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Splits a text string into overlapping chunks of fixed character length.
 */
function splitIntoChunks(text, chunkSize, overlap) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push(text.slice(start, end));
        // If we've reached the end, stop
        if (end === text.length)
            break;
        // Advance by (chunkSize - overlap) to create the sliding window
        start += chunkSize - overlap;
    }
    return chunks;
}
// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Recursively reads all supported files in `repoDir`, splits each into
 * overlapping character chunks, and returns a flat array of CodeChunk objects.
 *
 * @param repoDir  - Absolute path to the cloned repo root
 * @param repoUrl  - Original GitHub URL, stored in chunk metadata
 */
async function chunkRepository(repoDir, repoUrl) {
    // Collect all matching file paths
    const patterns = SUPPORTED_EXTENSIONS.map((ext) => path_1.default.join(repoDir, ext));
    const files = await (0, glob_1.glob)(patterns, { ignore: IGNORED_DIRS, absolute: true });
    console.log(`[Chunker] Found ${files.length} files to process.`);
    const allChunks = [];
    for (const absolutePath of files) {
        let content;
        try {
            content = await promises_1.default.readFile(absolutePath, "utf-8");
        }
        catch (err) {
            console.warn(`[Chunker] Could not read ${absolutePath}, skipping.`, err);
            continue;
        }
        if (!content.trim())
            continue; // skip empty files
        const relativePath = path_1.default.relative(repoDir, absolutePath);
        const filename = path_1.default.basename(absolutePath);
        const rawChunks = splitIntoChunks(content, CHUNK_SIZE, CHUNK_OVERLAP);
        rawChunks.forEach((chunkContent, chunkIndex) => {
            allChunks.push({
                content: chunkContent,
                metadata: {
                    filename,
                    filepath: relativePath,
                    chunkIndex,
                    repoUrl,
                },
            });
        });
    }
    console.log(`[Chunker] Total chunks produced: ${allChunks.length}`);
    return allChunks;
}
//# sourceMappingURL=chunker.js.map