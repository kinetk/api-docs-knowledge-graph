import { Fragment } from "react";
import { entities } from "@/lib/data";
import { computeStats } from "@/lib/metrics";
import { formatCompact, formatPercent } from "@/lib/format";

export function Ticker() {
  const stats = computeStats(entities);

  const pass = (duplicate: boolean) =>
    entities.map((entity, index) => {
      const stat = stats[entity.id];
      return (
        <Fragment key={`${duplicate ? "dup" : "main"}-${entity.id}`}>
          {index > 0 && (
            <span className="font-mono text-xs text-faint" aria-hidden>
              &#9670;
            </span>
          )}
          <span
            className="font-mono text-xs tracking-[0.02em] text-muted"
            aria-hidden={duplicate || undefined}
          >
            <span
              className="mr-1.75 inline-block h-1.5 w-1.5 rounded-full align-middle"
              style={{ background: entity.color }}
            />
            {entity.name}{" "}
            <b className="font-semibold text-ink">
              {formatPercent(stat.sharePct)}
            </b>{" "}
            share · {formatCompact(stat.score)} pts ·{" "}
            {stat.commentsPerPost.toFixed(2)} comments/post
          </span>
        </Fragment>
      );
    });

  return (
    <div className="group overflow-hidden whitespace-nowrap border-b border-line bg-surface py-2.25">
      <div className="inline-flex animate-marquee items-center gap-9.5 pl-[100%] group-hover:[animation-play-state:paused]">
        {pass(false)}
        <span className="font-mono text-xs text-faint" aria-hidden>
          &#9670;
        </span>
        {pass(true)}
      </div>
    </div>
  );
}
