#!/usr/bin/env node
/**
 * index.ts
 *
 * MCP server entry point for RepoMind.
 *
 * Lifecycle:
 *   1. Instantiate McpServer with name/version metadata.
 *   2. Register the two tool handlers (ingest, ask).
 *   3. Connect to StdioServerTransport — stdout carries protocol messages,
 *      stderr is the only safe channel for diagnostics.
 *
 * IMPORTANT: Never write to process.stdout directly. The MCP SDK owns stdout
 * for its JSON-RPC framing. All logging must go to process.stderr.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { INGEST_TOOL_NAME, INGEST_TOOL_DESCRIPTION, ingestZodShape, handleIngest, ASK_TOOL_NAME, ASK_TOOL_DESCRIPTION, askZodShape, handleAsk, } from "./tools.js";
// ── Server instantiation ──────────────────────────────────────────────────────
const server = new McpServer({
    name: "repomind",
    version: "1.0.0",
});
// ── Tool registrations ────────────────────────────────────────────────────────
// server.tool() overload (name, description, ZodRawShape, handler)
server.tool(INGEST_TOOL_NAME, INGEST_TOOL_DESCRIPTION, ingestZodShape, async ({ repoUrl }) => {
    try {
        const text = await handleIngest({ repoUrl });
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[repomind_ingest] Error: ${message}\n`);
        return {
            content: [{ type: "text", text: `❌ ${message}` }],
            isError: true,
        };
    }
});
server.tool(ASK_TOOL_NAME, ASK_TOOL_DESCRIPTION, askZodShape, async ({ question }) => {
    try {
        const text = await handleAsk({ question });
        return { content: [{ type: "text", text }] };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(`[repomind_ask] Error: ${message}\n`);
        return {
            content: [{ type: "text", text: `❌ ${message}` }],
            isError: true,
        };
    }
});
// ── Stdio transport ───────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
// Uncaught errors must never crash silently — log to stderr and exit cleanly
// so the IDE knows the server died (vs. hanging).
process.on("uncaughtException", (err) => {
    process.stderr.write(`[repomind-mcp] Uncaught exception: ${err.message}\n`);
    process.stderr.write(err.stack ?? "");
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    process.stderr.write(`[repomind-mcp] Unhandled rejection: ${message}\n`);
    process.exit(1);
});
// Connect — this call is asynchronous and keeps the process alive via the
// stdio transport event loop until the client disconnects.
server.connect(transport).catch((err) => {
    process.stderr.write(`[repomind-mcp] Failed to connect transport: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map