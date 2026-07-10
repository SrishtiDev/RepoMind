import { parseFile } from "./parser";
import { extractFileData, FileData } from "./extractor";

/**
 * Piscina worker entrypoint for CPU-bound AST parsing.
 * Runs off the main event loop to prevent blocking incoming Express API requests.
 */
export default function parseAndExtract({ 
  filepath, 
  content, 
  relPath 
}: { 
  filepath: string; 
  content: string; 
  relPath: string;
}): FileData | null {
  const tree = parseFile(filepath, content);
  if (tree) {
    return extractFileData(relPath, tree);
  }
  return null;
}
