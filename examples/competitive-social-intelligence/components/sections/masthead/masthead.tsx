import { content } from "@/lib/data";

export function Masthead() {
  const { eyebrow, headline, description } = content.masthead;
  return (
    <header className="pb-10 pt-14">
      <p className="mb-5.5 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-faint before:w-6.5 before:border-t before:border-faint before:content-['']">
        {eyebrow}
      </p>
      <h1 className="mb-4.5 max-w-205 font-display text-[clamp(34px,5vw,58px)] font-normal leading-[1.04] tracking-[-0.01em]">
        {headline.lead}{" "}
        <em className="font-light italic text-accent">{headline.emphasis}</em>{" "}
        {headline.trail}
      </h1>
      <p className="max-w-150 text-[16.5px] leading-[1.65] text-muted">
        {description}
      </p>
    </header>
  );
}
