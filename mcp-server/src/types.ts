// Phase 3: MCP-internal types. Mirrors the public surface of graph-service
// just enough that the MCP can map between agent input and backend contracts
// without importing graph-service code (the MCP is a separate package).

// CANONICAL job kinds — mirrors graph-service/src/intelligence/jobs/types.ts after
// the records/insights rename. The MCP exposes ONLY these two (campaign was removed —
// it is also rejected on the public route now). The backend STORES + RETURNS these and
// accepts them on submit, so every kind the MCP receives back (GetJobResponse.kind)
// and every kind it submits is one of these. NOTE: the backend DROPPED the old graph_*
// aliases — the MCP must submit these names, never graph_*.
export type JobKind = "records" | "insights";

export const JOB_KINDS: readonly JobKind[] = ["records", "insights"] as const;

// What an AGENT may pass for `kind`: the 2 canonical names PLUS legacy aliases — the
// old graph_* names and the original intelligence_* names — so existing prompts keep
// working. The MCP canonicalizes locally (see JOB_KIND_ALIASES) before submitting, so
// the rest of the MCP, and the backend, only ever see the 2 canonical kinds.
export type JobKindInput =
  | JobKind
  | "graph_records"
  | "graph_discovery"
  | "intelligence_records"
  | "intelligence_signals";

export const JOB_KIND_INPUTS: readonly JobKindInput[] = [
  "records",
  "insights",
  "graph_records",
  "graph_discovery",
  "intelligence_records",
  "intelligence_signals",
] as const;

// alias/intent → canonical kind. Every accepted name maps to records or insights.
export const JOB_KIND_ALIASES: Record<JobKindInput, { kind: JobKind }> = {
  records: { kind: "records" },
  graph_records: { kind: "records" },
  intelligence_records: { kind: "records" },
  insights: { kind: "insights" },
  graph_discovery: { kind: "insights" },
  intelligence_signals: { kind: "insights" },
};

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

// Typed error raised when graph-service (or the presigned S3 result download)
// returns a non-2xx. Lives here — not in client.ts — so the transport-agnostic
// MCP core (server.ts) and the in-process adapter can do `instanceof` checks
// without importing the undici-backed HTTP client.
export class GraphServiceError extends Error {
  readonly statusCode: number;
  readonly body: unknown;
  constructor(statusCode: number, message: string, body: unknown) {
    super(message);
    this.name = "GraphServiceError";
    this.statusCode = statusCode;
    this.body = body;
  }
}

// The seam the MCP core depends on, instead of a concrete HTTP client. Two
// implementations: GraphServiceClient (HTTP, used by the stdio entrypoint) and
// the in-process adapter inside graph-service (used by the co-located Lambda,
// where each method calls the existing job handlers directly so the
// gateway-validated apiKeyId — and thus per-tenant billing — is preserved).
export interface GraphJobsPort {
  submitJob(kind: JobKind, input: unknown): Promise<SubmitJobResponse>;
  getJob(jobId: string): Promise<GetJobResponse>;
  // Download a large (>3.5 MB) result from the presigned S3 URL graph-service
  // hands back in place of an inline result.
  fetchResultUrl(resultUrl: string): Promise<unknown>;
}
