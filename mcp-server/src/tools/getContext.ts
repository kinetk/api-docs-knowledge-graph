// Phase 3: get_context MCP tool — the synchronous, one-shot front door.
// Submits a context job and then polls graph-service itself (up to a ~25s
// budget that stays under the API Gateway / Lambda 29s cap) so the agent gets
// the result back in a SINGLE tool call for the common 5-20s case, instead of
// the create -> poll status -> get result round-trip dance. If the job is
// still running when the budget runs out, it returns a { status: "pending",
// jobId } handoff so the agent can fall back to get_context_job_status /
// get_context_job_result for the long tail (window:all, expandQuery, large
// insights pulls that run toward the worker's 15-min budget).
//
// Same input as create_context_job, plus optional `verbose`. The poll loop is
// transport-agnostic (it only uses GraphJobsPort): over HTTP it re-GETs the
// job each tick; co-located in graph-service the ticks are in-process.

import { mapCreateContextJobInput } from "../mapping/inputMapper";
import { createContextJobInputSchema } from "../schemas";
import type { GraphJobsPort, JobKind } from "../types";
import { getContextJobResult, type GetContextJobResultOutput } from "./getContextJobResult";

// Wait budget and cadence. The budget is held below the 29s API Gateway cap so
// the handler returns the pending handoff cleanly rather than being killed
// mid-wait. Overridable for tests.
export type GetContextOptions = {
  budgetMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

const DEFAULT_BUDGET_MS = 24_000;
const DEFAULT_POLL_INTERVAL_MS = 1_500;

export async function getContext(
  rawInput: unknown,
  client: GraphJobsPort,
  opts: GetContextOptions = {}
): Promise<GetContextJobResultOutput> {
  const { verbose, job } = splitVerbose(rawInput);
  // Validate + map the job exactly like create_context_job so a malformed
  // request fails fast with the same readable errors.
  const parsed = createContextJobInputSchema.parse(job);
  const { kind, input } = mapCreateContextJobInput(parsed);

  const submit = await client.submitJob(kind, input);
  const jobId = submit.jobId;

  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? defaultSleep;
  const budgetMs = opts.budgetMs ?? DEFAULT_BUDGET_MS;
  const pollIntervalMs = opts.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = now() + budgetMs;

  // Poll by reusing get_context_job_result — it already handles succeeded,
  // failed, expired, large-result (presigned S3) and pending shaping. A
  // backend cache hit lands on the first tick (the status endpoint returns the
  // result inline), so repeat queries resolve immediately.
  for (;;) {
    const res = await getContextJobResult({ jobId, verbose }, client);
    if (res.mode !== "pending") return res;
    if (now() >= deadline) {
      return {
        mode: "pending",
        data: {
          jobId,
          kind,
          status: "pending",
          message:
            "still running after the synchronous wait budget — poll get_context_job_status with this jobId, " +
            "then fetch get_context_job_result once it reports completed.",
        },
      };
    }
    await sleep(pollIntervalMs);
  }
}

// Pull `verbose` off the top level so the rest can be validated by the strict
// create_context_job union (which would otherwise reject the extra key).
function splitVerbose(raw: unknown): { verbose: boolean; job: unknown } {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const { verbose, ...rest } = raw as Record<string, unknown>;
    return { verbose: Boolean(verbose), job: rest };
  }
  return { verbose: false, job: raw };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Re-exported so callers can reference the job-kind type without reaching into
// types.ts directly.
export type { JobKind };
