"use client";

import { entities } from "@/lib/data";
import { Pill } from "@/components/ui/pill";
import { useSelection } from "@/components/providers/selection-provider";

export function BrandSelector() {
  const { selectedId, toggle, clear } = useSelection();

  return (
    <div className="flex flex-wrap items-center gap-2.5 rounded-[10px] border border-line bg-surface px-6 py-5">
      <span className="mr-1.5 font-mono text-[11px] uppercase tracking-widest text-faint">
        I am -
      </span>
      {entities.map((entity) => (
        <Pill
          key={entity.id}
          active={selectedId === entity.id}
          accent={entity.color}
          aria-pressed={selectedId === entity.id}
          onClick={() => toggle(entity.id)}
        >
          {entity.name}
        </Pill>
      ))}
      <button
        type="button"
        onClick={clear}
        className="ml-auto rounded-full border border-line-strong px-4 py-2 text-xs text-faint transition-colors hover:border-muted hover:text-ink focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2"
      >
        Clear selection
      </button>
    </div>
  );
}
