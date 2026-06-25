// Map a live KINETK `insights` (narrative-discovery) job result into GrowthSignals —
// everything the 7 UI sections need. Content records (with visual enrichment) are
// pooled from each narrative's `representativeContent`, preferring a flat
// `records`/`content`/`items` array when present. Defensive; nulls kept.

import {
  EmergingTag,
  MomentumTag,
  NarrativeSentiment,
  PlatformTelemetry,
  RecordCard,
  GrowthNarrative,
  GrowthSignals,
  TagCombination,
  WhitespaceTag,
} from "./types";

type Rec = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown, d = 0) => (typeof v === "number" ? v : d);
const numN = (v: unknown): number | null => (typeof v === "number" ? v : null);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const LIMITS = {
  platformOpportunities: 8,
  momentumTags: 10,
  emergingTags: 8,
  whitespaceTags: 8,
  combinations: 8,
  sentiment: 6,
  records: 15,
  visualVocab: 14,
};
const SATURATION_MAX = 0.35;
const COVERAGE_MIN = 0.5;

interface RawTag {
  tag: string;
  engagementPremiumPct: number | null;
  saturation: number | null;
  saturationCoverage: number | null;
  whitespaceScore: number | null;
  dominantPlatform: string | null;
}

function flatRecords(root: Rec): Rec[] {
  const flat = arr<Rec>(root.records ?? root.content ?? root.items);
  if (flat.length) return flat;
  const pooled: Rec[] = [];
  for (const n of arr<Rec>(root.narratives)) {
    for (const c of arr<Rec>((n as Rec).representativeContent)) pooled.push(c);
  }
  return pooled;
}

function mapRecord(c: Rec, i: number): RecordCard {
  const enr = (c.enrichment ?? {}) as Rec;
  return {
    uuid: str(c.uuid) ?? `r-${i}`,
    platform: str(c.platform),
    title: str(c.title),
    viewCount: num(c.viewCount),
    likeCount: num(c.likeCount),
    tags: arr<string>(c.tags),
    aestheticStyle: arr<string>(enr.aestheticStyle),
    emotionMood: arr<string>(enr.emotionMood),
  };
}

function dedupe(xs: string[], cap: number): string[] {
  return Array.from(new Set(xs.map((s) => s.trim()).filter(Boolean))).slice(0, cap);
}

