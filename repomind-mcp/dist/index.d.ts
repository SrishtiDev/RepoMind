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
export {};
//# sourceMappingURL=index.d.ts.map