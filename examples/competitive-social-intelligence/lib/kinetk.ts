import type {
  InsightsJobState,
  InsightsResult,
  Narrative,
  WhitespaceTag,
} from "./types";

export const KINETK_BASE =
  process.env.KINETK_API_BASE ?? "https://api.kinetk.ai/graph";

export type PullWindow = "7d" | "30d" | "all";
export type JobKind = "records" | "insights";

export interface JobInput {
  query: string;
  window: PullWindow;
  limit: number;
  returnRecords?: number;
  platforms?: string[];
}

export type JobState =
  | { status: "running" }
  | { status: "succeeded"; result: Record<string, unknown> }
  | { status: "failed"; error: string };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(
      `KINETK ${res.status}: non-JSON response ${text.slice(0, 200)}`,
    );
  }
}

function errorText(body: Record<string, unknown>): string {
  return typeof body.error === "string"
    ? body.error
    : JSON.stringify(body).slice(0, 200);
}

export async function submitJob(
  kind: JobKind,
  input: JobInput,
  apiKey: string,
): Promise<string> {
  const res = await fetch(`${KINETK_BASE}/intelligence/jobs`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ kind, input }),
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(`KINETK submit failed (${res.status}): ${errorText(body)}`);
  }
  const { jobId } = body;
  if (typeof jobId !== "string" || jobId.length === 0) {
    throw new Error("KINETK did not return a jobId");
  }
  return jobId;
}

export async function getJob(jobId: string, apiKey: string): Promise<JobState> {
  const res = await fetch(`${KINETK_BASE}/intelligence/jobs/${jobId}`, {
    headers: { "x-api-key": apiKey },
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new Error(`KINETK poll failed (${res.status}): ${errorText(body)}`);
  }

  if (body.status === "failed") {
    return {
      status: "failed",
      error: typeof body.error === "string" ? body.error : "unknown error",
    };
  }
  if (body.status !== "succeeded") {
    return { status: "running" };
  }

  let result = body.result as Record<string, unknown> | undefined;
  if (
    !result &&
    body.resultStorage === "s3" &&
    typeof body.resultUrl === "string"
  ) {
    const dl = await fetch(body.resultUrl);
    if (!dl.ok) {
      throw new Error(`KINETK result download failed (${dl.status})`);
    }
    result = (await dl.json()) as Record<string, unknown>;
  }
  // The result can briefly lag the status flip; treat that as still running.
  if (!result || typeof result !== "object") return { status: "running" };
  return { status: "succeeded", result };
}

const WINDOW: PullWindow = "30d";
const LIMIT = 3000;
const MAX_NARRATIVES = 4;
const MAX_WHITESPACE = 5;

export async function startInsightsJob(
  query: string,
  apiKey: string,
): Promise<string> {
  return submitJob("insights", { query, window: WINDOW, limit: LIMIT }, apiKey);
}

export async function pollInsightsJob(
  jobId: string,
  apiKey: string,
): Promise<InsightsJobState> {
  const state = await getJob(jobId, apiKey);
  if (state.status === "failed") return { status: "failed" };
  if (state.status !== "succeeded") return { status: "running" };
  return { status: "succeeded", result: shapeInsights(state.result) };
}

function shapeInsights(result: Record<string, unknown>): InsightsResult {
  const narratives = asArray(result.narratives)
    .map(toNarrative)
    .filter((n): n is Narrative => n !== null)
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_NARRATIVES);

  const whitespace = asArray(result.tagInfo ?? result.tagSignals)
    .map(toRankedTag)
    .filter((t): t is RankedTag => t !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_WHITESPACE)
    .map(({ tag, premiumPct }) => ({ tag, premiumPct }));

  if (narratives.length === 0 || whitespace.length === 0) {
    throw new Error("KINETK insights had no narratives or tag signals");
  }
  return { narratives, whitespace };
}

type RankedTag = WhitespaceTag & { score: number };

function toNarrative(value: unknown): Narrative | null {
  if (typeof value !== "object" || value === null) return null;
  const { label, summary, contentCount } = value as Record<string, unknown>;
  if (typeof label !== "string" || typeof summary !== "string") return null;
  return { label, description: summary, count: Number(contentCount) || 0 };
}

function toRankedTag(value: unknown): RankedTag | null {
  if (typeof value !== "object" || value === null) return null;
  const { key, tag, engagementPremiumPct, opportunityScore, whitespaceScore } =
    value as Record<string, unknown>;
  const name =
    typeof key === "string" ? key : typeof tag === "string" ? tag : null;
  if (name === null) return null;
  return {
    tag: name,
    premiumPct: Math.round((Number(engagementPremiumPct) || 0) * 10) / 10,
    score: Number(opportunityScore) || Number(whitespaceScore) || 0,
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
