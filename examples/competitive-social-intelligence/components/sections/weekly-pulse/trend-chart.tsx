"use client";

import { Fragment } from "react";
import { entities, WEEK_LABELS } from "@/lib/data";
import { formatCompact } from "@/lib/format";
import { useSelection } from "@/components/providers/selection-provider";

const WIDTH = 900;
const HEIGHT = 320;
const MARGIN = { left: 58, right: 16, top: 16, bottom: 34 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;
const Y_DIVISIONS = 4;
const LAST_WEEK = WEEK_LABELS.length - 1;

function niceCeil(n: number): number {
  if (n <= 0) return 100;
  const base = 10 ** Math.floor(Math.log10(n));
  const frac = n / base;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * base;
}

export function TrendChart() {
  const { selectedId, toggle } = useSelection();

  const maxValue = Math.max(...entities.flatMap((e) => e.weekly));
  const yMax = niceCeil(maxValue * 1.05);

  const xAt = (index: number) => MARGIN.left + (PLOT_W * index) / LAST_WEEK;
  const yAt = (value: number) =>
    MARGIN.top + PLOT_H - (PLOT_H * Math.min(value, yMax)) / yMax;

  const drawOrder = selectedId
    ? [
        ...entities.filter((e) => e.id !== selectedId),
        ...entities.filter((e) => e.id === selectedId),
      ]
    : entities;

  const selectedName = entities.find((e) => e.id === selectedId)?.name;

  return (
    <div className="rounded-[10px] border border-line bg-card px-6.5 pb-3.5 pt-7">
      <div className="mb-4 flex flex-wrap gap-5">
        {entities.map((entity) => {
          const dimmed = selectedId !== null && selectedId !== entity.id;
          return (
            <button
              key={entity.id}
              type="button"
              aria-pressed={selectedId === entity.id}
              onClick={() => toggle(entity.id)}
              style={{ opacity: dimmed ? 0.4 : 1 }}
              className="flex items-center gap-1.75 font-mono text-[11px] text-muted transition-opacity hover:opacity-75 focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2"
            >
              <i
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ background: entity.color }}
              />
              {entity.name}
            </button>
          );
        })}
      </div>

      <div className="relative h-80">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label="Weekly engagement trajectory by house"
        >
          {Array.from({ length: Y_DIVISIONS + 1 }, (_, division) => {
            const value = (yMax * division) / Y_DIVISIONS;
            const y = yAt(value);
            return (
              <Fragment key={division}>
                <line
                  x1={MARGIN.left}
                  y1={y}
                  x2={WIDTH - MARGIN.right}
                  y2={y}
                  className="stroke-ink/[0.07]"
                />
                <text
                  x={MARGIN.left - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-faint font-mono text-[10px]"
                >
                  {formatCompact(Math.round(value))}
                </text>
              </Fragment>
            );
          })}

          {WEEK_LABELS.map((label, index) => (
            <text
              key={label}
              x={xAt(index)}
              y={HEIGHT - MARGIN.bottom + 22}
              textAnchor="middle"
              className="fill-faint font-mono text-[10px]"
            >
              {label}
            </text>
          ))}

          {drawOrder.map((entity) => {
            const isSelected = selectedId === entity.id;
            const dimmed = selectedId !== null && !isSelected;
            const points = entity.weekly
              .map((value, index) => `${xAt(index)},${yAt(value)}`)
              .join(" ");
            return (
              <g key={entity.id} opacity={dimmed ? 0.28 : 1}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={entity.color}
                  strokeWidth={isSelected ? 3.5 : 1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={dimmed ? "3 3" : undefined}
                />
                {entity.weekly.map((value, index) => (
                  <circle
                    key={index}
                    cx={xAt(index)}
                    cy={yAt(value)}
                    r={isSelected ? 4.2 : 2.6}
                    fill={entity.color}
                  >
                    <title>{`${entity.name} - ${WEEK_LABELS[index]}: ${formatCompact(value)} pts`}</title>
                  </circle>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3.5 flex flex-wrap justify-between gap-5 border-t border-line pt-3.5">
        <span className="font-mono text-[11px] text-faint">
          Source: KINETK social knowledge graph - TikTok, Instagram, X, Reddit,
          Pinterest
        </span>
        <span className="font-mono text-[11px] text-faint">
          {selectedName
            ? `Isolating ${selectedName} - other lines dimmed`
            : "Click a house above (or a legend dot) to isolate its line"}
        </span>
      </div>
    </div>
  );
}
