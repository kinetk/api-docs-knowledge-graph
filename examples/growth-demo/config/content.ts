import { brand } from "./brand";

/**
 * ============================================================================
 *  CONTENT  -  the authored WORDS
 * ============================================================================
 *  Every string the page renders lives here, so you can rebrand the whole demo
 *  without touching a component. `brand.name` is spliced in wherever the copy
 *  should carry your product's name.
 *
 *  The agent CONSOLE trace (the live tool calls to `create_context_job` etc.)
 *  stays in the components on purpose - it narrates what the agent actually does
 *  against the KINETK IP Graph, so it names the real tools it runs. Everything
 *  a visitor reads as marketing or section copy is here.
 * ============================================================================
 */

export const content = {
  /** Browser tab + share preview. */
  meta: {
    title: `${brand.name} - Launch & Growth Plans`,
    description: `Describe a product in one sentence and watch an AI agent pull the live market signal, then synthesize a grounded launch & growth plan. Powered by ${brand.name} on the KINETK IP Graph.`,
  },

  /** Small uppercase label above the hero. */
  eyebrow: `${brand.name} · Live Demo`,

  /** Hero, shown before the first run. `emphasis` is the gradient-filled span. */
  hero: {
    headlineLead: "Watch an agent build a",
    headlineEmphasis: "launch & growth plan for your product",
    subhead: `Describe your product in one sentence. ${brand.name} reads live social signal and generates an evidence-backed launch & growth plan.`,
  },

  /** The product input box. */
  input: {
    placeholder: "Describe your product in one sentence…",
    submitIdle: "Build the growth plan",
    submitBusy: "Working…",
    examplesLabel: "Try:",
    examples: [
      "a $400 sleep-tracking ring for anxious millennials",
      "a refillable matcha starter kit for Gen Z",
      "a weighted blanket for hot sleepers",
    ],
  },

  /** The "why a chatbot can't do this" explainer band. */
  explainer: {
    heading: "Why a chatbot can't do this",
    cards: [
      {
        title: "Grounded demand, not guesses",
        body: "A bare LLM invents angles from stale priors. Every hook, channel and proof point here is built on what's actually resonating around the category now — with the signal shown right beside it.",
      },
      {
        title: "Context over MCP, strategy from Gemini",
        body: "The agent runs the KINETK MCP workflow — create job, poll, fetch the insights result — then Gemini turns that live signal into a launch & growth plan. You watch both halves happen.",
      },
      {
        title: "Where it converts",
        body: "Per-platform engagement premiums, amplifier scores and tag arbitrage rank the channels and hooks — so 'how do I launch this' becomes a defensible, prioritized plan.",
      },
    ],
  },

  /** Bottom call-to-action. `href` is where visitors go to get a KINETK key. */
  cta: {
    heading: "Give your agents the KINETK MCP",
    accent: "KINETK MCP",
    buttonLabel: "Get your API key",
    href: "https://platform.kinetk.ai/login",
  },

  /** Agent console header. */
  console: {
    label: "agent · KINETK MCP + Gemini",
  },

  /** Placeholder copy in the result column before/while a plan is building. */
  status: {
    building: "Agent is working — Gemini authoring the launch plan…",
    awaiting: "Awaiting result…",
  },

  /** Titles + hints for each block of the rendered plan. */
  result: {
    launchPlanEyebrow: "Launch plan",
    hooks: {
      title: "Selling hooks",
      hint: "Top narratives by trendScore, turned into creative angles.",
    },
    audience: {
      title: "Who's buying",
      hint: "Target audience and underserved niche.",
    },
    telemetry: {
      title: "Telemetry narrative examples",
      hint: "Platform intelligence",
    },
    hashtags: {
      title: "Hashtag strategy",
      hint: "Momentum, emerging whitespace, and the strongest pairs.",
    },
    visual: {
      title: "Visual intelligence",
      hint: "The mood board the multimodal embeddings surfaced.",
    },
    proof: {
      title: "Proof — content that landed",
      hint: "Real posts behind the signal (metadata only; no deep-links).",
    },
  },
} as const;
