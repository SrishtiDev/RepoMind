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
export declare const INGEST_TOOL_NAME: "repomind_ingest";
export declare const ingestToolSchema: z.ZodObject<{
    repoUrl: z.ZodString;
}, "strip", z.ZodTypeAny, {
    repoUrl: string;
}, {
    repoUrl: string;
}>;
export type IngestInput = z.infer<typeof ingestToolSchema>;
/**
 * Zod raw shape passed directly to server.tool().
 * The SDK (v1.x) accepts ZodRawShape, not a plain JSON Schema object.
 */
export declare const ingestZodShape: {
    repoUrl: z.ZodString;
};
export declare const INGEST_TOOL_DESCRIPTION: string;
/**
 * Handler for repomind_ingest.
 * Validates the input, delegates to the HTTP client, and returns a
 * human-readable confirmation the calling agent can relay to the user.
 */
export declare function handleIngest(rawInput: unknown): Promise<string>;
export declare const ASK_TOOL_NAME: "repomind_ask";
export declare const askToolSchema: z.ZodObject<{
    question: z.ZodString;
}, "strip", z.ZodTypeAny, {
    question: string;
}, {
    question: string;
}>;
export type AskInput = z.infer<typeof askToolSchema>;
/** Zod raw shape passed directly to server.tool(). */
export declare const askZodShape: {
    question: z.ZodString;
};
export declare const ASK_TOOL_DESCRIPTION: string;
/**
 * Handler for repomind_ask.
 * Validates input, calls the RAG query endpoint, and returns the answer
 * with a formatted citations block.
 */
export declare function handleAsk(rawInput: unknown): Promise<string>;
//# sourceMappingURL=tools.d.ts.map