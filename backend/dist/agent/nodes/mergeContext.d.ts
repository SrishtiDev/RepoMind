import { Chunk } from "../state";
import { GraphContextNode } from "./graphRetrieve";
export interface MergedContext extends Chunk {
    source: "vector" | "graph";
    tags?: string[];
}
export declare function mergeContexts(repoUrl: string, vectorChunks: Chunk[], graphNodes: GraphContextNode[]): Promise<MergedContext[]>;
//# sourceMappingURL=mergeContext.d.ts.map