import type { ReactNode } from "react";

export interface SectionMeta {
  num: string;
  kicker: string;
  title: string;
  note: string;
}

interface SectionProps {
  meta: SectionMeta;
  divider?: boolean;
  title?: string;
  id?: string;
  children: ReactNode;
}

export function Section({ meta, divider, title, id, children }: SectionProps) {
  return (
    <section
      id={id}
      className={`py-14 ${divider ? "border-t border-line" : ""}`}
    >
      <div className="mb-6.5 flex flex-wrap items-baseline justify-between gap-5">
        <div>
          <p className="font-mono text-xs tracking-widest text-faint">
            {meta.num} - {meta.kicker}
          </p>
          <h2 className="mt-1 font-display text-[26px] font-normal tracking-[-0.01em]">
            {title ?? meta.title}
          </h2>
        </div>
        <p className="max-w-90 text-right text-[13px] leading-normal text-faint max-[700px]:text-left">
          {meta.note}
        </p>
      </div>
      {children}
    </section>
  );
}
