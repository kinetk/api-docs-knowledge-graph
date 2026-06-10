// Phase 3: get_context_job_result MCP tool. Returns either the slim envelope
// (default — token-efficient) or the raw graph-service payload (verbose).
// Three "happy" outcomes:
//   - cache hit on the MCP-local map (job was a backend cache hit at submit
//     time): return immediately, no HTTP roundtrip.
//   - succeeded job: fetch full row, run response mapper.
//   - still-running job: return { status: "pending" } so the agent knows to
//     poll get_context_job_status. We don't error — pending is a normal
//     state, not a failure.
// Failures and 410-expired rows surface as { status: "failed", error }.

import type { GraphServiceClient, GraphServiceError } from "../client";
import { mapJobResultToSlim, type SlimResult } from "../mapping/responseMapper";
import { getContextJobResultInputSchema } from "../schemas";
import type { JobKind } from "../types";
import { getCachedJobResult } from "./createContextJob";

export type GetContextJobResultOutput =
  | { mode: "slim"; data: SlimResult }
  | { mode: "verbose"; data: VerboseEnvelope }
  | { mode: "pending"; data: PendingEnvelope }
  | { mode: "failed"; data: FailedEnvelope };

export type VerboseEnvelope = {
  jobId: string;
  kind: JobKind;
  status: "completed";
  result: unknown;
  submittedAt: number;
  completedAt?: number;
};

export type PendingEnvelope = {
  jobId: string;
  kind: JobKind;
  status: "pending";
  message: string;
};

export type FailedEnvelope = {
  jobId: string;
  // "unknown" on the expired (410) path, where graph-service no longer
  // reports which kind the job was.
  kind: JobKind | "unknown";
  status: "failed";
  error: string;
};

export async function getContextJobResult(
  rawInput: unknown,
  client: GraphServiceClient
): Promise<GetContextJobResultOutput> {
  const { jobId, verbose } = getContextJobResultInputSchema.parse(rawInput);

  const cached = getCachedJobResult(jobId);
  if (cached) {
    return shapeOutput({
      jobId,
      kind: cached.kind,
      result: cached.result,
      verbose: Boolean(verbose),
      submittedAt: cached.storedAt,
      completedAt: cached.storedAt,
    });
  }

  const job = await fetchJob(client, jobId);
  switch (job.status) {
    case "expired":
      return {
        mode: "failed",
        data: { jobId, kind: job.kind, status: "failed", error: "job result expired" },
      };
    case "queued":
    case "running":
      return {
        mode: "pending",
        data: {
          jobId,
          kind: job.kind,
          status: "pending",
          message: "job is not complete yet — call get_context_job_status to poll",
        },
      };
    case "failed":
      return {
        mode: "failed",
        data: {
          jobId,
          kind: job.kind,
          status: "failed",
          error: job.error ?? "job failed without an error message",
        },
      };
    case "succeeded":
      return shapeOutput({
        jobId,
        kind: job.kind,
        result: job.result,
        verbose: Boolean(verbose),
        submittedAt: job.submittedAt,
        completedAt: job.completedAt,
      });
  }
}

// One variant per status so TS narrows cleanly via the switch above.
type FetchedJob =
  | { status: "queued"; kind: JobKind; submittedAt: number }
  | { status: "running"; kind: JobKind; submittedAt: number }
  | { status: "failed"; kind: JobKind; submittedAt: number; error?: string }
  | { status: "succeeded"; kind: JobKind; submittedAt: number; completedAt?: number; result: unknown }
  | { status: "expired"; kind: JobKind | "unknown" };

async function fetchJob(client: GraphServiceClient, jobId: string): Promise<FetchedJob> {
  try {
    const job = await client.getJob(jobId);
    switch (job.status) {
      case "succeeded":
        return {
          status: "succeeded",
          kind: job.kind,
          submittedAt: job.submittedAt,
          completedAt: job.completedAt,
          result: job.result,
        };
      case "failed":
        return { status: "failed", kind: job.kind, submittedAt: job.submittedAt, error: job.error };
      case "queued":
        return { status: "queued", kind: job.kind, submittedAt: job.submittedAt };
      case "running":
        return { status: "running", kind: job.kind, submittedAt: job.submittedAt };
    }
  } catch (err) {
    // 410 from graph-service means TTL expired. We translate that into a
    // failure shape rather than letting the agent see a raw HTTP error.
    if (isGraphServiceError(err) && err.statusCode === 410) {
      // graph-service no longer reports the kind once the result has
      // expired, so say so rather than guessing one.
      return { status: "expired", kind: "unknown" };
    }
    throw err;
  }
}

function isGraphServiceError(err: unknown): err is GraphServiceError {
  return Boolean(err) && typeof err === "object" && (err as { name?: string }).name === "GraphServiceError";
}

function shapeOutput(args: {
  jobId: string;
  kind: JobKind;
  result: unknown;
  verbose: boolean;
  submittedAt: number;
  completedAt?: number;
}): GetContextJobResultOutput {
  if (args.verbose) {
    return {
      mode: "verbose",
      data: {
        jobId: args.jobId,
        kind: args.kind,
        status: "completed",
        result: args.result,
        submittedAt: args.submittedAt,
        completedAt: args.completedAt,
      },
    };
  }
  return {
    mode: "slim",
    data: mapJobResultToSlim(args.result, { jobId: args.jobId, kind: args.kind }),
  };
}
