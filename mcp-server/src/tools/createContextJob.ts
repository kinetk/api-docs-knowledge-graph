// Phase 3: create_context_job MCP tool. Validates the agent's input, maps it
// to the backend job-kind contract, calls POST /intelligence/jobs, and returns
// { jobId, status }. On a backend cache hit (200 + inline result) the status is
// already "succeeded"; the agent's follow-up get_context_job_result re-reads
// the job from graph-service (whose status endpoint returns the result inline
// for cache hits), so we keep no MCP-local result cache — it would be wrong
// across stateless Lambda invocations anyway.

import { mapCreateContextJobInput } from "../mapping/inputMapper";
import { createContextJobInputSchema } from "../schemas";
import type { GraphJobsPort, JobKind } from "../types";

export type CreateContextJobOutput = {
  jobId: string;
  kind: JobKind;
  status: "queued" | "running" | "succeeded" | "failed";
  fromCache: boolean;
  statusUrl?: string;
};

export async function createContextJob(
  rawInput: unknown,
  client: GraphJobsPort
): Promise<CreateContextJobOutput> {
  const parsed = createContextJobInputSchema.parse(rawInput);
  const { kind, input } = mapCreateContextJobInput(parsed);
  const response = await client.submitJob(kind, input);

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
