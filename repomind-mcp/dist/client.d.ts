/**
 * client.ts
 *
 * Thin HTTP wrapper around the RepoMind Express backend.
 * Every function here corresponds 1-to-1 with a REST endpoint.
 * Network errors are caught and re-thrown as descriptive Error instances
 * so the MCP layer can surface them as structured tool errors.
 */
export interface IngestResponse {
    success: boolean;
    message: string;
    jobId: string;
    repoUrl: string;
}
export interface Source {
    filename: string;
    filepath: string;
    chunkIndex: number;
}
export interface QueryResponse {
    success: boolean;
    answer: string;
    sources: Source[];
}
/**
 * Enqueues a GitHub repository for ingestion.
 * The backend validates the URL format and returns a job ID immediately;
 * actual cloning/embedding happens asynchronously in the worker.
 */
export declare function ingestRepo(repoUrl: string): Promise<IngestResponse>;
/**
 * Runs a RAG query against the already-ingested codebase.
 * Returns the LLM-synthesised answer and the source chunks used.
 */
export declare function askQuestion(question: string): Promise<QueryResponse>;
//# sourceMappingURL=client.d.ts.map