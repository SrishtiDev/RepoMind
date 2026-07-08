import { DirectedGraph } from "graphology";
import "dotenv/config";
/**
 * Serializes and saves the graphology graph to Redis.
 * The key is constructed using an MD5 hash of the repository URL.
 */
export declare function saveGraph(repoUrl: string, graph: DirectedGraph): Promise<void>;
/**
 * Loads and deserializes a graph from Redis for a given repository URL.
 * Returns null if the graph does not exist in the store.
 */
export declare function loadGraph(repoUrl: string): Promise<DirectedGraph | null>;
//# sourceMappingURL=graphStore.d.ts.map