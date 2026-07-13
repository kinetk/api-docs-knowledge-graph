import type { CSSProperties } from "react";

/**
 * ============================================================================
 *  BRANDING
 * ============================================================================
 *  Your identity, in one place. Change these to make the demo yours - the page
 *  copy lives next door in `config/content.ts`, only the branding moves here.
 *
 *  What lives where:
 *    - name / logo / contact  -> here.
 *    - brand accent colors     -> here (`colors`); injected over the defaults at
 *      runtime via `brandStyle` in `app/layout.tsx`.
 *    - neutral palette + fonts (ink background, surfaces, type) -> `app/globals.css`
 *      (`@theme` + `:root`). The ambient page gradient lives there too.
 *
 *  KINETK stays the backend engine the agent talks to (the live signal comes
 *  from the KINETK IP Graph over MCP); this is only YOUR product's face on it.
 * ============================================================================
 */

export const brand = {
  /** Your product name — replace this. Shows in the browser tab, the eyebrow and the subhead. */
  name: "GrowthDemo",

  /**
   * Optional wordmark image served from `public/` (e.g. "/logo.svg"). When
   * `null`, `name` is used as the logotype instead.
   */
  logo: null as string | null,

  /** How people reach you. Available for a footer / contact link. */
  contact: {
    email: "hello@example.com",
    url: "https://example.com",
  },

  /**
   * Brand accent colors. These override the `--kinetk-*` defaults from
   * `app/globals.css` at runtime, so recoloring here carries through every
   * `*-kinetk-cyan|teal|amber|yellow` utility across the app (the accent lines,
   * chips, the CTA button gradient and the hero wordmark).
   */
  colors: {
    cyan: "#00f5ff",
    teal: "#26aec0",
    amber: "#eeb248",
    yellow: "#ffd700",
  },
} as const;

/**
 * Inline CSS variables that push `brand.colors` onto the document root,
 * overriding the `:root` defaults in `app/globals.css`. Spread onto `<html>`.
 */
export const brandStyle: CSSProperties = {
  "--kinetk-cyan": brand.colors.cyan,
  "--kinetk-teal": brand.colors.teal,
  "--kinetk-amber": brand.colors.amber,
  "--kinetk-yellow": brand.colors.yellow,
} as CSSProperties;
