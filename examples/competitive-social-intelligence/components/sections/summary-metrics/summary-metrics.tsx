import type { CSSProperties } from "react";
import { entities, PLATFORM_COLORS, PLATFORM_ORDER } from "@/lib/data";
import { computeStats } from "@/lib/metrics";
import { formatCompact, PLATFORM_LABELS } from "@/lib/format";

export function SummaryMetrics() {
  const stats = computeStats(entities);

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3.5">
      {entities.map((entity) => {
        const { metrics } = entity;
        const stat = stats[entity.id];
        const platformTotal = PLATFORM_ORDER.reduce(
          (sum, p) => sum + entity.platforms[p],
          0,
        );
        const activePlatforms = PLATFORM_ORDER.filter(
          (p) => entity.platforms[p] > 0,
        );

        const rows: [string, string | number][] = [
          ["Relevant posts", metrics.records],
          ["Total views", formatCompact(metrics.views)],
          ["Total likes", formatCompact(metrics.likes)],
          ["Comments / post", stat.commentsPerPost.toFixed(2)],
          ["Engagement score", formatCompact(stat.score)],
        ];

        return (
          <div
            key={entity.id}
            style={{ borderTopColor: entity.color } as CSSProperties}
            className="rounded-[10px] border border-t-[3px] border-line bg-card p-5"
          >
            <div className="mb-3.5 font-display text-[19px]">{entity.name}</div>

            {rows.map(([label, value], i) => (
              <div
                key={label}
                className={`flex items-baseline justify-between py-1.5 text-[12.5px] text-muted ${
                  i < rows.length - 1 ? "border-b border-line" : ""
                }`}
              >
                <span>{label}</span>
                <b className="font-mono text-[12.5px] font-medium text-ink">
                  {value}
                </b>
              </div>
            ))}

            <div className="mt-3 flex h-2 overflow-hidden rounded" aria-hidden>
              {activePlatforms.map((platform) => (
                <span
                  key={platform}
                  className="block"
                  style={{
                    width: `${(entity.platforms[platform] / platformTotal) * 100}%`,
                    background: PLATFORM_COLORS[platform],
                  }}
                />
              ))}
            </div>

            <div className="mt-2.25 flex flex-wrap gap-2">
              {activePlatforms.map((platform) => (
                <span
                  key={platform}
                  className="flex items-center gap-1 font-mono text-[9.5px] text-faint"
                >
                  <i
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: PLATFORM_COLORS[platform] }}
                  />
                  {PLATFORM_LABELS[platform]} {entity.platforms[platform]}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
