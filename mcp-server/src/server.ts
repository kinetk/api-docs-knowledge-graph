// Phase 3: transport-agnostic MCP core. Builds the @modelcontextprotocol/sdk
// Server with the four tools and their request handlers, parameterised on a
// GraphJobsPort so the SAME core serves both transports:
//   - the stdio entrypoint (index.ts) injects the HTTP GraphServiceClient;
//   - the co-located Lambda in graph-service injects an in-process adapter so
//     the gateway-validated apiKeyId (→ per-tenant billing) is preserved.
// No transport, env, or process concerns live here — connect() is the caller's
// job.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ZodError } from "zod";

import {
  createContextJobJsonSchema,
  getContextJobResultJsonSchema,
  getContextJobStatusJsonSchema,
  getContextJsonSchema,
} from "./schemas";
import { createContextJob } from "./tools/createContextJob";
import { getContext, type GetContextOptions } from "./tools/getContext";
import { getContextJobResult } from "./tools/getContextJobResult";
import { getContextJobStatus } from "./tools/getContextJobStatus";
import { GraphServiceError, type GraphJobsPort } from "./types";

const SERVER_NAME = "kinetk-mcp-server";
const SERVER_VERSION = "0.1.0";

export const TOOLS = [
  {
    name: "get_context",
    description:
      "PREFERRED one-shot tool: submit a KINETK Knowledge Graph job AND wait for the result, returned inline in a single call. Use this by default for interactive queries. Both kinds are keyed by `query` and require `window` + `limit`. Pick `kind` by WHAT YOU WANT BACK (prefer the short names; the graph_*/intelligence_* names are accepted aliases):\n" +
      "- records (aliases graph_records/intelligence_records; needs `query` + `window` + `limit`): the matching CONTENT itself — ranked posts/videos with platform, tags, engagement, similarity, each carrying enrichment (themes/tone/novelty). Use when you want the actual source material to read or cite.\n" +
      "- insights (aliases graph_discovery/intelligence_signals; needs `query` + `window` + `limit`): SYNTHESIZED INTELLIGENCE — narratives with trajectory/lifecycle + sentiment, per-tag/theme signals with white-space, all STRUCTURED. Add `includeSignals:true` to also get the written takeaway lines — but then you MUST set window:'all' and limit:3000. Use when you want the analytical 'so what' about a topic.\n" +
      "Rule of thumb: want the actual posts/videos → records; want the analytical 'so what' → insights. " +
      "Keep `limit` modest here (e.g. 200-1000) — the result is returned inline, so a large limit means a large payload (except insights+includeSignals, which requires limit:3000). " +
      "If the job is still running after the wait budget, this returns { status: 'pending', jobId }; then poll get_context_job_status and fetch get_context_job_result with that jobId.",
    inputSchema: getContextJsonSchema,
  },
  {
    name: "create_context_job",
    description:
      "Async alternative to get_context: submit a job and return immediately with a jobId, WITHOUT waiting. Use this only for jobs you expect to be slow (window:all, expandQuery, large insights pulls) or when you want to fire-and-forget. Otherwise prefer get_context. Pick `kind` the same way as get_context. " +
      "Returns { jobId, kind, status, fromCache }. Status vocabulary: this tool reports 'queued' | 'running' | 'succeeded' | 'failed'; get_context_job_status reports a finished job as 'completed' — treat 'succeeded' and 'completed' as the same terminal state. After submitting, poll get_context_job_status, then fetch get_context_job_result.",
    inputSchema: createContextJobJsonSchema,
  },
  {
    name: "get_context_job_status",
    description:
      "Poll the status of a job submitted via create_context_job. Returns 'queued' | 'running' | 'completed' | 'failed' (no result payload). Cheap to call repeatedly. Jobs typically finish in ~5-20s; poll every ~3s, up to ~2 minutes (~30 polls), before treating the job as stuck. ('pending' from get_context_job_result is the same as queued/running — keep polling, it is not a failure.)",
    inputSchema: getContextJobStatusJsonSchema,
  },
  {
    name: "get_context_job_result",
    description:
      "Fetch the result of a completed job submitted via create_context_job. Returns a slim, LLM-optimized envelope by default — shape varies by kind. Set verbose=true for the full untouched graph-service payload (more tokens). Returns status='pending' if the job is still running (normal — keep polling get_context_job_status, not a failure).",
    inputSchema: getContextJobResultJsonSchema,
  },
];

export type CreateMcpServerOptions = {
  // Tuning knobs for the synchronous get_context poll loop. Defaults are fine
  // for the HTTP path; the co-located Lambda can widen the budget toward its
  // 29s ceiling.
  getContext?: GetContextOptions;
};

export function createMcpServer(client: GraphJobsPort, options: CreateMcpServerOptions = {}): Server {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      switch (name) {
        case "get_context": {
          const data = await getContext(args ?? {}, client, options.getContext);
          // Same { mode, data } wrapper as get_context_job_result — agents only
          // care about the data.
          return toolResult(data.data);
        }
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
          return toolResult(data.data);
        }
        default:
          return toolError(`unknown tool: ${name}`);
      }
    } catch (err) {
      return toolError(formatError(err));
    }
  });

  return server;
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

export function formatError(err: unknown): string {
  if (err instanceof ZodError) {
    const issues = err.errors.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`);
    return `invalid input:\n${issues.join("\n")}`;
  }
  if (err instanceof GraphServiceError) {
    return `graph-service ${err.statusCode}: ${err.message}${graphServiceErrorDetail(err)}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

// Surface the machine-readable, actionable detail the backend attaches to its
// 402 insufficient_credits body (how many credits are needed vs available, and
// the max affordable `limit` for the requested window) so the agent can
// self-correct instead of just seeing a status line. Validation 400s already
// carry a descriptive message in `err.message` (the backend's flat
// `{ error: "<message>" }` body, e.g. "window is required and must be one of
// 7d, 30d, all"), so there's nothing extra to extract for those. Returns ""
// when there's no enrichment to add.
function graphServiceErrorDetail(err: GraphServiceError): string {
  const body = err.body;
  if (!body || typeof body !== "object") return "";
  const b = body as Record<string, unknown>;
  if (b.error !== "insufficient_credits") return "";
  const parts: string[] = [];
  if (typeof b.credits_required === "number" && typeof b.credits_available === "number") {
    parts.push(`needs ${b.credits_required} credits, have ${b.credits_available}`);
  }
  const rec = b.recommendations;
  if (rec && typeof rec === "object") {
    const r = rec as Record<string, unknown>;
    if (typeof r.maxLimitForWindow === "number") {
      parts.push(`retry with limit <= ${r.maxLimitForWindow} for this window`);
    }
    if (typeof r.topUpUrl === "string") {
      parts.push(`top up at ${r.topUpUrl}`);
    }
  }
  return parts.length > 0 ? ` (${parts.join("; ")})` : "";
}
