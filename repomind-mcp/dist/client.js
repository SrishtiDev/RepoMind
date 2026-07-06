/**
 * client.ts
 *
 * Thin HTTP wrapper around the RepoMind Express backend.
 * Every function here corresponds 1-to-1 with a REST endpoint.
 * Network errors are caught and re-thrown as descriptive Error instances
 * so the MCP layer can surface them as structured tool errors.
 */
// ── Config ───────────────────────────────────────────────────────────────────
const BASE_URL = (process.env.REPOMIND_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Performs a POST request and returns the parsed JSON body.
 * Throws a descriptive Error on any non-2xx status or network failure.
 */
async function post(path, body) {
    let response;
    try {
        response = await fetch(`${BASE_URL}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    }
    catch (err) {
        // fetch() itself throws only on network-level failures (DNS, refused connection, etc.)
        throw new Error(`RepoMind backend is unreachable at ${BASE_URL}. ` +
            `Is the server running? (${err.message})`);
    }
    const json = (await response.json());
    if (!response.ok) {
        const reason = json.error ??
            `HTTP ${response.status} ${response.statusText}`;
        throw new Error(`RepoMind API error [${path}]: ${reason}`);
    }
    return json;
}
// ── Public API ────────────────────────────────────────────────────────────────
/**
 * Enqueues a GitHub repository for ingestion.
 * The backend validates the URL format and returns a job ID immediately;
 * actual cloning/embedding happens asynchronously in the worker.
 */
export async function ingestRepo(repoUrl) {
    return post("/ingest", { repoUrl });
}
/**
 * Runs a RAG query against the already-ingested codebase.
 * Returns the LLM-synthesised answer and the source chunks used.
 */
export async function askQuestion(question) {
    return post("/query", { question });
}
//# sourceMappingURL=client.js.map