import { glob } from "glob";
import fs from "fs/promises";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CodeChunk {
  content: string;
  metadata: {
    filename: string;    // basename, e.g. "utils.ts"
    filepath: string;    // path relative to repo root, e.g. "src/utils.ts"
    chunkIndex: number;  // 0-based chunk index within the file
    repoUrl: string;
  };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 1000;    // characters
const CHUNK_OVERLAP = 200;  // characters

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
function splitIntoChunks(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));

    // If we've reached the end, stop
    if (end === text.length) break;

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
export async function chunkRepository(
  repoDir: string,
  repoUrl: string
): Promise<CodeChunk[]> {
  // Collect all matching file paths
  const patterns = SUPPORTED_EXTENSIONS.map((ext) => path.join(repoDir, ext));
  const files = await glob(patterns, { ignore: IGNORED_DIRS, absolute: true });

  console.log(`[Chunker] Found ${files.length} files to process.`);

  const allChunks: CodeChunk[] = [];

  for (const absolutePath of files) {
    let content: string;

    try {
      content = await fs.readFile(absolutePath, "utf-8");
    } catch (err) {
      console.warn(`[Chunker] Could not read ${absolutePath}, skipping.`, err);
      continue;
    }

    if (!content.trim()) continue; // skip empty files

    const relativePath = path.relative(repoDir, absolutePath);
    const filename = path.basename(absolutePath);

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
