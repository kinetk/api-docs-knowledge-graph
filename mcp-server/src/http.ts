// Phase 3: remote (HTTP) transport for the MCP core. Handles ONE stateless
// Streamable HTTP request and returns a Web `Response`. Kept here (not in the
// graph-service Lambda) so every @modelcontextprotocol/sdk import lives in this
// package, which already resolves the SDK; the co-located Lambda only imports
// this compiled helper plus the GraphJobsPort it injects.
//
// Stateless: a fresh Server + transport per request (sessionIdGenerator
// undefined → no session store, each POST self-contained — exactly the Lambda
// model). enableJsonResponse → a single buffered JSON-RPC reply instead of an
// SSE stream, which is what a buffered API Gateway proxy integration needs.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createMcpServer, type CreateMcpServerOptions } from "./server";
import type { GraphJobsPort } from "./types";

export type HandleMcpHttpOptions = CreateMcpServerOptions & {
  // Pre-parsed JSON-RPC body. Pass this when the caller already has the body
  // string (e.g. an API Gateway proxy event) so the transport doesn't re-read
  // the Request stream.
  parsedBody?: unknown;
};

export async function handleMcpHttpRequest(
  request: Request,
  client: GraphJobsPort,
  options: HandleMcpHttpOptions = {}
): Promise<Response> {
  const { parsedBody, ...serverOptions } = options;
  const server = createMcpServer(client, serverOptions);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(
      request,
      parsedBody !== undefined ? { parsedBody } : undefined
    );
  } finally {
    // One server+transport per request — tear both down so nothing leaks
    // across stateless invocations.
    await transport.close();
    await server.close();
  }
}
