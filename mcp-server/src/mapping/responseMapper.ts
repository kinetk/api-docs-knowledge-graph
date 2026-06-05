// Phase 3: collapses the rich graph-service response into a slim, LLM-
// optimized envelope per kind. Verbose mode short-circuits and returns the
// untouched payload. Field names follow PublicRankedContent / QueryGraph /
// IntelligenceSearchResponse / QueryNarrativeDiscoveryResponse from
// graph-service/src/intelligence/pipeline/types.ts.
//
// Why slim by default: the discover response can run 60-200 KB of nested
// arrays (narratives + tagSignals + creatorGraph + arbitrage). Agents pay
// real tokens for every byte, and most of the analytics fields are only
// useful when the agent specifically asks for them.

import type { JobKind } from "../types";

export type SlimItem = {
  id: string;
  platform: string | null;
  title: string | null;
  description: string | null;
  tags: string[];
  similarity: number | null;
  engagement: { views: number; likes: number; shares: number; comments: number };
  publishedAt: string | null;
  // Creator identity (handle/name) is no longer exposed by the graph-service API,
  // so we surface only the non-identifying follower count.
  creator: { followerCount: number | null } | null;
};

export type SlimNarrative = {
  id: string;
  label: string;
  summary: string;
  contentCount: number;
  topTags: string[];
  representativeIds: string[];
};

export type SlimGraph = {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string; type: string; weight: number }>;
};

export type SlimResult = {
  jobId: string;
  kind: JobKind;
  status: "completed" | "failed" | "pending";
  generatedAt: string | null;
  query?: string;
  campaign?: string;
  items?: SlimItem[];
  graph?: SlimGraph;
  narratives?: SlimNarrative[];
  insights?: string[];
  tagInsights?: string[];
  narrativeInsights?: string[];
  context?: unknown;
  brief?: unknown;
  retrieval?: { totalCandidates: number; returned: number; window: string | null };
  error?: string;
};

export type ResponseMapperContext = {
  jobId: string;
  kind: JobKind;
};

export function mapJobResultToSlim(result: unknown, ctx: ResponseMapperContext): SlimResult {
  const base: SlimResult = {
    jobId: ctx.jobId,
    kind: ctx.kind,
    status: "completed",
    generatedAt: pickString(result, "generatedAt"),
  };
  switch (ctx.kind) {
    case "intelligence_search":
      return { ...base, ...mapSearchResult(result) };
    case "intelligence_discover":
      return { ...base, ...mapDiscoverResult(result) };
    case "campaign_brief":
      return { ...base, ...mapCampaignBriefResult(result) };
    case "llm_context":
      return { ...base, ...mapLlmContextResult(result) };
  }
}

function mapSearchResult(result: unknown): Partial<SlimResult> {
  const obj = asObject(result);
  return {
    query: pickString(obj, "query") ?? undefined,
    items: mapItems(asArray(obj?.["content"])),
    graph: mapGraph(asObject(obj?.["graph"])),
    retrieval: mapRetrieval(asObject(obj?.["retrieval"]), pickString(obj, "window")),
  };
}

function mapDiscoverResult(result: unknown): Partial<SlimResult> {
  const obj = asObject(result);
  // intelligence_discover is signals-only: the response carries the three insight
  // prose arrays (+ envelope), not the underlying content/narratives/graphs.
  const slimStrings = (key: string): string[] | undefined => {
    const arr = asArray(obj?.[key]).filter((v): v is string => typeof v === "string").slice(0, 12);
    return arr.length > 0 ? arr : undefined;
  };
  return {
    query: pickString(obj, "query") ?? undefined,
    insights: slimStrings("insights"),
    tagInsights: slimStrings("tagInsights"),
    narrativeInsights: slimStrings("narrativeInsights"),
  };
}

