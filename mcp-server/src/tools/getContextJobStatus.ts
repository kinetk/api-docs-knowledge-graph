// Phase 3: get_context_job_status MCP tool. Reads the row from graph-service
// and returns just the status fields — no result payload. Keeping result off
// the polling path avoids accidentally pulling a 300 KB blob across stdio
// every poll cycle.

import type { GraphServiceClient } from "../client";
import { getContextJobStatusInputSchema } from "../schemas";
import type { JobKind, McpJobStatus } from "../types";

export type GetContextJobStatusOutput = {
  jobId: string;
  kind: JobKind;
  status: McpJobStatus;
  submittedAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
};

export async function getContextJobStatus(
  rawInput: unknown,
  client: GraphServiceClient
): Promise<GetContextJobStatusOutput> {
  const { jobId } = getContextJobStatusInputSchema.parse(rawInput);
  const job = await client.getJob(jobId);
  return {
    jobId: job.jobId,
    kind: job.kind,
    status: normalizeStatus(job.status),
    submittedAt: job.submittedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
  };
}

function normalizeStatus(status: "queued" | "running" | "succeeded" | "failed"): McpJobStatus {
  return status === "succeeded" ? "completed" : status;
}
