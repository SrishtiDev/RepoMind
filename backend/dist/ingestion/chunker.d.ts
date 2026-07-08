export interface CodeChunk {
    content: string;
    metadata: {
        filename: string;
        filepath: string;
        chunkIndex: number;
        repoUrl: string;
    };
}
/**
 * Recursively reads all supported files in `repoDir`, splits each into
 * overlapping character chunks, and returns a flat array of CodeChunk objects.
 *
 * @param repoDir  - Absolute path to the cloned repo root
 * @param repoUrl  - Original GitHub URL, stored in chunk metadata
 */
export declare function chunkRepository(repoDir: string, repoUrl: string): Promise<CodeChunk[]>;
//# sourceMappingURL=chunker.d.ts.map