export function mapGrowthSignals(product: string, result: unknown): GrowthSignals {
  const root = (result ?? {}) as Rec;

  const narratives: GrowthNarrative[] = arr<Rec>(root.narratives)
    .map((n, i) => {
      const pl = (n.persistentLink ?? {}) as Rec;
      const linked = str(pl.status) === "linked";
      return {
        id: str(n.id) ?? `n${i}`,
        label: str(n.label) ?? "Narrative",
        summary: str(n.summary) ?? "",
        trendScore: numN(n.trendScore),
        topTags: arr<string>(n.topTags),
        topThemes: arr<string>(n.topThemes),
        linked,
        momentumScore: linked ? numN(pl.momentumScore) : null,
        emergingScore: linked ? numN(pl.emergingScore) : null,
      };
    })
    .sort((a, b) => (b.trendScore ?? 0) - (a.trendScore ?? 0));

  const platformOpportunities: PlatformTelemetry[] = arr<Rec>(root.platformOpportunities)
    .map((p) => ({
      narrativeLabel: str(p.narrativeLabel) ?? "",
      dominantPlatform: str(p.dominantPlatform),
      engagementPremiumPct: numN(p.engagementPremiumPct),
      opportunity: str(p.opportunity),
    }))
    .filter((p) => p.narrativeLabel)
    .sort((a, b) => (b.engagementPremiumPct ?? 0) - (a.engagementPremiumPct ?? 0))
    .slice(0, LIMITS.platformOpportunities);

  const rawTags: RawTag[] = arr<Rec>(root.tagSignals).map((t) => ({
    tag: str(t.tag) ?? "",
    engagementPremiumPct: numN(t.engagementPremiumPct),
    saturation: numN(t.saturation),
    saturationCoverage: numN(t.saturationCoverage),
    whitespaceScore: numN(t.whitespaceScore),
    dominantPlatform: str(t.dominantPlatform),
  }));
  // tag -> its dominant platform, so combinations can show where the pair lives.
  const tagPlatform = new Map<string, string | null>(rawTags.map((t) => [t.tag, t.dominantPlatform]));

  const momentumTags: MomentumTag[] = rawTags
    .filter((t) => t.tag)
    .map((t) => ({ tag: t.tag, engagementPremiumPct: t.engagementPremiumPct }))
    .sort((a, b) => (b.engagementPremiumPct ?? 0) - (a.engagementPremiumPct ?? 0))
    .slice(0, LIMITS.momentumTags);

  const emergingTags: EmergingTag[] = rawTags
    .filter(
      (t) =>
        t.tag &&
        t.saturation != null &&
        t.saturation < SATURATION_MAX &&
        (t.saturationCoverage ?? 0) > COVERAGE_MIN,
    )
    .map((t) => ({
      tag: t.tag,
      engagementPremiumPct: t.engagementPremiumPct,
      saturation: t.saturation,
      saturationCoverage: t.saturationCoverage,
    }))
    .sort((a, b) => (b.engagementPremiumPct ?? 0) - (a.engagementPremiumPct ?? 0))
    .slice(0, LIMITS.emergingTags);

  const whitespaceTags: WhitespaceTag[] = rawTags
    .filter((t) => t.tag && t.whitespaceScore != null)
    .map((t) => ({
      tag: t.tag,
      whitespaceScore: t.whitespaceScore,
      engagementPremiumPct: t.engagementPremiumPct,
    }))
    .sort((a, b) => (b.whitespaceScore ?? 0) - (a.whitespaceScore ?? 0))
    .slice(0, LIMITS.whitespaceTags);

  const tagCombinations: TagCombination[] = arr<Rec>(root.tagCombinations)
    .map((c) => {
      const tagA = str(c.tagA) ?? "";
      const tagB = str(c.tagB) ?? "";
      const pa = tagPlatform.get(tagA) ?? null;
      const pb = tagPlatform.get(tagB) ?? null;
      return {
        tagA,
        tagB,
        combinationLiftPct: num(c.combinationLiftPct),
        platform: pa && pb && pa === pb ? pa : pa ?? pb, // shared platform, else either
      };
    })
    .filter((c) => c.tagA && c.tagB)
    .sort((a, b) => b.combinationLiftPct - a.combinationLiftPct)
    .slice(0, LIMITS.combinations);

  const sentiment: NarrativeSentiment[] = arr<Rec>(root.narrativeSentiment)
    .map((s) => ({
      narrativeLabel: str(s.narrativeLabel) ?? "",
      dominantTone: str(s.dominantTone),
      netStance: numN(s.netStance),
    }))
    .filter((s) => s.narrativeLabel && (s.dominantTone || s.netStance != null))
    .slice(0, LIMITS.sentiment);

  const seen = new Set<string>();
  const records: RecordCard[] = flatRecords(root)
    .map(mapRecord)
    .filter((r) => {
      if (seen.has(r.uuid)) return false;
      seen.add(r.uuid);
      return true;
    })
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, LIMITS.records);

  const aestheticStyles = dedupe(records.flatMap((r) => r.aestheticStyle), LIMITS.visualVocab);
  const emotionMoods = dedupe(records.flatMap((r) => r.emotionMood), LIMITS.visualVocab);

  if (narratives.length === 0) {
    throw new Error("insights job returned no usable narratives");
  }

  return {
    product: product.trim(),
    narratives,
    platformOpportunities,
    momentumTags,
    emergingTags,
    whitespaceTags,
    tagCombinations,
    sentiment,
    records,
    aestheticStyles,
    emotionMoods,
    insights: arr<string>(root.insights),
    narrativeInsights: arr<string>(root.narrativeInsights),
  };
}

// Shared selectors so synthesis + view stay aligned.
export function topNarratives(signals: GrowthSignals): GrowthNarrative[] {
  return signals.narratives.slice(0, 3);
}
// Highest combined momentum + emerging — the "biggest bet" anchor.
export function biggestBet(signals: GrowthSignals): GrowthNarrative | null {
  const linked = signals.narratives.filter((n) => n.linked);
  if (linked.length === 0) return null;
  return [...linked].sort(
    (a, b) =>
      (b.momentumScore ?? 0) + (b.emergingScore ?? 0) -
      ((a.momentumScore ?? 0) + (a.emergingScore ?? 0)),
  )[0];
}
// Highest momentum — the mainstream-buyer anchor.
export function topMomentum(signals: GrowthSignals): GrowthNarrative | null {
  const linked = signals.narratives.filter((n) => n.momentumScore != null);
  if (linked.length === 0) return signals.narratives[0] ?? null;
  return [...linked].sort((a, b) => (b.momentumScore ?? 0) - (a.momentumScore ?? 0))[0];
}
