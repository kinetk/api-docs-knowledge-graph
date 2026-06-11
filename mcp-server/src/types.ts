// Phase 3: MCP-internal types. Mirrors the public surface of graph-service
// just enough that the MCP can map between agent input and backend contracts
// without importing graph-service code (the MCP is a separate package).

// Mirrors graph-service/src/intelligence/jobs/types.ts.
export type JobKind =
  | "intelligence_records"
  | "intelligence_signals"
  | "campaign_brief"
  | "llm_context";

export const JOB_KINDS: readonly JobKind[] = [
  "intelligence_records",
  "intelligence_signals",
  "campaign_brief",
  "llm_context",
] as const;

// Backend-side status values. The MCP normalizes `succeeded` -> `completed`
// before returning to the agent so all four states read naturally.
export type BackendJobStatus = "queued" | "running" | "succeeded" | "failed";
export type McpJobStatus = "queued" | "running" | "completed" | "failed" | "pending";

// Large-result presigned-URL fields. When a succeeded result is too big to
// inline (>3.5 MB un-redacted), graph-service OMITS `result` and instead returns
// `resultStorage: "s3"` + a short-lived presigned `resultUrl` the client must
// GET to obtain the full JSON payload. Present on BOTH the submit cache-hit
// response and the status response. See graph-service/src/intelligence/api/
// types/jobs.ts (IJobSubmitResponse / IJobStatusResponse) + docs/api-reference.md.
export type LargeResultPointer = {
  resultStorage?: "s3";
  resultUrl?: string;
  resultBytes?: number;
  resultExpiresAt?: string;
};

// Shape of the JSON returned by `POST /intelligence/jobs`.
// 200: cache hit with inline result. 202: queued or running (dedup).
export type SubmitJobResponse = LargeResultPointer & {
  jobId: string;
  status: BackendJobStatus;
  dedup?: boolean;
  fromCache?: boolean;
  result?: unknown;
  statusUrl?: string;
};

// Shape of the JSON returned by `GET /intelligence/jobs/{id}`.
export type GetJobResponse = LargeResultPointer & {
  jobId: string;
  kind: JobKind;
  status: BackendJobStatus;
  submittedAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
};
