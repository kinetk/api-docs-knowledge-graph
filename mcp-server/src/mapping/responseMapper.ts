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

// A-3 — discovery is STRUCTURED by default (A-1), so a discovery narrative now
// carries its real lifecycle/link + themes, not just tags.
export type SlimNarrative = {
  id: string;
  label: string;
  summary: string;
  contentCount: number;
  topTags: string[];
  topThemes: string[];
  // From the B-2 persistent link: real lifecycle + whether it is linked/net-new.
  lifecycle: string | null;
  linkStatus: string | null;
  diffusion: number | null;
  representativeIds: string[];
};

// Capped per-tag / per-theme arbitrage signal (B-3/B-6 de-collineated).
export type SlimSignal = {
  key: string;
  engagementPremiumPct: number | null;
  whitespaceScore: number | null;
  dominantPlatform: string | null;
};

// Per-narrative sentiment headline (B-4), coverage-gated.
export type SlimSentiment = {
  narrativeLabel: string;
  dominantTone: string | null;
  toneAvailable: boolean;
  netStance: number | null;
  stanceAvailable: boolean;
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
  items?: SlimItem[];
  graph?: SlimGraph;
  narratives?: SlimNarrative[];
  // Structured discovery facets (insights), capped for token economy.
  tagSignals?: SlimSignal[];
  themeSignals?: { available: boolean; coverage: number; signals: SlimSignal[] };
  narrativeSentiment?: SlimSentiment[];
  // Prose arrays present only when the job opted into includeSignals.
  insights?: string[];
  tagInsights?: string[];
  narrativeInsights?: string[];
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
    case "records":
      return { ...base, ...mapSearchResult(result) };
    case "insights":
      return { ...base, ...mapDiscoverResult(result) };
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
  // A-1 — insights is STRUCTURED by default: narratives (with B-2 link),
  // tag/theme signals (with B-3 whitespace), per-narrative sentiment (B-4). Cap
  // each facet so the agent gets the intelligence without paying for the full
  // analytics. Prose arrays appear only when the job opted into includeSignals.
  const slimStrings = (key: string): string[] | undefined => {
    const arr = asArray(obj?.[key]).filter((v): v is string => typeof v === "string").slice(0, 12);
    return arr.length > 0 ? arr : undefined;
  };
  const themeSignalsObj = asObject(obj?.["themeSignals"]);
  return {
    query: pickString(obj, "query") ?? undefined,
    narratives: mapDiscoveryNarratives(asArray(obj?.["narratives"]).slice(0, 5)),
    tagSignals: mapSignals(asArray(obj?.["tagSignals"]).slice(0, 10), "tag"),
    themeSignals: themeSignalsObj
      ? {
          available: themeSignalsObj["available"] === true,
          coverage: pickNumber(themeSignalsObj, "coverage") ?? 0,
          signals: mapSignals(asArray(themeSignalsObj["signals"]).slice(0, 8), "theme") ?? [],
        }
      : undefined,
    narrativeSentiment: mapNarrativeSentiment(asArray(obj?.["narrativeSentiment"]).slice(0, 8)),
    insights: slimStrings("insights"),
    tagInsights: slimStrings("tagInsights"),
    narrativeInsights: slimStrings("narrativeInsights"),
  };
}

function mapDiscoveryNarratives(rows: unknown[]): SlimNarrative[] | undefined {
  if (rows.length === 0) return undefined;
  return rows.map((row) => {
    const r = asObject(row) ?? {};
    const link = asObject(r["persistentLink"]);
    const linkStatus = link ? pickString(link, "status") : null;
    return {
      id: pickString(r, "id") ?? "",
      label: pickString(r, "label") ?? "",
      summary: pickString(r, "summary") ?? "",
      contentCount: pickNumber(r, "contentCount") ?? 0,
      topTags: asArray(r["topTags"]).filter((t): t is string => typeof t === "string").slice(0, 6),
      topThemes: asArray(r["topThemes"]).filter((t): t is string => typeof t === "string").slice(0, 6),
      // Real lifecycle only when the cluster actually linked to a persistent narrative.
      lifecycle: linkStatus === "linked" && link ? pickString(link, "lifecycle") : null,
      linkStatus,
      diffusion: linkStatus === "linked" && link ? pickNumber(link, "diffusion") : null,
      representativeIds: asArray(r["contentUuids"]).filter((t): t is string => typeof t === "string").slice(0, 25),
    };
  });
}

function mapSignals(rows: unknown[], keyField: "tag" | "theme"): SlimSignal[] | undefined {
  if (rows.length === 0) return undefined;
  const mapped = rows.map((row) => {
    const r = asObject(row) ?? {};
    return {
      key: pickString(r, keyField) ?? "",
      engagementPremiumPct: pickNumber(r, "engagementPremiumPct"),
      whitespaceScore: pickNumber(r, "whitespaceScore"),
      dominantPlatform: pickString(r, "dominantPlatform"),
    };
  });
  return mapped.length > 0 ? mapped : undefined;
}

function mapNarrativeSentiment(rows: unknown[]): SlimSentiment[] | undefined {
  if (rows.length === 0) return undefined;
  return rows.map((row) => {
    const r = asObject(row) ?? {};
    return {
      narrativeLabel: pickString(r, "narrativeLabel") ?? "",
      dominantTone: pickString(r, "dominantTone"),
      toneAvailable: r["toneAvailable"] === true,
      netStance: pickNumber(r, "netStance"),
      stanceAvailable: r["stanceAvailable"] === true,
    };
  });
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
