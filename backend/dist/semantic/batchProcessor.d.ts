/**
 * batchProcessor.ts - Orchestrates the extraction of code snippets, batching,
 * and calling the classifier. Tags are then attached to the graph.
 */
import { DirectedGraph } from "graphology";
export declare const BATCH_SIZE = 12;
/**
 * Main entry point for tagging the structural graph.
 *
 * @param graph - The structural graphology DirectedGraph
 * @param fileContents - Map of filepath -> raw file content
 * @returns The updated graph with "tags" attached to nodes
 */
export declare function tagGraph(graph: DirectedGraph, fileContents: Map<string, string>): Promise<DirectedGraph>;
//# sourceMappingURL=batchProcessor.d.ts.map