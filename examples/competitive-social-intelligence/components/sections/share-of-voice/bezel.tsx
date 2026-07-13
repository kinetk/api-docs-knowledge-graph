import { entities } from "@/lib/data";
import { computeStats, totalEngagementScore } from "@/lib/metrics";
import { formatCompact, formatPercent } from "@/lib/format";

const CENTER = 140;
const R_OUTER = 132;
const R_TICK_INNER = 120;
const R_ARC = 100;
const ARC_WIDTH = 26;
const GAP_DEG = 2.2;
const TICK_COUNT = 60;

interface Point {
  x: number;
  y: number;
}

function polar(r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(rad), y: CENTER + r * Math.sin(rad) };
}

function arcPath(r: number, startDeg: number, endDeg: number): string {
  const start = polar(r, endDeg);
  const end = polar(r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function Bezel() {
  const stats = computeStats(entities);
  const total = totalEngagementScore(entities);

  const sweeps = entities.map(
    (entity) => (stats[entity.id].sharePct / 100) * 360,
  );
  const startAngles = sweeps.map((_, i) =>
    sweeps.slice(0, i).reduce((sum, sweep) => sum + sweep, 0),
  );
  const arcs = entities.map((entity, i) => {
    const start = startAngles[i];
    const sweep = sweeps[i];
    return {
      entity,
      d: arcPath(R_ARC, start + GAP_DEG / 2, start + sweep - GAP_DEG / 2),
      visible: sweep > GAP_DEG,
    };
  });

  return (
    <div className="relative h-70 w-70 shrink-0">
      <svg
        viewBox="0 0 280 280"
        className="block h-70 w-70 overflow-visible"
        role="img"
        aria-label="Share of voice by engagement score"
      >
        {Array.from({ length: TICK_COUNT }, (_, i) => {
          const deg = i * (360 / TICK_COUNT);
          const isMajor = i % 5 === 0;
          const outer = polar(R_OUTER, deg);
          const inner = polar(
            isMajor ? R_TICK_INNER - 4 : R_TICK_INNER + 4,
            deg,
          );
          return (
            <line
              key={i}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              className={isMajor ? "stroke-ink/35" : "stroke-ink/[0.14]"}
              strokeWidth={isMajor ? 1.6 : 1}
            />
          );
        })}

        <circle
          cx={CENTER}
          cy={CENTER}
          r={R_ARC}
          fill="none"
          className="stroke-ink/[0.07]"
          strokeWidth={ARC_WIDTH}
        />

        {arcs.map(
          ({ entity, d, visible }) =>
            visible && (
              <path
                key={entity.id}
                d={d}
                fill="none"
                stroke={entity.color}
                strokeWidth={ARC_WIDTH}
                strokeLinecap="round"
                opacity={0.92}
              >
                <title>{`${entity.name}: ${formatPercent(stats[entity.id].sharePct)}`}</title>
              </path>
            ),
        )}
      </svg>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="font-display text-[15px] tracking-[0.02em] text-faint">
          {formatCompact(total)}
        </div>
        <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-faint">
          engagement pts
        </div>
      </div>
    </div>
  );
}
