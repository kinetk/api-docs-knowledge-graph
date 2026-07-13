import type { CSSProperties } from "react";

/**
 * ============================================================================
 *  BRANDING
 * ============================================================================
 *  Your identity, in one place. Change these to make the dashboard yours - the
 *  page copy stays exactly the same, only the branding moves.
 *
 *  What lives where:
 *    - name / logo / contact -> here.
 *    - brand accent colors    -> here (`colors`); injected over the defaults at
 *      runtime via `brandStyle` in `app/layout.tsx`.
 *    - neutral palette + fonts (surfaces, text, lines) -> `app/globals.css`
 *      (`@theme`). Derived tints and glows follow `colors` automatically.
 * ============================================================================
 */

export const brand = {
  /** Product name. Shows in the masthead eyebrow, the footer and the browser tab. */
  name: "Calibre",

  /**
   * Optional wordmark image served from `public/` (e.g. "/logo.svg"). When
   * `null`, `name` is rendered as the logotype instead.
   */
  logo: null as string | null,

  /** How people reach you. Shown in the footer. */
  contact: {
    email: "hello@calibre.example",
    url: "https://calibre.example",
  },

  /**
   * Brand accent colors. These override `--color-accent` / `--color-accent-2`
   * from `app/globals.css` at runtime, so recoloring here carries through every
   * `*-accent` utility plus the derived flag/live/glow tints.
   */
  colors: {
    accent: "#e0a458",
    accent2: "#6683f5",
  },
} as const;

/**
 * Inline CSS variables that push `brand.colors` onto the document root,
 * overriding the `@theme` defaults. Spread onto the `<html>` element.
 */
export const brandStyle: CSSProperties = {
  "--color-accent": brand.colors.accent,
  "--color-accent-2": brand.colors.accent2,
} as CSSProperties;
