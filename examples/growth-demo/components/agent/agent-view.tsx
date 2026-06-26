"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AgentEvent, GrowthGen, GrowthSignals } from "@/lib/kinetk/types";
import ProductInput from "./product-input";
import AgentConsole from "./agent-console";
import GrowthResultView from "./growth-result";

// Console shows everything except the done marker.
type ConsoleEvent = Exclude<AgentEvent, { type: "done" }>;

const SYNTH_MODEL = "gemini-3.5-flash";
const POLL_INTERVAL_MS = 10000;
const MAX_POLLS = 30; // ~5 minutes
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type StartResp = { phase: "queued"; jobId: string; fromCache?: boolean };
type PollResp = { phase: "running"; status?: string } | { phase: "ready" };
type SynthResp =
  | { phase: "done"; signals: GrowthSignals; gen: GrowthGen }
  | { phase: "running"; status?: string };

async function postAgent<T>(body: unknown): Promise<T> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json?.error) {
    throw new Error(json?.error ?? `Request failed (${res.status})`);
  }
  return json as T;
}

export default function AgentView({
  initialQuery = "",
}: {
  initialQuery?: string;
}) {
  const [events, setEvents] = useState<ConsoleEvent[]>([]);
  const [result, setResult] = useState<{
    signals: GrowthSignals;
    gen: GrowthGen;
  } | null>(null);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const runIdRef = useRef(0);
  const autoRanRef = useRef(false);

  const run = useCallback(async (product: string) => {
    const myRun = ++runIdRef.current;
    const push = (e: ConsoleEvent) => {
      if (myRun === runIdRef.current) setEvents((prev) => [...prev, e]);
    };
    const finish = (signals: GrowthSignals, gen: GrowthGen) => {
      if (myRun !== runIdRef.current) return;
      push({
        type: "metric",
        label: "narratives",
        value: `${signals.narratives.length}`,
      });
      push({
        type: "metric",
        label: "selling hooks",
        value: `${gen.hooks.length}`,
      });
      push({
        type: "metric",
        label: "proof posts",
        value: `${signals.records.length}`,
      });
      push({
        type: "thought",
        text: "Gemini authored the launch plan — grounded in the live insight signal.",
      });
      setResult({ signals, gen });
    };

    setStarted(true);
    setRunning(true);
    setEvents([]);
    setResult(null);

    try {
      push({ type: "thought", text: `Reading the product: "${product}".` });
      push({
        type: "thought",
        text: "Pulling the live market signal from the KINETK IP Graph via the insights job — narratives, audiences, telemetry, tags and the records' visual enrichment.",
      });
      push({
        type: "tool_call",
        id: "create",
        tool: "create_context_job",
        args: {
          kind: "insights",
          query: product,
          limit: 3000,
          window: "all",
          includeSignals: true,
        },
      });

      const start = await postAgent<StartResp>({ action: "start", product });
      push({
        type: "tool_result",
        id: "create",
        ok: true,
        summary: `queued · jobId ${start.jobId}${start.fromCache ? " (cache)" : ""}`,
      });

      let ready = false;
      for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(POLL_INTERVAL_MS);
        if (myRun !== runIdRef.current) return;
        const res = await postAgent<PollResp>({
          action: "poll",
          product,
          jobId: start.jobId,
        });
        if (res.phase === "ready") {
          push({
            type: "tool_call",
            id: "result",
            tool: "get_context_job_result",
            args: { jobId: start.jobId, verbose: true },
          });
          push({
            type: "tool_result",
            id: "result",
            ok: true,
            summary: "insights result returned",
          });
          ready = true;
          break;
        }
        const sid = `status-${i}`;
        push({
          type: "tool_call",
          id: sid,
          tool: "get_context_job_status",
          args: { jobId: start.jobId },
        });
        push({
          type: "tool_result",
          id: sid,
          ok: true,
          summary: `${res.status ?? "running"} · ${(i + 1) * 10}s elapsed`,
        });
      }
      if (!ready) throw new Error("Timed out waiting for the insights job");

      push({ type: "synthesize", model: SYNTH_MODEL });
      const syn = await postAgent<SynthResp>({
        action: "synthesize",
        product,
        jobId: start.jobId,
      });
      if (syn.phase !== "done") throw new Error("Synthesis did not complete");
      finish(syn.signals, syn.gen);
      if (myRun === runIdRef.current) setRunning(false);
    } catch (e) {
      if (myRun === runIdRef.current) {
        push({
          type: "error",
          message: e instanceof Error ? e.message : "Run failed",
        });
        setRunning(false);
      }
    }
  }, []);

  useEffect(() => {
    if (autoRanRef.current) return;
    const q = initialQuery.trim();
    if (!q) return;
    autoRanRef.current = true;
    run(q);
  }, [initialQuery, run]);

  return (
    <div className="w-full">
      <div className="mx-auto max-w-3xl">
        {!started && (
          <div className="mb-8 text-center">
            <h1 className="font-bebasNeue text-4xl leading-none tracking-wide text-white sm:text-6xl md:text-6xl">
              Watch an agent build a{" "}
              <span className="bg-linear-to-r from-[#00F5FF] to-[#26AEC0] bg-clip-text text-transparent">
                launch &amp; growth plan for your product
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-white/65">
              Describe your product in one sentence. KINETK analyzes live social
              signals and generates an evidence-backed launch and growth plan.
            </p>
          </div>
        )}
        <ProductInput
          onRun={run}
          running={running}
          initialValue={initialQuery}
        />
      </div>

      {started && (
        <div className="mt-8 grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-4 h-[420px] lg:h-[680px]">
              <AgentConsole events={events} running={running} />
            </div>
          </div>
          <div className="lg:col-span-3">
            {result ? (
              <GrowthResultView signals={result.signals} gen={result.gen} />
            ) : (
              <div className="grid h-[420px] place-items-center rounded-xl border border-dashed border-white/10 lg:h-[680px]">
                <p className="text-sm text-white/40">
                  {running
                    ? "Agent is working — Gemini authoring the launch plan…"
                    : "Awaiting result…"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
