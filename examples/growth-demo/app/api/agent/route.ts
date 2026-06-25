// Growth Demo endpoint — short-request + client polling, then synthesis.
//
// One KINETK `insights` (narrative-discovery) job returns the full signal:
// narratives (with scores + representative content + visual/brand enrichment),
// platform opportunities, tag signals, tag combinations, sentiment and analyst
// prose. Gemini authors the strategic copy; the factual sections render from the
// payload. Three FAST POST actions let the browser drive the long job:
//
//   { action: "start",      product }          -> submit the insights job, return jobId
//   { action: "poll",       product, jobId }   -> poll once; signals "ready" when done
//   { action: "synthesize", product, jobId }   -> fetch result, map + Gemini -> signals + gen

import { NextRequest, NextResponse } from "next/server";
import { hasLiveCredentials, submitJob, pollJob, isDone, resultOf } from "@/lib/kinetk/client";
import { mapGrowthSignals } from "@/lib/kinetk/map-insights";
import { synthesizeGrowth, hasGeminiKey } from "@/lib/kinetk/synthesize";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PRODUCT_LEN = 160;

const json = (obj: unknown, status = 200) =>
  NextResponse.json(obj, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: NextRequest) {
  let body: { action?: string; product?: string; jobId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const product = (body.product ?? "").trim().slice(0, MAX_PRODUCT_LEN);
  if (!product) return json({ error: "product is required" }, 400);
  if (!hasLiveCredentials()) {
    return json({ error: "KINETK_API_KEY is not set on the server." }, 503);
  }

  // ── poll ────────────────────────────────────────────────────────────────────
  if (body.action === "poll") {
    if (!body.jobId) return json({ error: "missing job id" }, 400);
    try {
      const p = await pollJob(body.jobId);
      if (p.error) return json({ error: p.error }, 502);
      if (!isDone(p.status)) return json({ phase: "running", status: p.status });
      return json({ phase: "ready" });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "poll failed" }, 502);
    }
  }

  // ── synthesize ───────────────────────────────────────────────────────────────
  if (body.action === "synthesize") {
    if (!body.jobId) return json({ error: "missing job id" }, 400);
    if (!hasGeminiKey()) {
      return json({ error: "GEMINI_API_KEY is not set on the server." }, 503);
    }
    try {
      const p = await pollJob(body.jobId);
      if (p.error) return json({ error: p.error }, 502);
      if (!isDone(p.status)) return json({ phase: "running", status: p.status });

      const signals = mapGrowthSignals(product, await resultOf(p));
      const gen = await synthesizeGrowth(signals);
      return json({ phase: "done", signals, gen });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : "synthesis failed" }, 502);
    }
  }

  // ── start ────────────────────────────────────────────────────────────────────
  try {
    const sub = await submitJob("insights", {
      query: product,
      limit: 3000,
      window: "all",
      includeSignals: true, // turns on the insights[]/narrativeInsights[]/tagInsights[] prose arrays
    });
    return json({ phase: "queued", jobId: sub.jobId, fromCache: !!sub.fromCache });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "submit failed" }, 502);
  }
}
