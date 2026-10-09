/**
 * Central config for the Growth Demo — single source of truth for SEO metadata,
 * sitemap, robots, and structured data (JSON-LD). Mirrors the pattern in
 * kinetk-main-website/lib/constants/site.ts.
 */

// This demo's own host.
export const SITE_URL = "https://growth-demo.kinetk.ai";

// The parent brand/org (the demo is a subdomain of the same entity).
export const MAIN_SITE_URL = "https://www.kinetk.ai";

export const SITE_NAME = "KINETK Growth Demo";
export const BRAND_NAME = "KINETK";
export const SITE_LEGAL_NAME = "KINETK, Inc.";

export const SITE_TITLE_DEFAULT =
  "KINETK Growth Demo — build a go-to-market strategy from the live social web";

export const SITE_DESCRIPTION =
  "Describe your product in one sentence and watch an AI agent pull the live " +
  "market signal from the KINETK IP Graph — narratives, creators, tag arbitrage " +
  "and per-platform engagement premiums — then have Gemini author an " +
  "evidence-backed go-to-market strategy: positioning, hooks, channels and proof.";

export const SITE_KEYWORDS = [
  "KINETK",
  "go-to-market strategy",
  "GTM strategy generator",
  "AI marketing agent",
  "social intelligence",
  "social listening",
  "trend detection",
  "creator intelligence",
  "knowledge graph",
  "MCP",
  "Model Context Protocol",
  "AI agents",
  "product launch strategy",
  "influencer marketing",
];

// External KINETK properties (for CTAs + structured data).
export const DOCS_URL = "https://docs.kinetk.ai";
export const API_ACCESS_URL = "https://platform.kinetk.ai/login";

// Social profiles — used for schema.org `sameAs`.
export const SOCIAL_URLS = [
  "https://x.com/Kinetk_ai",
  "https://www.instagram.com/kinetk.ai",
  "https://www.tiktok.com/@kinetk.ai",
  "https://www.youtube.com/@kinetk_ai",
] as const;

// X / Twitter handle for card attribution.
export const TWITTER_HANDLE = "@Kinetk_ai";
