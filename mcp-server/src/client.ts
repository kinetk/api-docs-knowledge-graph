// Phase 3: HTTP client for the graph-service async-job API. Two methods:
// `submitJob` (POST /intelligence/jobs) and `getJob` (GET /intelligence/jobs/
// {id}). Uses undici because Node 20's global fetch doesn't expose a
// per-request connect/read timeout cleanly. Retries on 5xx + network errors
// with capped exponential backoff; 4xx surfaces immediately as a typed error.

import { request } from "undici";
import type { GetJobResponse, GraphJobsPort, JobKind, SubmitJobResponse } from "./types";
import { GraphServiceError } from "./types";

// Re-exported for backwards compatibility — the class now lives in types.ts so
// the transport-agnostic core can use it without importing undici.
export { GraphServiceError };

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

export type GraphServiceClientOptions = {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
};

export class GraphServiceClient implements GraphJobsPort {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: GraphServiceClientOptions) {
    if (!options.baseUrl) throw new Error("GRAPH_SERVICE_URL is required");
    if (!options.apiKey) throw new Error("GRAPH_SERVICE_API_KEY is required");
    // Trim trailing slash so path joins cleanly.
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async submitJob(kind: JobKind, input: unknown): Promise<SubmitJobResponse> {
    const body = JSON.stringify({ kind, input });
    const json = await this.requestWithRetry("POST", "/intelligence/jobs", body);
    return json as SubmitJobResponse;
  }

  async getJob(jobId: string): Promise<GetJobResponse> {
    const json = await this.requestWithRetry("GET", `/intelligence/jobs/${encodeURIComponent(jobId)}`);
    return json as GetJobResponse;
  }

  // Fetch a large result from the presigned S3 URL graph-service hands back when
  // the payload is too big to inline (>3.5 MB). This is a direct GET to S3 — NOT
  // a graph-service path — so it carries no API key and uses an absolute URL.
  // Returns the parsed JSON body (the full result payload). Throws a typed
  // GraphServiceError on a non-2xx (e.g. an expired presigned URL → 403) so the
  // caller can surface a clear, actionable message instead of crashing.
  async fetchResultUrl(resultUrl: string): Promise<unknown> {
    let statusCode: number;
    let text: string;
    try {
      const res = await request(resultUrl, {
        method: "GET",
        bodyTimeout: this.timeoutMs,
        headersTimeout: this.timeoutMs,
      });
      statusCode = res.statusCode;
      text = await res.body.text();
    } catch (err) {
      throw new GraphServiceError(
        0,
        `failed to download large result from presigned URL: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
      );
    }
    if (statusCode >= 400) {
      throw new GraphServiceError(
        statusCode,
        `presigned result URL returned ${statusCode}${statusCode === 403 ? " (URL likely expired — re-poll the job for a fresh one)" : ""}`,
        text.slice(0, 200),
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new GraphServiceError(0, "presigned result URL returned a non-JSON body", text.slice(0, 200));
    }
  }

  private async requestWithRetry(
    method: "GET" | "POST",
    path: string,
    body?: string
  ): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.requestOnce(method, path, body);
      } catch (err) {
        lastError = err;
        // 4xx (except 429) is the caller's fault — don't retry.
        if (err instanceof GraphServiceError && err.statusCode < 500 && err.statusCode !== 429) {
          throw err;
        }
        if (attempt === MAX_RETRIES - 1) break;
        await sleep(backoffMs(attempt));
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(`graph-service request failed: ${String(lastError)}`);
  }

  private async requestOnce(method: "GET" | "POST", path: string, body?: string): Promise<unknown> {
    const url = `${this.baseUrl}${path}`;
    const { statusCode, body: responseBody } = await request(url, {
      method,
      headers: {
        "x-api-key": this.apiKey,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body,
      bodyTimeout: this.timeoutMs,
      headersTimeout: this.timeoutMs,
    });
    const text = await responseBody.text();
    let parsed: unknown = undefined;
    if (text.length > 0) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // Non-JSON body — surface as-is in the error.
        if (statusCode >= 400) {
          throw new GraphServiceError(statusCode, `non-JSON response from graph-service: ${text.slice(0, 200)}`, text);
        }
        return text;
      }
    }
    if (statusCode >= 400) {
      const message =
        (parsed && typeof parsed === "object" && "error" in parsed && typeof (parsed as { error: unknown }).error === "string"
          ? (parsed as { error: string }).error
          : `graph-service responded ${statusCode}`) || `graph-service responded ${statusCode}`;
      throw new GraphServiceError(statusCode, message, parsed);
    }
    return parsed;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoffMs(attempt: number): number {
  // 200ms, 400ms, 800ms — capped at 1s.
  return Math.min(200 * 2 ** attempt, 1000);
}
