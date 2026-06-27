// Server-only KINETK Graph Service client.
// The API key is read from the environment and never reaches the browser.
// Only imported by route handlers under app/api/* (Node runtime).

const API_BASE = process.env.KINETK_API_BASE ?? "https://api.kinetk.ai/graph";
const API_KEY = process.env.KINETK_API_KEY ?? "";

export function hasLiveCredentials(): boolean {
  return API_KEY.length > 0;
}

// Current job kinds (legacy names like intelligence_records / campaign_brief are
// still accepted by the API, but these are the canonical ones).
export type JobKind = "records" | "insights" | "campaign";

interface SubmitResponse {
  jobId: string;
  status: string;
  fromCache?: boolean;
  result?: unknown;
}

interface PollResponse {
  jobId: string;
  kind: JobKind;
  status: string;
  result?: unknown;
  resultUrl?: string;
  error?: string;
}

async function kfetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

export async function submitJob(
  kind: JobKind,
  input: Record<string, unknown>,
): Promise<SubmitResponse> {
  const res = await kfetch("/intelligence/jobs", {
    method: "POST",
    body: JSON.stringify({ kind, input }),
  });
  if (!res.ok) {
    throw new Error(`KINETK submit ${kind} failed: ${res.status} ${await safeText(res)}`);
  }
  return (await res.json()) as SubmitResponse;
}

export async function pollJob(jobId: string): Promise<PollResponse> {
  const res = await kfetch(`/intelligence/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`KINETK poll failed: ${res.status} ${await safeText(res)}`);
  }
  return (await res.json()) as PollResponse;
}

export function isDone(status?: string): boolean {
  return status === "succeeded" || status === "completed";
}

/** Resolve a job's result, transparently following the presigned S3 URL for large payloads. */
export async function resultOf(p: { result?: unknown; resultUrl?: string }): Promise<unknown> {
  if (p.resultUrl && p.result === undefined) {
    const r = await fetch(p.resultUrl);
    return await r.json();
  }
  return p.result;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}
