// Phase 3: get_context_job_result MCP tool. Returns either the slim envelope
// (default — token-efficient) or the raw graph-service payload (verbose).
// Three "happy" outcomes:
//   - cache hit on the MCP-local map (job was a backend cache hit at submit
//     time for signals/brief/context): return immediately, no HTTP roundtrip.
//   - succeeded job: fetch full row, run response mapper. For intelligence_records
//     the result lives in S3; the row carries a presigned resultUrl which this
//     tool fetches transparently. Other kinds carry inline result as before.
//   - still-running job: return { status: "pending" } so the agent knows to
//     poll get_context_job_status. We don't error — pending is a normal
//     state, not a failure.
// Failures and 410-expired rows surface as { status: "failed", error }.
//
// intelligence_records result download behavior:
//   - resultUrl is a presigned S3 GET (~15-min expiry, fresh each poll).
//   - On 403 (expired URL): re-poll job status once for a fresh URL, then retry.
//   - On download > MCP_RESULT_MAX_BYTES (50 MB): return a failed envelope with
//     the resultUrl so the caller can fetch out-of-band.
//   - succeeded records response with neither result nor resultUrl: fail-loud.

import { request } from "undici";
import type { GraphServiceClient, GraphServiceError as GraphServiceErrorType } from "../client";
import { mapJobResultToSlim, type SlimResult } from "../mapping/responseMapper";
import { getContextJobResultInputSchema } from "../schemas";
import type { GetJobResponse, JobKind } from "../types";
import { getCachedJobResult } from "./createContextJob";

// 50 MB — practical ceiling for stdio transport. Above this the buffered JSON
// would OOM the MCP process or stall the stdio pipe; return a failed envelope
// instead and surface the resultUrl for out-of-band retrieval.
const MCP_RESULT_MAX_BYTES = 50 * 1024 * 1024;

export type GetContextJobResultOutput =
  | { mode: "slim"; data: SlimResult }
  | { mode: "verbose"; data: VerboseEnvelope }
  | { mode: "pending"; data: PendingEnvelope }
  | { mode: "failed"; data: FailedEnvelope };

export type VerboseEnvelope = {
  jobId: string;
  kind: JobKind;
  status: "completed";
  /** For intelligence_records: the status envelope (resultUrl, resultBytes, resultExpiresAt, etc.)
   *  plus the downloaded S3 object under `downloadedResult` when it fits within the size cap.
   *  For other kinds: the raw job row result. */
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
  /** Present when the download was too large; use this URL to fetch out-of-band. */
  resultUrl?: string;
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
      statusEnvelope: undefined,
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
    case "succeeded": {
      // Records result always lives in S3 — fetch it. Other kinds carry inline result.
      if (job.kind === "intelligence_records") {
        return handleRecordsResult(job, client, jobId, Boolean(verbose));
      }
      return shapeOutput({
        jobId,
        kind: job.kind,
        result: job.result,
        verbose: Boolean(verbose),
        submittedAt: job.submittedAt,
        completedAt: job.completedAt,
        statusEnvelope: undefined,
      });
    }
  }
}

async function handleRecordsResult(
  job: SucceededJob,
  client: GraphServiceClient,
  jobId: string,
  verbose: boolean
): Promise<GetContextJobResultOutput> {
  if (!job.resultUrl) {
    // Spec: fail-loud on unknown shape (no result and no resultUrl).
    return {
      mode: "failed",
      data: {
        jobId,
        kind: job.kind,
        status: "failed",
        error: "unexpected job result shape: succeeded intelligence_records job has neither result nor resultUrl",
      },
    };
  }

  const fetchOutcome = await fetchResultUrl(job.resultUrl);

  if (fetchOutcome.type === "expired") {
    // Re-poll once for a fresh URL.
    let freshJob: FetchedJob;
    try {
      freshJob = await fetchJob(client, jobId);
    } catch {
      return {
        mode: "failed",
        data: { jobId, kind: job.kind, status: "failed", error: "result URL expired; re-poll for fresh URL also failed" },
      };
    }
    if (freshJob.status !== "succeeded" || freshJob.kind !== "intelligence_records" || !freshJob.resultUrl) {
      return {
        mode: "failed",
        data: { jobId, kind: job.kind, status: "failed", error: "result URL expired; re-poll did not return a fresh resultUrl" },
      };
    }
    const retryOutcome = await fetchResultUrl(freshJob.resultUrl);
    if (retryOutcome.type !== "ok") {
      const errorMsg =
        retryOutcome.type === "expired"
          ? "result URL still expired after re-poll"
          : retryOutcome.error;
      return {
        mode: "failed",
        data: {
          jobId,
          kind: job.kind,
          status: "failed",
          error: errorMsg,
          resultUrl: retryOutcome.type === "too_large" ? freshJob.resultUrl : undefined,
        },
      };
    }
    return shapeOutput({
      jobId,
      kind: job.kind,
      result: retryOutcome.parsed,
      verbose,
      submittedAt: freshJob.submittedAt,
      completedAt: freshJob.completedAt,
      statusEnvelope: buildStatusEnvelope(freshJob, retryOutcome.parsed),
    });
  }

  if (fetchOutcome.type !== "ok") {
    return {
      mode: "failed",
      data: {
        jobId,
        kind: job.kind,
        status: "failed",
        error: fetchOutcome.error,
        resultUrl: fetchOutcome.type === "too_large" ? job.resultUrl : undefined,
      },
    };
  }

  return shapeOutput({
    jobId,
    kind: job.kind,
    result: fetchOutcome.parsed,
    verbose,
    submittedAt: job.submittedAt,
    completedAt: job.completedAt,
    statusEnvelope: buildStatusEnvelope(job, fetchOutcome.parsed),
  });
}

