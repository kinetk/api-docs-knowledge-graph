#!/usr/bin/env node
// Phase 3: MCP server stdio entrypoint (local dev / desktop clients). Builds
// the HTTP GraphServiceClient from env, hands it to the shared createMcpServer
// core, and connects it over stdio. Stdout is reserved for MCP protocol frames
// — anything we log goes to stderr. The hosted (remote HTTP) path lives in
// graph-service and reuses the same createMcpServer core with an in-process
// client; see graph-service/src/intelligence/mcp/.

import { config as dotenvConfig } from "dotenv";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { GraphServiceClient } from "./client";
import { createMcpServer, formatError } from "./server";

dotenvConfig();

async function main(): Promise<void> {
  const baseUrl = process.env.GRAPH_SERVICE_URL ?? "";
  const apiKey = process.env.GRAPH_SERVICE_API_KEY ?? "";
  const timeoutMs = parseTimeoutMs(process.env.GRAPH_SERVICE_TIMEOUT_MS);
  const client = new GraphServiceClient({ baseUrl, apiKey, timeoutMs });

  const server = createMcpServer(client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Successful boot — log to stderr so MCP clients that capture child stderr
  // can surface it without corrupting the protocol stream.
  process.stderr.write(`kinetk-mcp-server connected (graph-service: ${baseUrl || "<unset>"})\n`);
}

function parseTimeoutMs(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

main().catch((err) => {
  process.stderr.write(`kinetk-mcp-server fatal: ${formatError(err)}\n`);
  process.exit(1);
});
