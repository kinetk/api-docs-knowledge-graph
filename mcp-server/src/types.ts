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

// Shape of the JSON returned by `POST /intelligence/jobs`.
// 200: cache hit with inline result. 202: queued or running (dedup).
export type SubmitJobResponse = {
  jobId: string;
  status: BackendJobStatus;
  /** Present on intelligence_records cache-hits so clients can route without a second call. */
  kind?: JobKind;
  dedup?: boolean;
  fromCache?: boolean;
  /** Inline result for signals/brief/context cache-hits. Never present for intelligence_records. */
  result?: unknown;
  statusUrl?: string;
  /** Credits charged for this request (cache-hit at the actual cached cost). */
  charged?: number;
  // Download envelope — present on every succeeded intelligence_records response
  // (submit cache-hit and status poll), and on brief/context/admin-signals
  // responses when the payload would exceed the Lambda response limit.
  /** Presigned S3 URL to download the job result JSON (~15-min expiry, regenerated each poll). */
  resultUrl?: string;
  /** Byte length of the S3 object that resultUrl points to. */
  resultBytes?: number;
  /** Unix timestamp (seconds) at which resultUrl expires. */
  resultExpiresAt?: number;
};

// Shape of the JSON returned by `GET /intelligence/jobs/{id}`.
export type GetJobResponse = {
  jobId: string;
  kind: JobKind;
  status: BackendJobStatus;
  submittedAt: number;
  startedAt?: number;
  completedAt?: number;
  /** Inline result for signals/brief/context succeeded jobs. Never present for intelligence_records. */
  result?: unknown;
  error?: string;
  /** Credits charged once the job settled (absent on unbilled or in-flight jobs). */
  charged?: number;
  /** Number of records returned by a succeeded intelligence_records job. */
  actualRecordsReturned?: number;
  // Download envelope — present on every succeeded intelligence_records response,
  // and on brief/context/admin-signals responses when the payload exceeds 5 MB.
  /** Presigned S3 URL to download the job result JSON (~15-min expiry, regenerated each poll). */
  resultUrl?: string;
  /** Byte length of the S3 object that resultUrl points to. */
  resultBytes?: number;
  /** Unix timestamp (seconds) at which resultUrl expires. */
  resultExpiresAt?: number;
};
