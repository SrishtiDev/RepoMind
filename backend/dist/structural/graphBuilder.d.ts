import { DirectedGraph } from "graphology";
import { FileData } from "./extractor";
/**
 * Builds a graphology DirectedGraph from extracted file data.
 * Call resolution works for:
 *  (a) same-file functions (direct matches by name)
 *  (b) cross-file functions (if explicitly imported and exported by the target file)
 * Unresolvable calls (e.g., globals, deeply nested members, dynamic imports) are skipped.
 */
export declare function buildGraph(files: FileData[]): DirectedGraph;
//# sourceMappingURL=graphBuilder.d.ts.map