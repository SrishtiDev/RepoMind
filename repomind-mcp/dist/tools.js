/**
 * tools.ts
 *
 * Defines the two MCP tools exposed by this server:
 *   - repomind_ingest  → POST /ingest
 *   - repomind_ask     → POST /query
 *
 * Each tool definition is a plain object consumed by index.ts when
 * registering handlers with the McpServer instance.
 */
import { z } from "zod";
import { ingestRepo, askQuestion } from "./client.js";
// ── Shared GitHub URL pattern (mirrors backend validation) ────────────────────
const GITHUB_URL_RE = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/;
// ── Tool: repomind_ingest ─────────────────────────────────────────────────────
export const INGEST_TOOL_NAME = "repomind_ingest";
export const ingestToolSchema = z.object({
    repoUrl: z
        .string()
        .min(1, "repoUrl must not be empty")
        .regex(GITHUB_URL_RE, "repoUrl must be a valid GitHub URL, e.g. https://github.com/owner/repo"),
});
/**
 * Zod raw shape passed directly to server.tool().
 * The SDK (v1.x) accepts ZodRawShape, not a plain JSON Schema object.
 */
export const ingestZodShape = {
    repoUrl: z
        .string()
        .min(1, "repoUrl must not be empty")
        .regex(GITHUB_URL_RE, "repoUrl must be a valid GitHub URL, e.g. https://github.com/owner/repo")
        .describe("Full GitHub repository URL to ingest, e.g. https://github.com/owner/repo"),
};
export const INGEST_TOOL_DESCRIPTION = "Ingest a public GitHub repository into RepoMind so it can be queried. " +
    "Call this once before asking questions about a new repo. " +
    "Returns a job ID — ingestion runs asynchronously in the background.";
/**
 * Handler for repomind_ingest.
 * Validates the input, delegates to the HTTP client, and returns a
 * human-readable confirmation the calling agent can relay to the user.
 */
export async function handleIngest(rawInput) {
    const parsed = ingestToolSchema.safeParse(rawInput);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(`Invalid input for repomind_ingest:\n${issues}`);
    }
    const { repoUrl } = parsed.data;
    const result = await ingestRepo(repoUrl);
    return [
        `✅ Ingestion job queued successfully.`,
        ``,
        `  Repository : ${result.repoUrl}`,
        `  Job ID     : ${result.jobId}`,
        `  Message    : ${result.message}`,
        ``,
        `The repository is being cloned and embedded in the background.`,
        `Once complete, use repomind_ask to query it.`,
    ].join("\n");
}
// ── Tool: repomind_ask ────────────────────────────────────────────────────────
export const ASK_TOOL_NAME = "repomind_ask";
export const askToolSchema = z.object({
    question: z.string().min(1, "question must not be empty"),
});
/** Zod raw shape passed directly to server.tool(). */
export const askZodShape = {
    question: z
        .string()
        .min(1, "question must not be empty")
        .describe("A natural-language question about the ingested GitHub repository's code or architecture."),
};
export const ASK_TOOL_DESCRIPTION = "Ask a question about a previously ingested GitHub repository. " +
    "Returns an answer with file citations so the agent can show exactly which source files were used.";
/**
 * Formats the sources list into a readable citations block.
 */
function formatSources(sources) {
    if (sources.length === 0)
        return "  (no source citations available)";
    return sources
        .map((s, idx) => `  [${idx + 1}] ${s.filename}  →  ${s.filepath}  (chunk ${s.chunkIndex})`)
        .join("\n");
}
/**
 * Handler for repomind_ask.
 * Validates input, calls the RAG query endpoint, and returns the answer
 * with a formatted citations block.
 */
export async function handleAsk(rawInput) {
    const parsed = askToolSchema.safeParse(rawInput);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(`Invalid input for repomind_ask:\n${issues}`);
    }
    const { question } = parsed.data;
    const result = await askQuestion(question);
    return [
        `## Answer`,
        ``,
        result.answer,
        ``,
        `## Sources`,
        ``,
        formatSources(result.sources),
    ].join("\n");
}
//# sourceMappingURL=tools.js.map