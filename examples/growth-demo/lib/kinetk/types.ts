// Types for the Growth Demo. One KINETK `insights` (narrative-discovery) job
// returns the live signal; the mapper distils it into GrowthSignals, and Gemini
// authors GrowthGen on top. The UI renders the 7 dev-guide sections.

export type Platform =
  | "TIKTOK"
  | "INSTAGRAM"
  | "YOUTUBE"
  | "REDDIT"
  | "PINTEREST"
  | "X"
  | "SNAPCHAT";

export const PLATFORMS_ALL: Platform[] = [
  "TIKTOK",
  "INSTAGRAM",
  "YOUTUBE",
  "REDDIT",
  "PINTEREST",
  "X",
  "SNAPCHAT",
];

export const PLATFORM_COLORS: Record<Platform, string> = {
  TIKTOK: "#00F5FF",
  INSTAGRAM: "#EEB248",
  YOUTUBE: "#FF4D6D",
  REDDIT: "#FF7A45",
  PINTEREST: "#FFD700",
  X: "#9AE6FF",
  SNAPCHAT: "#FFE74C",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  YOUTUBE: "YouTube",
  REDDIT: "Reddit",
  PINTEREST: "Pinterest",
  X: "X",
  SNAPCHAT: "Snapchat",
};

// ── Mapped signal from the insights job (raw; null when absent) ───────────────

export interface GrowthNarrative {
  id: string;
  label: string;
  summary: string;
  trendScore: number | null;
  topTags: string[];
  topThemes: string[];
  linked: boolean; // persistentLink.status === "linked"
  momentumScore: number | null;
  emergingScore: number | null;
}

export interface PlatformTelemetry {
  narrativeLabel: string;
  dominantPlatform: string | null;
  engagementPremiumPct: number | null;
  opportunity: string | null; // kept as LLM context (not shown in the telemetry cards)
}

export interface MomentumTag {
  tag: string;
  engagementPremiumPct: number | null;
}

export interface EmergingTag {
  tag: string;
  engagementPremiumPct: number | null;
  saturation: number | null;
  saturationCoverage: number | null;
}

export interface WhitespaceTag {
  tag: string;
  whitespaceScore: number | null; // demand high, saturation low
  engagementPremiumPct: number | null;
}

export interface TagCombination {
  tagA: string;
  tagB: string;
  combinationLiftPct: number;
  platform: string | null; // dominant platform of the pair (derived from tagSignals)
}

// Per-narrative audience sentiment (for watch-outs).
export interface NarrativeSentiment {
  narrativeLabel: string;
  dominantTone: string | null;
  netStance: number | null; // -1 critical .. +1 supportive
}

export interface RecordCard {
  uuid: string;
  platform: string | null;
  title: string | null;
  viewCount: number;
  likeCount: number;
  tags: string[];
  aestheticStyle: string[];
  emotionMood: string[];
}

export interface GrowthSignals {
  product: string;
  narratives: GrowthNarrative[];
  platformOpportunities: PlatformTelemetry[];
  momentumTags: MomentumTag[];
  emergingTags: EmergingTag[];
  whitespaceTags: WhitespaceTag[];
  tagCombinations: TagCombination[];
  sentiment: NarrativeSentiment[];
  records: RecordCard[];
  aestheticStyles: string[]; // pooled + deduped
  emotionMoods: string[]; // pooled + deduped
  insights: string[];
  narrativeInsights: string[];
}

// ── Gemini-authored layer ─────────────────────────────────────────────────────
// hooks align (in order) with the top-3 narratives by trendScore.
export interface GrowthGen {
  positioning: string; // 2-sentence thesis (section 1 hero)
  thisWeek: string[]; // 4 week-one steps (section 1)
  biggestBetRationale: string; // why the highest-momentum+emerging narrative anchors (section 1)
  watchOuts: string[]; // 2 anti-patterns (section 1)
  hooks: string[]; // 3 creative angles (section 2)
  targetAudience: string; // mainstream buyer (section 3)
  underservedAudience: string; // high-arbitrage niche (section 3)
  visualTheme: string; // mood-board summary (section 7)
}

// ── Streamed agent-console protocol ───────────────────────────────────────────
export type ToolName =
  | "create_context_job"
  | "get_context_job_status"
  | "get_context_job_result";

export type AgentEvent =
  | { type: "thought"; text: string }
  | { type: "tool_call"; id: string; tool: ToolName; args: Record<string, unknown> }
  | { type: "tool_result"; id: string; summary: string; ok: boolean }
  | { type: "synthesize"; model: string }
  | { type: "metric"; label: string; value: string }
  | { type: "error"; message: string }
  | { type: "done" };
