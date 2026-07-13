"use client";

import type { CSSProperties, ReactNode } from "react";
import { content, entities } from "@/lib/data";
import { computeStats } from "@/lib/metrics";
import { formatPercent } from "@/lib/format";
import { Section } from "@/components/ui/section";
import { useSelection } from "@/components/providers/selection-provider";

export function Playbook() {
  const { selectedId } = useSelection();
  const stats = computeStats(entities);

  const selected = selectedId
    ? entities.find((e) => e.id === selectedId)
    : null;

  const cards = selected
    ? entities
        .filter((e) => e.id !== selected.id)
        .sort((a, b) => stats[b.id].sharePct - stats[a.id].sharePct)
    : entities;

  const meta = content.sections.playbook;

  const title = selected
    ? `What's outpacing ${selected.name} - and your counter-move`
    : meta.title;

  return (
    <Section meta={meta} title={title} divider id="playbook">
      <p className="mb-5 rounded-lg border border-line bg-surface px-4 py-2.5 font-mono text-xs text-faint">
        {selected ? (
          <>
            Benchmarking <b className="text-ink">{selected.name}</b> (
            {formatPercent(stats[selected.id].sharePct)} share) against the
            other {entities.length - 1}. Sorted by who&apos;s pulling furthest
            ahead of you.
          </>
        ) : (
          <>
            Showing all {entities.length} houses. Select one above to benchmark
            it against the others.
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-4.5 max-[820px]:grid-cols-1">
        {cards.map((entity) => {
          const { playbook } = entity;
          const share = stats[entity.id].sharePct;

          let delta: ReactNode;
          if (selected) {
            const diff = share - stats[selected.id].sharePct;
            const positive = diff >= 0;
            delta = (
              <span
                className={`whitespace-nowrap rounded-xl border border-line-strong bg-surface px-2.25 py-0.75 font-mono text-xs ${
                  positive ? "text-positive" : "text-negative"
                }`}
              >
                {positive ? "+" : ""}
                {diff.toFixed(1)} pts share vs you
              </span>
            );
          } else {
            delta = (
              <span className="whitespace-nowrap rounded-xl border border-line-strong bg-surface px-2.25 py-0.75 font-mono text-xs">
                {formatPercent(share)} share of voice
              </span>
            );
          }

          return (
            <article
              key={entity.id}
              style={{ "--card-color": entity.color } as CSSProperties}
              className="relative overflow-hidden rounded-xl border border-line bg-card p-6.5"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--card-color) -60%, transparent 40%)",
                }}
              />
              <div className="relative">
                <div className="mb-1.5 flex items-start justify-between">
                  <span className="font-display text-[22px] text-(--card-color)">
                    {entity.name}
                  </span>
                  {delta}
                </div>
                <p className="mb-4 mt-2.5 font-display text-[16.5px] italic leading-[1.4] text-ink">
                  &ldquo;{playbook.headline}&rdquo;
                </p>

                <h4 className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-widest text-faint">
                  What&apos;s driving it
                </h4>
                <ul className="m-0 list-disc pl-4.5 text-[13.5px] leading-[1.6] text-muted marker:text-(--card-color)">
                  {playbook.drivers.map((driver, i) => (
                    <li key={i} className="mb-1.5">
                      {driver}
                    </li>
                  ))}
                </ul>

                <h4 className="mb-2 mt-4 font-mono text-[10px] uppercase tracking-widest text-faint">
                  Counter-move{selected ? ` for ${selected.name}` : ""}
                </h4>
                <ul className="m-0 list-disc pl-4.5 text-[13.5px] leading-[1.6] text-muted marker:text-(--card-color)">
                  {playbook.counters.map((counter, i) => (
                    <li key={i} className="mb-1.5">
                      {counter}
                    </li>
                  ))}
                </ul>

                {playbook.caveat && (
                  <div className="mt-4 rounded-lg border border-flag-line bg-flag px-3.5 py-3 text-[12.5px] leading-[1.55] text-flag-ink">
                    <b className="text-flag-strong">Data caveat -</b>{" "}
                    {playbook.caveat}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
