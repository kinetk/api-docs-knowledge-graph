"use client";

import { useMemo, useState } from "react";
import { entities } from "@/lib/data";
import { formatCompact, PLATFORM_LABELS } from "@/lib/format";
import type { InsightsJobState, InsightsResult } from "@/lib/types";
import { Pill } from "@/components/ui/pill";

type Status = "idle" | "loading" | "live" | "error";

interface StatusLine {
  text: string;
  variant: "idle" | "live" | "error";
}

const STATUS_COLOR: Record<StatusLine["variant"], string> = {
  idle: "text-faint",
  live: "text-positive",
  error: "text-negative",
};

export function Narratives() {
  const totalRecords = useMemo(
    () => entities.reduce((sum, e) => sum + e.metrics.records, 0),
    [],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(entities.length > 0 ? [entities[0].id] : []),
  );
  const [insights, setInsights] = useState<Record<string, InsightsResult>>(() =>
    Object.fromEntries(
      entities.map((e) => [
        e.id,
        { narratives: e.narratives, whitespace: e.whitespace },
      ]),
    ),
  );
  const [statuses, setStatuses] = useState<Record<string, Status>>(() =>
    Object.fromEntries(entities.map((e) => [e.id, "idle" as Status])),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [statusLine, setStatusLine] = useState<StatusLine>({
    text: `Deep snapshot · ${totalRecords.toLocaleString()} posts`,
    variant: "idle",
  });

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function refreshAll() {
    setRefreshing(true);
    setStatuses(
      Object.fromEntries(entities.map((e) => [e.id, "loading" as Status])),
    );
    setStatusLine({
      text: `Fetching live signals from KINETK - this can take a minute...`,
      variant: "idle",
    });

    const results = await Promise.allSettled(
      entities.map((e) => fetchInsights(e.id)),
    );

    const nextInsights: Record<string, InsightsResult> = {};
    const nextStatuses: Record<string, Status> = {};
    let failed = 0;

    results.forEach((result, index) => {
      const { id } = entities[index];
      if (result.status === "fulfilled") {
        nextInsights[id] = result.value;
        nextStatuses[id] = "live";
      } else {
        failed += 1;
        nextStatuses[id] = "error";
        console.error(`Live insights refresh failed for ${id}:`, result.reason);
      }
    });

    setInsights((prev) => ({ ...prev, ...nextInsights }));
    setStatuses(nextStatuses);
    setRefreshing(false);
    setStatusLine(summarizeRefresh(failed));
  }

  return (
    <>
      <div className="mb-5.5 flex flex-wrap items-center gap-3.5">
        <Pill
          onClick={refreshAll}
          disabled={refreshing}
          className="inline-flex items-center gap-2 disabled:cursor-wait disabled:opacity-[0.55]"
        >
          <span
            className={`inline-block text-sm leading-none ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          >
            &#10227;
          </span>
          Refresh live from KINETK
        </Pill>
        <span
          className={`font-mono text-[11.5px] ${STATUS_COLOR[statusLine.variant]}`}
        >
          {statusLine.text}
        </span>
      </div>

      <div className="border-t border-line">
        {entities.map((entity) => {
          const open = openIds.has(entity.id);
          const { narratives, whitespace } = insights[entity.id];
          const panelId = `narratives-panel-${entity.id}`;
          return (
            <div key={entity.id} className="border-b border-line">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(entity.id)}
                className="flex w-full cursor-pointer items-center justify-between px-1 py-4.5 text-left font-display text-[19px] text-ink focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2"
              >
                <span className="flex items-center">
                  <span
                    className="mr-3.5 h-2.25 w-2.25 shrink-0 rounded-full"
                    style={{ background: entity.color }}
                    aria-hidden
                  />
                  {entity.name}
                  <StatusTag status={statuses[entity.id]} />
                </span>
                <span
                  className={`font-mono text-[13px] text-faint transition-transform ${open ? "rotate-45" : ""}`}
                  aria-hidden
                >
                  +
                </span>
              </button>

              <div
                id={panelId}
                role="region"
                inert={!open}
                className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${open ? "max-h-300" : "max-h-0"}`}
              >
                <div className="pb-6.5 pl-6.75 pr-1">
                  {narratives.map((narrative) => (
                    <div
                      key={narrative.label}
                      className="grid grid-cols-[1fr_auto] gap-4 border-t border-line py-3 first:border-t-0"
                    >
                      <div>
                        <p className="mb-1 text-[14px] font-semibold">
                          {narrative.label}
                        </p>
                        <p className="max-w-140 text-[13px] leading-[1.55] text-muted">
                          {narrative.description}
                        </p>
                      </div>
                      <div className="whitespace-nowrap pt-0.5 font-mono text-[12px] text-faint">
                        {narrative.count} posts
                      </div>
                    </div>
                  ))}

                  <h4 className="mb-1 mt-5 font-mono text-[10px] uppercase tracking-widest text-faint">
                    Top performing posts (snapshot)
                  </h4>
                  {entity.posts.map((post, i) => (
                    <div
                      key={i}
                      className="flex items-baseline gap-3.5 border-t border-line py-2.75"
                    >
                      <span className="w-16 shrink-0 pt-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-faint">
                        {PLATFORM_LABELS[post.platform]}
                      </span>
                      <span className="flex-1 text-[13.5px] leading-[1.55] text-muted">
                        {post.description}
                      </span>
                      <span className="whitespace-nowrap pt-0.5 font-mono text-[11px] text-faint">
                        {formatCompact(post.views)} views ·{" "}
                        {formatCompact(post.likes)} likes
                      </span>
                    </div>
                  ))}

                  <h4 className="mb-1 mt-5 font-mono text-[10px] uppercase tracking-widest text-faint">
                    White-space tags (high premium, low saturation)
                  </h4>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {whitespace.map((tag) => (
                      <span
                        key={tag.tag}
                        className="rounded-md border border-line-strong bg-surface px-2.5 py-1.25 font-mono text-[11px] text-muted"
                      >
                        {tag.tag}{" "}
                        <b className="text-positive">+{tag.premiumPct}%</b>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StatusTag({ status }: { status: Status }) {
  const base =
    "ml-2.5 rounded-lg px-1.75 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em]";
  if (status === "loading") {
    return (
      <span className={`${base} bg-line-strong text-faint`}>Fetching...</span>
    );
  }
  if (status === "live") {
    return (
      <span className={`${base} border border-live-line bg-live text-positive`}>
        Live
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className={`${base} border border-fail-line bg-fail text-negative`}>
        Refresh failed
      </span>
    );
  }
  return null;
}

function summarizeRefresh(failed: number): StatusLine {
  const time = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (failed === 0) {
    return { text: `Live · updated ${time}`, variant: "live" };
  }
  if (failed === entities.length) {
    return {
      text: "Refresh failed - showing the last snapshot. Check the server logs for details.",
      variant: "error",
    };
  }
  const subjects = failed > 1 ? "subjects" : "subject";
  const those = failed > 1 ? "those" : "that one";
  return {
    text: `Live · updated ${time} · ${failed} ${subjects} failed, showing snapshot for ${those}`,
    variant: "error",
  };
}

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_ATTEMPTS = 72;
const MAX_TRANSIENT_FAILURES = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchInsights(id: string): Promise<InsightsResult> {
  const jobId = await startInsightsJob(id);
  return pollInsightsJob(jobId);
}

async function startInsightsJob(id: string): Promise<string> {
  const response = await fetch("/api/insights/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    throw new Error(`Start failed with status ${response.status}`);
  }
  const { jobId } = (await response.json()) as { jobId?: unknown };
  if (typeof jobId !== "string") {
    throw new Error("KINETK did not return a jobId");
  }
  return jobId;
}

async function pollInsightsJob(jobId: string): Promise<InsightsResult> {
  let transientFailures = 0;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(POLL_INTERVAL_MS);

    let state: InsightsJobState;
    try {
      const response = await fetch("/api/insights/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!response.ok) {
        throw new Error(`Status failed with status ${response.status}`);
      }
      state = (await response.json()) as InsightsJobState;
    } catch (error) {
      if (++transientFailures > MAX_TRANSIENT_FAILURES) throw error;
      continue;
    }

    transientFailures = 0;
    if (state.status === "succeeded") return state.result;
    if (state.status === "failed") throw new Error("KINETK job failed");
  }

  throw new Error("KINETK job timed out");
}
