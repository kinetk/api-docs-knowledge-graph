import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  InsightsJobState,
  InsightsResult,
  Narrative,
  WhitespaceTag,
} from "@/lib/types";

/**
 * Server-side KINETK access for the Content Narratives live refresh.
 *
 * The browser can't call KINETK directly without leaking the key, so requests
 * are proxied through the `/api/insights/*` route handlers, which authenticate
 * with the `x-api-key` header. No model is involved; the summaries come straight
 * from KINETK's structured `insights`.
 *
 * The work is split into two fast steps so no single HTTP request is ever held
 * open for the length of a job:
 *
 *   - `startInsightsJob` submits with `create_context_job` and returns a `jobId`
 *     immediately (no inline wait).
 *   - `pollInsightsJob` does ONE status check (plus a result fetch once done).
 *
 * The browser drives the poll loop across many short requests. This mirrors the
 * async-job pattern the KINETK demo app uses and avoids the gateway/function
 * timeouts that a minutes-long request would hit.
 */

// KINETK's programmatic MCP endpoint. Auth is the `x-api-key` header (below);
// /graph/connect is the OAuth endpoint for Claude Desktop and won't work here.
const MCP_URL = process.env.KINETK_MCP_URL ?? "https://api.kinetk.ai/graph/mcp";

// Insight pull parameters: trailing 30 days, structured output (no prose), and
// the minimum record count the graph accepts.
const WINDOW = "30d";
const LIMIT = 500;
const MAX_NARRATIVES = 4;
const MAX_WHITESPACE = 5;

/** Open an MCP connection to KINETK, run `fn`, and always close it. */
async function withClient<T>(
  apiKey: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ name: "social-intelligence-dashboard", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { "x-api-key": apiKey } },
  });

  await client.connect(transport);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

/** Submit an insights job and return its `jobId` immediately (no inline wait). */
export async function startInsightsJob(
  query: string,
  apiKey: string,
): Promise<string> {
  return withClient(apiKey, async (client) => {
    const payload = readToolPayload(
      await client.callTool({
        name: "create_context_job",
        arguments: {
          kind: "insights",
          query,
          filters: { window: WINDOW },
          limit: LIMIT,
        },
      }),
    );

    const { jobId } = payload;
    if (typeof jobId !== "string" || jobId.length === 0) {
      throw new Error("KINETK did not return a jobId");
    }
    return jobId;
  });
}

/**
 * Poll a job once. Checks `get_context_job_status`; when the job is finished it
 * fetches and shapes the result. Returns `running` while the job is in flight.
 */
export async function pollInsightsJob(
  jobId: string,
  apiKey: string,
): Promise<InsightsJobState> {
  return withClient(apiKey, async (client) => {
    const status = readToolPayload(
      await client.callTool({
        name: "get_context_job_status",
        arguments: { jobId },
      }),
    );

    // `create_context_job` reports a finished job as "succeeded"; the status
    // tool reports it as "completed" - treat both as the same terminal state.
    const state = status.status;
    if (state === "failed") return { status: "failed" };
    if (state !== "completed" && state !== "succeeded") {
      return { status: "running" };
    }

    const done = readToolPayload(
      await client.callTool({
        name: "get_context_job_result",
        arguments: { jobId, verbose: true },
      }),
    );
    // A result fetch can still race ahead of the status flip and report pending.
    if (done.status === "pending") return { status: "running" };

    return { status: "succeeded", result: shapeInsights(unwrapResult(done)) };
  });
}

/** Map KINETK's structured insights into the dashboard's `InsightsResult`. */
function shapeInsights(result: Record<string, unknown>): InsightsResult {
  const narratives = asArray(result.narratives)
    .map(toNarrative)
    .filter((n): n is Narrative => n !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_NARRATIVES);

  const whitespace = asArray(result.tagSignals)
    .map(toRankedTag)
    .filter((t): t is RankedTag => t !== null)
    // Rank by whitespaceScore - KINETK's "high premium, low saturation" measure,
    // which matches the section heading - but display the engagement premium.
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_WHITESPACE)
    .map(({ tag, premiumPct }) => ({ tag, premiumPct }));

  if (narratives.length === 0 || whitespace.length === 0) {
    throw new Error("KINETK insights had no narratives or tag signals");
  }
  return { narratives, whitespace };
}

type RankedTag = WhitespaceTag & { score: number };

function toNarrative(value: unknown): Narrative | null {
  if (typeof value !== "object" || value === null) return null;
  const { label, summary, contentCount } = value as Record<string, unknown>;
  if (typeof label !== "string" || typeof summary !== "string") return null;
  return { label, description: summary, count: Number(contentCount) || 0 };
}

function toRankedTag(value: unknown): RankedTag | null {
  if (typeof value !== "object" || value === null) return null;
  const { tag, engagementPremiumPct, whitespaceScore } = value as Record<
    string,
    unknown
  >;
  if (typeof tag !== "string") return null;
  return {
    tag,
    premiumPct: Math.round((Number(engagementPremiumPct) || 0) * 10) / 10,
    score: Number(whitespaceScore) || 0,
  };
}

/** The graph wraps its payload as `{ status, jobId, result }`; unwrap to `result`. */
function unwrapResult(payload: Record<string, unknown>): Record<string, unknown> {
  const result = payload.result;
  if (result && typeof result === "object") {
    return result as Record<string, unknown>;
  }
  return payload;
}

/** Read an MCP tool result's JSON, from structured content or the text block. */
function readToolPayload(toolResult: unknown): Record<string, unknown> {
  const { content, structuredContent } = (toolResult ?? {}) as {
    content?: unknown;
    structuredContent?: unknown;
  };
  if (structuredContent && typeof structuredContent === "object") {
    return structuredContent as Record<string, unknown>;
  }
  for (const block of Array.isArray(content) ? content : []) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "text"
    ) {
      const { text } = block as { text?: unknown };
      if (typeof text === "string") {
        return JSON.parse(text) as Record<string, unknown>;
      }
    }
  }
  throw new Error("KINETK returned no readable content");
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
