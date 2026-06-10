#!/usr/bin/env node
// Phase 3: MCP server entry point. Connects three tools to the
// @modelcontextprotocol/sdk Server over stdio. Stdout is reserved for MCP
// protocol frames — anything we want to log goes to stderr (or the MCP
// client's protocol logger).

import { config as dotenvConfig } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

import { GraphServiceClient, GraphServiceError } from "./client";
import {
  createContextJobJsonSchema,
  getContextJobResultJsonSchema,
  getContextJobStatusJsonSchema,
} from "./schemas";
import { createContextJob } from "./tools/createContextJob";
import { getContextJobResult } from "./tools/getContextJobResult";
import { getContextJobStatus } from "./tools/getContextJobStatus";

dotenvConfig();

const TOOLS = [
  {
    name: "create_context_job",
    description:
      "Submit an async job to the KINETK Knowledge Graph, then poll get_context_job_status and fetch get_context_job_result. Pick `kind` by WHAT YOU WANT BACK:\n" +
      "- intelligence_records (needs `query` + `limit`): the matching CONTENT itself — ranked posts/videos with platform, tags, engagement, similarity. Use when you want the actual source material to read or cite.\n" +
      "- intelligence_signals (needs `query` — and ONLY `query`): SYNTHESIZED INSIGHT signals only — LLM-written arbitrage takeaways (overall, tag-focused, narrative-focused). No raw content. Use when you want the analytical 'so what' about a topic, not the underlying posts. All other parameters (time window, limits, platforms) are server-managed for this kind; any filters/options you pass are dropped before submit. Bounded time windows are coming soon.\n" +
      "- campaign_brief (needs `campaign` + `limit`): a finished, PERSISTED strategy brief WE generate for you (positioning, narratives to ride, recommended creators, platform strategy, content angles) plus its supporting context. Use when you want a ready-made written deliverable.\n" +
      "- llm_context (needs `campaign` + `limit`): the raw assembled campaign CONTEXT bundle (narratives, top tags, creators, representative content) with NO generated brief. Use when YOU will write the strategy yourself and just want the evidence to reason over — faster and cheaper than campaign_brief because it skips the brief-generation step.\n" +
      "For intelligence_records / campaign_brief / llm_context the API requires an explicit `limit` — how many records to retrieve, 100–50000. Jobs are billed per record, so there is NO default: you choose the spend (1000 is a sensible starting point). It also requires an explicit time window (7d | 30d | all); if you don't set filters.window this server defaults it to 'all'.\n" +
      "Rule of thumb: a `query` → records (content) or signals (insights); a `campaign` → llm_context (you synthesize) or campaign_brief (we synthesize).",
    inputSchema: createContextJobJsonSchema,
  },
  {
    name: "get_context_job_status",
    description:
      "Poll the status of a previously-submitted context job. Returns 'queued' | 'running' | 'completed' | 'failed' (no result payload). Cheap to call repeatedly.",
    inputSchema: getContextJobStatusJsonSchema,
  },
  {
    name: "get_context_job_result",
    description:
      "Fetch the result of a completed context job. Returns a slim, LLM-optimized envelope by default — shape varies by kind: ranked content items (intelligence_records), insight signal arrays (intelligence_signals), or the campaign context/brief (campaign_brief, llm_context). Set verbose=true for the full untouched graph-service payload (more tokens). Returns status='pending' if the job is still running.",
    inputSchema: getContextJobResultJsonSchema,
  },
];

async function main(): Promise<void> {
  const baseUrl = process.env.GRAPH_SERVICE_URL ?? "";
  const apiKey = process.env.GRAPH_SERVICE_API_KEY ?? "";
  const timeoutMs = parseTimeoutMs(process.env.GRAPH_SERVICE_TIMEOUT_MS);
  const client = new GraphServiceClient({ baseUrl, apiKey, timeoutMs });

  const server = new Server(
    { name: "kinetk-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "create_context_job": {
          const data = await createContextJob(args ?? {}, client);
          return toolResult(data);
        }
        case "get_context_job_status": {
          const data = await getContextJobStatus(args ?? {}, client);
          return toolResult(data);
        }
        case "get_context_job_result": {
          const data = await getContextJobResult(args ?? {}, client);
          // The wrapper has { mode, data } — agents only care about the data.
          return toolResult(data.data);
        }
        default:
          return toolError(`unknown tool: ${name}`);
      }
    } catch (err) {
      return toolError(formatError(err));
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Successful boot — log to stderr so MCP clients that capture child
  // stderr can surface it without corrupting the protocol stream.
  process.stderr.write(`kinetk-mcp-server connected (graph-service: ${baseUrl || "<unset>"})\n`);
}

function toolResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    const issues = err.errors.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`);
    return `invalid input:\n${issues.join("\n")}`;
  }
  if (err instanceof GraphServiceError) {
    return `graph-service ${err.statusCode}: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
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