function mapCampaignBriefResult(result: unknown): Partial<SlimResult> {
  // campaign_brief handler returns { id, createdAt, brief, context }.
  const obj = asObject(result);
  const context = asObject(obj?.["context"]);
  return {
    campaign: pickString(context, "campaign") ?? pickString(context, "query") ?? undefined,
    brief: obj?.["brief"],
    context: context ?? undefined,
    generatedAt: pickString(obj, "createdAt") ?? null,
  };
}

function mapLlmContextResult(result: unknown): Partial<SlimResult> {
  // llm_context handler returns { type, generatedAt, context }.
  const obj = asObject(result);
  const context = asObject(obj?.["context"]);
  return {
    campaign: pickString(context, "campaign") ?? pickString(context, "query") ?? undefined,
    context: context ?? undefined,
  };
}

function mapItems(rows: unknown[]): SlimItem[] {
  return rows.map((row) => {
    const r = asObject(row) ?? {};
    const creator = buildCreator(r);
    return {
      id: pickString(r, "uuid") ?? "",
      platform: pickString(r, "platform"),
      title: pickString(r, "title"),
      description: pickString(r, "description"),
      tags: asArray(r["tags"]).filter((t): t is string => typeof t === "string"),
      similarity: pickNumber(r, "similarity"),
      engagement: {
        views: pickNumber(r, "viewCount") ?? 0,
        likes: pickNumber(r, "likeCount") ?? 0,
        shares: pickNumber(r, "shareCount") ?? 0,
        comments: pickNumber(r, "commentCount") ?? 0,
      },
      publishedAt: pickString(r, "publishedAt"),
      creator,
    };
  });
}

function buildCreator(r: Record<string, unknown>): SlimItem["creator"] {
  // Creator handle/name are no longer returned by the API — keep only follower count.
  const followerCount = pickNumber(r, "followerCount");
  if (followerCount === null) return null;
  return { followerCount };
}

function mapGraph(graph: Record<string, unknown> | null): SlimGraph | undefined {
  if (!graph) return undefined;
  const nodes = asArray(graph["nodes"]).map((n) => {
    const obj = asObject(n) ?? {};
    return {
      id: pickString(obj, "id") ?? "",
      type: pickString(obj, "type") ?? "unknown",
      label: pickString(obj, "label") ?? "",
    };
  });
  const edges = asArray(graph["edges"]).map((e) => {
    const obj = asObject(e) ?? {};
    return {
      source: pickString(obj, "source") ?? "",
      target: pickString(obj, "target") ?? "",
      type: pickString(obj, "type") ?? "unknown",
      weight: pickNumber(obj, "weight") ?? 0,
    };
  });
  if (nodes.length === 0 && edges.length === 0) return undefined;
  return { nodes, edges };
}

function mapNarratives(rows: unknown[]): SlimNarrative[] | undefined {
  if (rows.length === 0) return undefined;
  return rows.map((row) => {
    const r = asObject(row) ?? {};
    return {
      id: pickString(r, "id") ?? "",
      label: pickString(r, "label") ?? "",
      summary: pickString(r, "summary") ?? "",
      contentCount: pickNumber(r, "contentCount") ?? 0,
      topTags: asArray(r["topTags"]).filter((t): t is string => typeof t === "string"),
      representativeIds: asArray(r["contentUuids"])
        .filter((t): t is string => typeof t === "string")
        .slice(0, 25),
    };
  });
}

function mapRetrieval(retrieval: Record<string, unknown> | null, window: string | null): SlimResult["retrieval"] {
  if (!retrieval) return undefined;
  return {
    totalCandidates: pickNumber(retrieval, "candidatesSeen") ?? 0,
    returned: pickNumber(retrieval, "resultsReturned") ?? 0,
    window: window ?? null,
  };
}

// Type guards. The graph-service responses are typed on the server, but the
// MCP only sees them as `unknown` (it crossed an HTTP boundary), so we narrow
// defensively without an `any` in sight.
function asObject(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickString(value: unknown, key: string): string | null {
  const obj = asObject(value);
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "string" ? v : null;
}

function pickNumber(value: unknown, key: string): number | null {
  const obj = asObject(value);
  if (!obj) return null;
  const v = obj[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
