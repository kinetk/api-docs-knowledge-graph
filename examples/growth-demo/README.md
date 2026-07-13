# Growth Demo — Launch & Growth Plan Agent

Pass a product in one sentence and watch an AI agent build a grounded
**launch & growth plan** for it — with the live market signal shown right beside
the plan, so nothing is taken on faith.

**Live demo:** [growth-demo.kinetk.ai](https://growth-demo.kinetk.ai)

1. The agent runs the KINETK MCP workflow — `create_context_job` →
   `get_context_job_status` → `get_context_job_result` — on one **`insights`**
   job. It returns the live signal around the product's category: narratives,
   audiences, per-platform telemetry, hashtag dynamics and the records' visual
   enrichment.
2. **Gemini** (`gemini-3.5-flash`) turns that signal into a plan: positioning, a
   week-one play, selling hooks, the audience that's buying, the channels that
   convert, a hashtag strategy and a visual theme.
3. The UI renders the plan next to the live signal it was built on.

It ships as a **template**. The plan is generated **live** from KINETK on every
run, and the branding is **authored** in a config file while the page copy lives
in a second — so you can put your own product's face on it without touching the
UI. KINETK stays the backend engine the agent talks to; only the branding moves.

## Quick start

Download the template and install its dependencies in one step (`--install`
runs the package manager for you):

```bash
npx giget@latest gh:kinetk/api-docs-knowledge-graph/examples/growth-demo#main my-growth-app --install
```

Then add your keys (next section) and run the dev server:

```bash
cd my-growth-app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page renders
immediately, but building a plan is **live-only** — there is no bundled dataset,
so you need the two API keys below before the agent can run.

Scripts: `npm run dev` (develop), `npm run build` + `npm run start`
(production), `npm run lint` (lint).

## Add your API keys

The keys are used server-side only — for the KINETK pull and the Gemini
synthesis. They always stay on the server and are never exposed to the browser.

Copy the example env file and paste in your keys:

```bash
cp .env.example .env
```

```bash
# .env
KINETK_API_KEY=sk-...        # from https://platform.kinetk.ai/login
GEMINI_API_KEY=AIza...       # from https://aistudio.google.com/apikey
```

- **`KINETK_API_KEY`** — KINETK Graph Service key; the agent pulls the live
  `insights` signal with it. (Advanced: set `KINETK_API_BASE` to override the
  endpoint per workspace — optional, defaults to `https://api.kinetk.ai/graph`.)
- **`GEMINI_API_KEY`** — used server-side for the Gemini synthesis step.

`.env` is gitignored, so your keys are never committed.

## Make it yours

Two small files hold everything you would change. The UI reads from them — you
should not need to edit the components.

### 1. Branding — [config/brand.ts](config/brand.ts)

This is the single place for your identity:

- **`brand.name`** — the product name, shown in the browser tab, the eyebrow and
  the hero subhead.
- **`brand.logo`** — an optional wordmark image served from `public/` (e.g.
  `/logo.svg`); falls back to `name` as the logotype when left `null`.
- **`brand.colors`** — the four brand accents (cyan / teal / amber / yellow).
  They override the CSS defaults at runtime, so a recolor here flows through
  every accent line and chip, the CTA button gradient and the hero wordmark.
- **`brand.contact`** — the email and URL for a contact/footer link.

### 2. Colors and fonts — [app/globals.css](app/globals.css)

The neutral palette (the ink `--background` / `--foreground`), the ambient
page-gradient atmosphere and the type scale are declared here. The four brand
accents (`--kinetk-cyan` … `--kinetk-yellow`) are **defaults** that
[config/brand.ts](config/brand.ts) overrides at runtime, so recolor those in
`brand.ts`. Fonts are self-hosted with `next/font` in
[app/layout.tsx](app/layout.tsx) and exposed as `@theme` tokens here.

### 3. Change the copy — [config/content.ts](config/content.ts)

Every string the page renders — the tab title, the eyebrow, the hero, the input
placeholder and its example prompts, the "why a chatbot can't do this" cards,
the call-to-action, and each result section's title — lives here. `brand.name`
is spliced in wherever the copy should carry your product's name, so renaming in
`brand.ts` updates the copy too.

> The agent **console** trace (the live `create_context_job` → poll → result
> calls) stays in the components on purpose: it narrates what the agent actually
> runs against the KINETK IP Graph, so it names the real tools.

## How it works

`/api/agent` is a short-request + client-polling endpoint (POST is never
CDN-cached), so the browser drives the ~60–110s context job and the synthesis
without any single request exceeding the 60s serverless budget:

| action       | does                                                                |
| ------------ | ------------------------------------------------------------------ |
| `start`      | submits the `insights` job, returns `jobId`                         |
| `poll`       | polls once; reports `ready` when the job completes                  |
| `synthesize` | fetches the result, maps it to growth signals, calls Gemini → plan  |

The plan is produced with Gemini's **structured-output** mode
(`responseMimeType: "application/json"` + `responseSchema`), so the model is
constrained to the plan JSON schema — no parsing guesswork.

- KINETK client (server-only): [`lib/kinetk/client.ts`](lib/kinetk/client.ts)
- Insights → growth signals: [`lib/kinetk/map-insights.ts`](lib/kinetk/map-insights.ts)
- Gemini synthesis: [`lib/kinetk/synthesize.ts`](lib/kinetk/synthesize.ts)
- Orchestration + console: [`components/agent/`](components/agent/)

## Project structure

```
app/
  layout.tsx      Root layout: fonts, metadata, brand color injection
  page.tsx        Landing page: hero, explainer band, call-to-action
  globals.css     Tailwind + @theme tokens, neutral palette, page gradient
  api/agent/
    route.ts      start | poll | synthesize — the short-request agent endpoint
components/
  agent/          The live run: product input, console trace, result view
  ui/             Shared primitives (button)
config/
  brand.ts        Branding: name, logo, colors, contact   <- edit to rebrand
  content.ts      Authored page copy (the WORDS)           <- edit your copy
lib/kinetk/
  client.ts       Server-side KINETK Graph client
  map-insights.ts Insights result -> growth signals
  synthesize.ts   Gemini structured-output synthesis
  types.ts        Domain types
```

## How it is built

- **Live, two-phase run.** The browser drives a short-request loop against
  `/api/agent` (start → poll → synthesize), so no single request exceeds the 60s
  serverless budget while the ~60–110s KINETK job and the Gemini call complete.
- **Next.js App Router** with React Server Components. The static shell (hero,
  explainer, CTA) renders on the server; only the live run — input, console and
  result — is a client island.
- **Tailwind CSS v4** with the palette, accents and fonts declared as `@theme`
  tokens in `app/globals.css` — no separate Tailwind config file.
- **`next/font`** self-hosts the fonts (Bebas Neue, Inter, Space Grotesk,
  JetBrains Mono).
```
