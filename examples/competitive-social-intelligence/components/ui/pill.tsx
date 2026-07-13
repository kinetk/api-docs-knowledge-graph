import type { ButtonHTMLAttributes, CSSProperties } from "react";

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  accent?: string;
}

export function Pill({
  active,
  accent,
  className = "",
  style,
  children,
  ...props
}: PillProps) {
  const activeStyle: CSSProperties | undefined =
    active && accent
      ? { backgroundColor: accent, borderColor: accent }
      : undefined;

  return (
    <button
      type="button"
      style={{ ...style, ...activeStyle }}
      className={`rounded-full border px-4 py-2 text-[13.5px] transition-colors focus-visible:outline-1 focus-visible:outline-accent focus-visible:outline-offset-2 ${
        active
          ? "font-semibold text-canvas"
          : "border-line-strong font-medium text-muted hover:border-muted hover:text-ink"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
