import type { Platform } from "./types";

/**
 * Compact number formatting for dense metric labels:
 * 8_623_731 -> "8.62M", 84_332 -> "84.3K", 512 -> "512".
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

/** Fixed-decimal percentage, e.g. 26.153 -> "26.2%". */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** Human-readable platform labels (the data uses lowercase keys). */
export const PLATFORM_LABELS: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  reddit: "Reddit",
  pinterest: "Pinterest",
};