type FetchUrlOutcome =
  | { type: "ok"; parsed: unknown }
  | { type: "expired" }
  | { type: "too_large"; error: string }
  | { type: "error"; error: string };

async function fetchResultUrl(url: string): Promise<FetchUrlOutcome> {
  let res: Awaited<ReturnType<typeof request>>;
  try {
    res = await request(url, { method: "GET" });
  } catch (err) {
    return { type: "error", error: `network error fetching resultUrl: ${String(err)}` };
  }

  if (res.statusCode === 403) {
    await res.body.dump();
    return { type: "expired" };
  }
  if (res.statusCode >= 400) {
    const text = await res.body.text().catch(() => "");
    return { type: "error", error: `S3 fetch failed with status ${res.statusCode}: ${text.slice(0, 200)}` };
  }

  // Stream with size cap: consume up to MCP_RESULT_MAX_BYTES + 1 to detect overflow.
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  let tooLarge = false;

  for await (const chunk of res.body) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    totalBytes += buf.byteLength;
    if (totalBytes > MCP_RESULT_MAX_BYTES) {
      tooLarge = true;
      // Drain the rest so the connection isn't held open.
      res.body.resume();
      break;
    }
    chunks.push(buf);
  }

  if (tooLarge) {
    return {
      type: "too_large",
      error: `result exceeds MCP transport limit (${MCP_RESULT_MAX_BYTES / (1024 * 1024)} MB); use resultUrl to fetch directly`,
    };
  }

  const text = Buffer.concat(chunks).toString("utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { type: "error", error: "resultUrl content is not valid JSON" };
  }
  return { type: "ok", parsed };
}

function buildStatusEnvelope(job: SucceededJob, downloadedResult: unknown): Record<string, unknown> {
  return {
    resultUrl: job.resultUrl,
    resultBytes: job.resultBytes,
    resultExpiresAt: job.resultExpiresAt,
    actualRecordsReturned: job.actualRecordsReturned,
    charged: job.charged,
    downloadedResult,
  };
}

// One variant per status so TS narrows cleanly via the switch above.
type SucceededJob = {
  status: "succeeded";
  kind: JobKind;
  submittedAt: number;
  completedAt?: number;
  result: unknown;
  resultUrl?: string;
  resultBytes?: number;
  resultExpiresAt?: number;
  actualRecordsReturned?: number;
  charged?: number;
};

type FetchedJob =
  | { status: "queued"; kind: JobKind; submittedAt: number }
  | { status: "running"; kind: JobKind; submittedAt: number }
  | { status: "failed"; kind: JobKind; submittedAt: number; error?: string }
  | SucceededJob
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
          resultUrl: job.resultUrl,
          resultBytes: job.resultBytes,
          resultExpiresAt: job.resultExpiresAt,
          actualRecordsReturned: job.actualRecordsReturned,
          charged: job.charged,
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

function isGraphServiceError(err: unknown): err is GraphServiceErrorType {
  return Boolean(err) && typeof err === "object" && (err as { name?: string }).name === "GraphServiceError";
}

function shapeOutput(args: {
  jobId: string;
  kind: JobKind;
  result: unknown;
  verbose: boolean;
  submittedAt: number;
  completedAt?: number;
  /** For records verbose mode: the full status envelope including downloadedResult. */
  statusEnvelope: Record<string, unknown> | undefined;
}): GetContextJobResultOutput {
  if (args.verbose) {
    return {
      mode: "verbose",
      data: {
        jobId: args.jobId,
        kind: args.kind,
        status: "completed",
        // For records: surface the status envelope (resultUrl + metadata + downloaded object).
        // For other kinds: the raw inline result as before.
        result: args.statusEnvelope ?? args.result,
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
