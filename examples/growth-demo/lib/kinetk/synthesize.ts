// Server-only Gemini synthesis for the Growth Demo. From the live insight
// signal Gemini authors the LLM-driven pieces of the launch plan:
//   1. positioning / thisWeek / biggestBetRationale / watchOuts (week-one hero)
//   2. hooks      — a creative angle per top-3 narrative (by trendScore)
//   3. targetAudience / underservedAudience (who's buying)
//   7. visualTheme — the mood-board summary
// One structured-output call (responseMimeType json + responseSchema) → GrowthGen.

import { GoogleGenAI, Type } from "@google/genai";
import { GrowthGen, GrowthSignals } from "./types";
import { topNarratives, biggestBet, topMomentum } from "./map-insights";

const MODEL = "gemini-3.5-flash";

export function hasGeminiKey(): boolean {
  return (process.env.GEMINI_API_KEY ?? "").length > 0;
}

const SYSTEM = `You are a senior DTC / e-commerce growth strategist. You are handed live social signal from the KINETK IP Graph (narratives with trend/momentum/emerging scores, audience sentiment, tag whitespace, analyst takeaways, and a pooled visual vocabulary). Author the strategic copy for a "launch this product" brief.

Rules:
- Ground everything in the numbers provided. Cite raw scores explicitly where asked — that proof is the point.
- Do not invent narratives, tags, platforms, brands or numbers that aren't in the signal.
- positioning: EXACTLY 2 sentences placing the product at the intersection of the highest-momentum narratives (reframe the category, e.g. "not a fitness tracker, but a biometric anxiety-management tool").
- thisWeek: EXACTLY 4 concrete, do-it-this-week execution steps, based on the analyst insights and top platforms.
- biggestBetRationale: 1-2 sentences explaining why the provided "biggest bet" narrative is the anchor, citing its momentum and emerging scores numerically.
- watchOuts: EXACTLY 2 specific anti-patterns / mistakes to avoid, drawn from the critical sentiment and any negative engagement-premium clusters provided.
- hooks: a scroll-stopping creative angle for EACH provided top narrative, in the SAME ORDER, riding that narrative and its tags.
- targetAudience: 1-2 sentences naming the primary mainstream buyer, synthesized from the highest-momentum narrative's themes and the emotional moods.
- underservedAudience: 1-2 sentences naming ONE highly-engaged but underserved subculture incumbents are ignoring, from the high emerging-score narratives and high-whitespace tags.
- visualTheme: 1-2 sentences naming the overarching visual theme (aesthetic styles + moods).`;

const GEN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    positioning: { type: Type.STRING, description: "Exactly 2 sentences." },
    thisWeek: { type: Type.ARRAY, description: "Exactly 4 week-one steps.", items: { type: Type.STRING } },
    biggestBetRationale: { type: Type.STRING, description: "Why the biggest-bet narrative anchors, citing scores." },
    watchOuts: { type: Type.ARRAY, description: "Exactly 2 anti-patterns.", items: { type: Type.STRING } },
    hooks: { type: Type.ARRAY, description: "One creative angle per top narrative, in order.", items: { type: Type.STRING } },
    targetAudience: { type: Type.STRING, description: "Mainstream buyer." },
    underservedAudience: { type: Type.STRING, description: "Underserved high-arbitrage niche." },
    visualTheme: { type: Type.STRING, description: "Overarching visual theme." },
  },
  required: [
    "positioning",
    "thisWeek",
    "biggestBetRationale",
    "watchOuts",
    "hooks",
    "targetAudience",
    "underservedAudience",
    "visualTheme",
  ],
  propertyOrdering: [
    "positioning",
    "thisWeek",
    "biggestBetRationale",
    "watchOuts",
    "hooks",
    "targetAudience",
    "underservedAudience",
    "visualTheme",
  ],
};

function userPrompt(signals: GrowthSignals): string {
  const top = topNarratives(signals).map((n) => ({
    label: n.label,
    summary: n.summary,
    topTags: n.topTags,
    trendScore: n.trendScore,
  }));
  const bet = biggestBet(signals);
  const momentum = topMomentum(signals);
  const emergingNarratives = signals.narratives
    .filter((n) => n.emergingScore != null)
    .sort((a, b) => (b.emergingScore ?? 0) - (a.emergingScore ?? 0))
    .slice(0, 4)
    .map((n) => ({ label: n.label, emergingScore: n.emergingScore }));
  const criticalSentiment = signals.sentiment.filter((s) => (s.netStance ?? 0) < 0);
  const negativePlatforms = signals.platformOpportunities.filter(
    (p) => (p.engagementPremiumPct ?? 0) < 0,
  );

  return [
    `PRODUCT: ${signals.product}`,
    ``,
    `TOP NARRATIVES (by trendScore — write one hook for each, in order):`,
    JSON.stringify(top, null, 2),
    ``,
    `BIGGEST BET (highest combined momentum + emerging — write the rationale, cite the scores):`,
    JSON.stringify(bet ? { label: bet.label, momentumScore: bet.momentumScore, emergingScore: bet.emergingScore } : null, null, 2),
    ``,
    `MAINSTREAM ANCHOR (highest momentum — for the target audience):`,
    JSON.stringify(momentum ? { label: momentum.label, topThemes: momentum.topThemes } : null, null, 2),
    ``,
    `UNDERSERVED INPUTS (emerging narratives + high-whitespace tags):`,
    JSON.stringify({ emergingNarratives, whitespaceTags: signals.whitespaceTags }, null, 2),
    ``,
    `WATCH-OUT INPUTS (critical sentiment + negative-premium clusters):`,
    JSON.stringify({ criticalSentiment, negativePlatforms }, null, 2),
    ``,
    `PLATFORM OPPORTUNITIES:`,
    JSON.stringify(signals.platformOpportunities, null, 2),
    ``,
    `ANALYST INSIGHTS:`,
    JSON.stringify({ insights: signals.insights, narrativeInsights: signals.narrativeInsights }, null, 2),
    ``,
    `VISUAL VOCABULARY:`,
    JSON.stringify({ aestheticStyles: signals.aestheticStyles, emotionMoods: signals.emotionMoods }, null, 2),
  ].join("\n");
}

export async function synthesizeGrowth(signals: GrowthSignals): Promise<GrowthGen> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userPrompt(signals),
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: GEN_SCHEMA,
      maxOutputTokens: 8192,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned no strategy");
  }
  return JSON.parse(text) as GrowthGen;
}
