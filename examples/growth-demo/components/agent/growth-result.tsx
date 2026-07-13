"use client";

import {
  Platform,
  PLATFORMS_ALL,
  PLATFORM_COLORS,
  PLATFORM_LABELS,
  GrowthGen,
  GrowthSignals,
} from "@/lib/kinetk/types";
import { biggestBet, topNarratives } from "@/lib/kinetk/map-insights";
import { content } from "@/config/content";
import { Brain } from "lucide-react";

const SYNTH_MODEL = "gemini-3.5-flash";

// ── helpers ───────────────────────────────────────────────────────────────────
function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}
function pctLabel(n: number | null): string {
  if (n == null) return "—";
  const c = Math.max(-999, Math.min(999, Math.round(n)));
  return `${c > 0 ? "+" : ""}${c}%`;
}
function pctColor(n: number | null): string {
  if (n == null) return "text-white/45";
  return n >= 0 ? "text-emerald-400" : "text-rose-400";
}
function asPlatform(s: string | null): Platform | null {
  if (!s) return null;
  const up = s.trim().toUpperCase();
  return (PLATFORMS_ALL as string[]).includes(up) ? (up as Platform) : null;
}
function platformLabel(s: string | null): string {
  const p = asPlatform(s);
  return p ? PLATFORM_LABELS[p] : (s ?? "—");
}
function PlatformDot({ s }: { s: string | null }) {
  const p = asPlatform(s);
  if (!p)
    return <span className="inline-block size-2 rounded-full bg-white/30" />;
  return (
    <span
      className="inline-block size-2 rounded-full"
      style={{ background: PLATFORM_COLORS[p] }}
    />
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="font-spaceGrotesk text-xl font-semibold tracking-tight text-white">
          {title}
        </h3>
        {hint && <p className="text-sm text-white/40">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="rounded border border-white/10 bg-white/3 px-1.5 py-0.5 text-xs text-white/60">
      <span className="text-white/40">{label} </span>
      <span className="tabular-nums text-kinetk-cyan">
        {value != null ? value.toFixed(2) : "—"}
      </span>
    </span>
  );
}

// ── main ──────────────────────────────────────────────────────────────────────
export default function GrowthResultView({
  signals,
  gen,
}: {
  signals: GrowthSignals;
  gen: GrowthGen;
}) {
  const top = topNarratives(signals);
  const bet = biggestBet(signals);
  const proof = signals.records.slice(0, 4);

  return (
    <div className="space-y-7 rounded-xl border border-white/10 bg-white/2 p-5 sm:p-6">
      {/* 1 — WEEK-ONE PLAN (hero) */}
      <div className="space-y-5 rounded-lg border border-kinetk-amber/40 bg-kinetk-amber/4 p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-kinetk-amber">
              {content.result.launchPlanEyebrow}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-kinetk-amber/40 bg-kinetk-amber/6 px-2.5 py-1 text-xs text-kinetk-amber">
                <Brain className="size-3" />
                synthesize · {SYNTH_MODEL}
              </span>
              <span className="shrink-0 rounded-full border border-kinetk-cyan/40 px-2.5 py-1 text-xs text-kinetk-cyan">
                live data
              </span>
            </div>
          </div>
          <h2 className="mt-2 font-spaceGrotesk text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
            {signals.product}
          </h2>
          {gen.positioning && (
            <p className="mt-2 text-sm leading-snug text-white/80">
              {gen.positioning}
            </p>
          )}
        </div>

        {gen.thisWeek.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-white/40">
              Do this week
            </p>
            <ol className="space-y-2">
              {gen.thisWeek.map((s, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-sm leading-snug text-white/80"
                >
                  <span className="font-bebasNeue text-base leading-none text-kinetk-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}

        {bet && (
          <div className="rounded-lg border border-kinetk-amber/30 bg-kinetk-amber/6 p-3.5">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-xs uppercase tracking-[0.16em] text-kinetk-amber/80">
                Biggest bet
              </p>
              <span className="text-sm font-medium text-white">
                {bet.label}
              </span>
              <span className="ml-auto flex gap-1.5">
                <ScoreChip label="momentum" value={bet.momentumScore} />
                <ScoreChip label="emerging" value={bet.emergingScore} />
              </span>
            </div>
            {gen.biggestBetRationale && (
              <p className="text-xs leading-snug text-white/65">
                {gen.biggestBetRationale}
              </p>
            )}
          </div>
        )}

        {gen.watchOuts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-white/40">
              Watch-outs
            </p>
            <ul className="space-y-1.5">
              {gen.watchOuts.map((w, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-snug text-white/70"
                >
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose-400/70" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 2 — SELLING HOOKS */}
      {top.length > 0 && (
        <Section
          title={content.result.hooks.title}
          hint={content.result.hooks.hint}
        >
          <ol className="space-y-2.5">
            {top.map((n, i) => (
              <li
                key={n.id}
                className="rounded-lg border border-white/10 bg-white/3 p-3.5"
              >
                <div className="flex gap-2.5">
                  <span className="font-bebasNeue text-base leading-none text-kinetk-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="font-medium leading-snug text-white">
                    {gen.hooks[i] ?? n.label}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                  <span className="text-xs text-white/45">
                    Riding “{n.label}” · trend{" "}
                    <span className="tabular-nums text-kinetk-cyan">
                      {n.trendScore != null ? n.trendScore.toFixed(2) : "—"}
                    </span>
                  </span>
                  {n.topTags.slice(0, 4).map((t) => (
                    <span key={t} className="font-mono text-xs text-white/35">
                      #{t}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <details className="group rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-kinetk-cyan transition-colors hover:text-kinetk-cyan/80">
              [Trend equation]
            </summary>
            <pre className="mt-2 overflow-x-auto font-mono text-xs leading-relaxed text-white/45">{`const trendScore = round(
  0.30 * engagementStrength +
  0.30 * creatorDiversity +
  0.10 * platformSpread +
  0.30 * recencyStrength
)`}</pre>
          </details>
        </Section>
      )}

      {/* 3 — WHO'S BUYING */}
      {(gen.targetAudience || gen.underservedAudience) && (
        <Section
          title={content.result.audience.title}
          hint={content.result.audience.hint}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {gen.targetAudience && (
              <div className="rounded-lg border border-white/10 bg-white/3 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-kinetk-teal">
                  Target customer
                </p>
                <p className="mt-1 text-sm leading-snug text-white/80">
                  {gen.targetAudience}
                </p>
              </div>
            )}
            {gen.underservedAudience && (
              <div className="rounded-lg border border-dashed border-kinetk-amber/30 bg-kinetk-amber/4 p-3">
                <p className="text-xs uppercase tracking-[0.14em] text-kinetk-amber">
                  Underserved niche
                </p>
                <p className="mt-1 text-sm leading-snug text-white/80">
                  {gen.underservedAudience}
                </p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* 4 — TELEMETRY SCORES */}
      {signals.platformOpportunities.length > 0 && (
        <Section
          title={content.result.telemetry.title}
          hint={content.result.telemetry.hint}
        >
          <div className="space-y-2">
            {signals.platformOpportunities.slice(0, 3).map((o, i) => (
              <div
                key={i}
                className="rounded-lg border border-white/10 bg-white/3 p-3"
              >
                <div className="flex items-center gap-2">
                  <PlatformDot s={o.dominantPlatform} />
                  <span className="text-sm font-medium text-white/85">
                    {platformLabel(o.dominantPlatform)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-white/45">
                    · {o.narrativeLabel}
                  </span>
                  <span
                    className={`ml-auto font-bebasNeue text-lg leading-none tracking-wide ${pctColor(o.engagementPremiumPct)}`}
                  >
                    {pctLabel(o.engagementPremiumPct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 5 — DATA & HASHTAG STRATEGY */}
      {(signals.momentumTags.length > 0 ||
        signals.emergingTags.length > 0 ||
        signals.tagCombinations.length > 0) && (
        <Section
          title={content.result.hashtags.title}
          hint={content.result.hashtags.hint}
        >
          {signals.momentumTags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                Momentum tags
              </p>
              <div className="flex flex-wrap gap-2">
                {signals.momentumTags.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-kinetk-cyan/25 bg-kinetk-cyan/6 px-2.5 py-1 text-xs"
                  >
                    <span className="font-mono text-kinetk-cyan">#{t.tag}</span>
                    <span className={pctColor(t.engagementPremiumPct)}>
                      {pctLabel(t.engagementPremiumPct)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {signals.emergingTags.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                Emerging whitespace
              </p>
              <div className="flex flex-wrap gap-2">
                {signals.emergingTags.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-kinetk-amber/40 bg-kinetk-amber/6 px-2.5 py-1 text-xs"
                  >
                    <span className="font-mono text-kinetk-amber">
                      #{t.tag}
                    </span>
                    <span className={pctColor(t.engagementPremiumPct)}>
                      {pctLabel(t.engagementPremiumPct)}
                    </span>
                    {t.saturation != null && (
                      <span className="text-white/35">
                        sat {t.saturation.toFixed(2)}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
          {signals.tagCombinations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/40">
                Top tag combinations
              </p>
              <div className="space-y-1.5">
                {signals.tagCombinations.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/3 px-3 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-white/70">
                      #{c.tagA} <span className="text-white/30">+</span> #
                      {c.tagB}
                    </span>
                    {c.platform && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-white/45">
                        <PlatformDot s={c.platform} />
                        {platformLabel(c.platform)}
                      </span>
                    )}
                    <span className="text-right text-sm tabular-nums text-emerald-400">
                      {pctLabel(c.combinationLiftPct)}
                    </span>
                    <span className="text-xs text-white/35">lift</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* 6 — VISUAL INTELLIGENCE */}
      {(gen.visualTheme ||
        signals.aestheticStyles.length > 0 ||
        signals.emotionMoods.length > 0) && (
        <Section
          title={content.result.visual.title}
          hint={content.result.visual.hint}
        >
          {gen.visualTheme && (
            <p className="text-sm leading-snug text-white/75">
              {gen.visualTheme}
            </p>
          )}
          {signals.aestheticStyles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signals.aestheticStyles.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-white/15 bg-white/3 px-2.5 py-1 text-xs text-white/75"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          {signals.emotionMoods.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {signals.emotionMoods.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-kinetk-teal/25 bg-kinetk-teal/6 px-2.5 py-1 text-xs text-kinetk-teal"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 7 — PROOF */}
      {proof.length > 0 && (
        <Section
          title={content.result.proof.title}
          hint={content.result.proof.hint}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {proof.map((e) => (
              <div
                key={e.uuid}
                className="rounded-lg border border-white/10 bg-white/3 p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <PlatformDot s={e.platform} />
                  <span className="text-xs text-white/55">
                    {platformLabel(e.platform)}
                  </span>
                  <span className="ml-auto text-xs text-white/45">
                    {formatCount(e.viewCount)} views ·{" "}
                    {formatCount(e.likeCount)} likes
                  </span>
                </div>
                {e.title && (
                  <p className="line-clamp-2 text-sm text-white/85">
                    {e.title}
                  </p>
                )}
                {e.tags.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-white/35">
                    {e.tags
                      .slice(0, 5)
                      .map((t) => `#${t}`)
                      .join("  ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
