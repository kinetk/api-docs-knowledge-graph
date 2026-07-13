"use client";

import { entities } from "@/lib/data";
import { computeStats } from "@/lib/metrics";
import { formatPercent } from "@/lib/format";
import { useSelection } from "@/components/providers/selection-provider";

export function VoiceLegend() {
  const { selectedId, toggle } = useSelection();
  const stats = computeStats(entities);

  const ranked = [...entities].sort(
    (a, b) => stats[b.id].sharePct - stats[a.id].sharePct,
  );

  return (
    <div className="flex w-full flex-col">
      {ranked.map((entity) => {
        const share = stats[entity.id].sharePct;
        return (
          <button
            key={entity.id}
            type="button"
            aria-pressed={selectedId === entity.id}
            onClick={() => toggle(entity.id)}
            className="grid w-full grid-cols-[16px_150px_1fr_60px] items-center gap-3.5 border-b border-line py-3.25 text-left transition-opacity last:border-b-0 hover:opacity-75 focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2"
          >
            <span
              className="h-2.25 w-2.25 rounded-full"
              style={{ background: entity.color }}
              aria-hidden
            />
            <span className="font-display text-base">{entity.name}</span>
            <span
              className="h-1.25 overflow-hidden rounded-[3px] bg-line-strong"
              aria-hidden
            >
              <span
                className="block h-full rounded-[3px]"
                style={{ width: `${share}%`, background: entity.color }}
              />
            </span>
            <span className="text-right font-mono text-[13px] text-muted">
              {formatPercent(share)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
