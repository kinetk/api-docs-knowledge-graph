// Phase 3: create_context_job MCP tool. Validates the agent's input, maps it
// to the backend job-kind contract, calls POST /intelligence/jobs, and
// returns { jobId, status }. When graph-service responds with an inline cache
// hit (200 + result), the result is stashed in an in-memory map so the
// follow-up get_context_job_result call doesn't refetch.

import type { GraphServiceClient } from "../client";
import { mapCreateContextJobInput } from "../mapping/inputMapper";
import { createContextJobInputSchema } from "../schemas";
import type { JobKind } from "../types";

export type CachedJobResult = {
  kind: JobKind;
  result: unknown;
  storedAt: number;
};

export type CreateContextJobOutput = {
  jobId: string;
  kind: JobKind;
  status: "queued" | "running" | "succeeded" | "failed";
  fromCache: boolean;
  statusUrl?: string;
};

// Bounded in-memory cache so a runaway client can't blow up MCP server memory.
// Process is short-lived (one stdio session per agent invocation); 100 entries
// is plenty.
const MAX_CACHED_RESULTS = 100;
const cachedResults = new Map<string, CachedJobResult>();

export function getCachedJobResult(jobId: string): CachedJobResult | undefined {
  return cachedResults.get(jobId);
}

function rememberCachedResult(jobId: string, kind: JobKind, result: unknown): void {
  if (cachedResults.size >= MAX_CACHED_RESULTS) {
    // Drop the oldest entry. Map iteration order is insertion order.
    const firstKey = cachedResults.keys().next().value;
    if (firstKey !== undefined) cachedResults.delete(firstKey);
  }
  cachedResults.set(jobId, { kind, result, storedAt: Date.now() });
}

export async function createContextJob(
  rawInput: unknown,
  client: GraphServiceClient
): Promise<CreateContextJobOutput> {
  const parsed = createContextJobInputSchema.parse(rawInput);
  const { kind, input } = mapCreateContextJobInput(parsed);
  const response = await client.submitJob(kind, input);

  // Cache hit: graph-service returned the result inline (200 path in api/jobs.ts).
  // Stash it so the agent's next get_context_job_result lands in O(1).
  //
  // intelligence_records cache-hits carry a download envelope (resultUrl) instead
  // of inline result. The presigned URL is valid for ~15 min and must NOT be
  // cached here — each poll mints a fresh URL. Let getContextJobResult re-poll
  // the job to obtain a valid URL at call time.
  if (response.status === "succeeded" && response.result !== undefined && kind !== "intelligence_records") {
    rememberCachedResult(response.jobId, kind, response.result);
  }

  return {
    jobId: response.jobId,
    kind,
    // Pass the backend status through verbatim — a failed submit must not be
    // reported as queued.
    status: response.status,
    fromCache: Boolean(response.fromCache),
    statusUrl: response.statusUrl,
  };
}
