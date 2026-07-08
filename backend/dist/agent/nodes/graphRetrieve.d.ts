export interface GraphContextNode {
    nodeId: string;
    filepath: string;
    name: string;
    type: "function" | "class";
    startLine: number;
    endLine: number;
    tags: string[];
    relation: "direct-match" | "connected";
}
export declare function retrieveFromGraph(repoUrl: string, tags: string[]): Promise<GraphContextNode[]>;
//# sourceMappingURL=graphRetrieve.d.ts.map