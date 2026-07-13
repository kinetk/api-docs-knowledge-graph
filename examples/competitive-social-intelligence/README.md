# Calibre - Competitive Social Intelligence Dashboard

A single-page, fully data-driven competitive social intelligence dashboard built with
Next.js (App Router) and React. It reads a competitive set of subjects and
renders share of voice, a weekly engagement trend, a per-subject playbook,
summary metrics and auto-clustered content narratives - with an optional live
refresh straight from the KINETK graph over MCP.

It ships as a template. The numbers are **pulled** from KINETK into a JSON file,
the words are **authored** in a config file, and the branding lives in a third -
so you can point it at your own subjects without touching the UI. A ready-made
luxury-watch dataset is included as the worked example, but nothing in the UI is
watch-specific - point it at any set of subjects and the whole page follows.

## Quick start

Download the template and install its dependencies in one step (`--install`
runs the package manager for you):

```bash
npx giget@latest gh:andrijaweb/competitive-social-intelligence my-dashboard --install
```

Then run the dev server:

```bash
cd my-dashboard
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The template ships with a
generated dataset (`data/watches.json`), so it renders immediately - **no API
key needed** just to see it run. You only need a key to pull fresh data for your
own subjects or to use the live refresh (both covered below).

Scripts: `npm run dev` (develop), `npm run build` + `npm run start`
(production), `npm run lint` (lint), `npm run pull` (regenerate the dataset from
KINETK - see [Change the subject](#3-change-the-subject---configsubjectsts)).

## Add your API key

The key is used in two places: `npm run pull` (to generate the dataset) and the
optional live refresh. It always stays on the server and is never exposed to the
browser.

Copy the example env file and paste in your key:

```bash
cp .env.example .env.local
```

```bash
# .env.local
KINETK_API_KEY=sk-...        # from https://platform.kinetk.ai
```

`.env.local` is gitignored, so your key is never committed. Get the key from
[platform.kinetk.ai](https://platform.kinetk.ai); it is sent to the KINETK MCP
endpoint as the `x-api-key` header. (Advanced: set `KINETK_MCP_URL` to override
the endpoint per workspace - optional, defaults to the public graph.)

## Make it yours

A few small files hold everything you would change. The UI reads from them - you
should not need to edit the components.

> **Prefer to hand it off?** Everything below is agent-friendly. Open this repo
> (or paste this README) in Claude Code, Codex or a similar coding agent and it
> can run the whole setup for you - branding, subjects, the pull - and it will
> offer to write the per-subject playbooks from your freshly pulled data. The
> conventions it follows live in [AGENTS.md](AGENTS.md).

### 1. Branding - [config/brand.ts](config/brand.ts)

This is the single place for your identity:

- **`brand.name`** - the product name, shown in the browser tab, masthead
  eyebrow and footer.
- **`brand.logo`** - an optional wordmark image served from `public/` (e.g.
  `/logo.svg`); falls back to `name` as the logotype when left `null`.
- **`brand.colors`** - the two brand accents. They override the CSS defaults at
  runtime, so a recolor here flows through every `*-accent` utility and the
  derived flag/live/glow tints.
- **`brand.contact`** - the email and URL shown in the footer.

### 2. Colors and fonts - [app/globals.css](app/globals.css)

The neutral palette and typography are Tailwind theme tokens in the `@theme`
block. Edit a value there (`--color-card`, `--font-display`, ...) and every
matching utility (`bg-card`, `font-display`) updates across the app. The two
brand accents (`--color-accent` / `--color-accent-2`) are defaults that
[config/brand.ts](config/brand.ts) overrides at runtime, so recolor those in
`brand.ts`. Translucent tints (glows, the caveat box, status tags) are derived
with `color-mix`, so they follow along automatically. Per-subject accent colors
(Rolex gold, etc.) are data - they live in [config/subjects.ts](config/subjects.ts).

### 3. Change the subject - [config/subjects.ts](config/subjects.ts)

This is the heart of the template. The data model has two halves:

- **Numbers are pulled.** `npm run pull` fetches live engagement from KINETK and
  writes `data/<topic>.json`. You never hand-edit that file.
- **Words are authored.** Your headline, section copy and per-subject playbooks
  live in [config/content.ts](config/content.ts) and survive every pull.

To point the dashboard at your own competitive set:

1. **Define the subjects** in [config/subjects.ts](config/subjects.ts). Add (or
   edit) a topic in the `TOPICS` map. Each subject is one card on the page:
   `query` is a plain KINETK search topic (any string), `name` is an optional
   display override, and `color` is that subject's accent across the whole UI.
   Set `window` and `limit` for the pull. Any number of subjects works - it does
   not have to be five. Then set `ACTIVE_TOPIC` to the topic you want to render.

   > KINETK does **not** pick the competitor set for you - a category query
   > returns content themes, not a ranked brand list. You name the subjects; the
   > pull fills in each one's numbers.

2. **Pull the data.** With your API key in `.env.local` (see above), run:

   ```bash
   npm run pull
   ```

   This reads `ACTIVE_TOPIC`, hits KINETK once per subject, and writes
   `data/<topic>.json`. (To pull a topic other than the active one, pass it
   explicitly: `npm run pull -- --topic=<topic>`.)

3. **Register the dataset** in [lib/data.ts](lib/data.ts) if the topic is new:
   import your JSON and add it to the `DATASETS` map.

   ```ts
   import myTopicData from "@/data/my-topic.json";

   const DATASETS: Record<string, Dataset> = {
     watches: watchesData as unknown as Dataset,
     "my-topic": myTopicData as unknown as Dataset,
   };
   ```

4. **(Optional) Customize the copy** in [config/content.ts](config/content.ts).
   You don't have to: every topic falls back to the generic `DEFAULT_CONTENT`
   (masthead, section notes, footer) written in neutral wording, so a new topic
   renders with no edits here. To override, add an entry keyed by your topic with
   **only** the fields worth changing - a sharper headline, or hand-written
   `playbooks`. Copy tokens `{brand}`, `{subjects}` and `{platforms}` are filled
   in from the active dataset at render time. The `playbooks` - the one piece
   that reads like real analysis - get their own step below.

The aggregate metrics - engagement score, share of voice, comments-per-post -
are **derived** in [lib/metrics.ts](lib/metrics.ts) from the raw counts, so they
can never fall out of sync. Adjust `ENGAGEMENT_WEIGHTS` there to change how the
score is weighted.

### 4. Write the playbooks - the one LLM step

Three tiers of content feed the page, and only the last one needs a writer:

1. **Numbers** - engagement metrics, pulled into `data/<topic>.json`. No model.
2. **Insights** - the clustered narratives and whitespace tags in section 06,
   straight from KINETK into the same file. Still no model.
3. **Playbooks** - the per-subject `headline` / `drivers` / `counters` / `caveat`
   in [config/content.ts](config/content.ts). This is the only piece that reads
   the numbers *and* the insights and turns them into an argument, so it's the
   one part an LLM (or you) actually writes.

You don't have to write them. Any subject without an authored playbook renders a
plain, no-LLM summary built from its own numbers (`fallbackPlaybook` in
[lib/data.ts](lib/data.ts)), so the page is complete either way.

For the richer version, hand it to a coding agent: with `data/<topic>.json`
freshly pulled, open the repo in Claude Code, Codex or similar and ask it to
write the playbooks. It has everything it needs - the pulled data, the shipped
`watches` playbooks as a style example, and the `Playbook` shape in
[lib/types.ts](lib/types.ts) - and [AGENTS.md](AGENTS.md) tells it exactly how.

One caveat: playbooks cite hard numbers ("2,500 records", "18.4% share"), so a
re-pull makes them stale. Re-run this step - or just ask the agent to refresh
them - after each pull.

## Optional: live refresh

Section 06 has a "Refresh live from KINETK" button. It calls the
`app/api/insights/*` route handlers ([start](app/api/insights/start/route.ts) +
[status](app/api/insights/status/route.ts)), which open an MCP connection to the
KINETK graph, pull fresh `insights` for one subject, and map the structured
narratives and tag signals into the section. The job runs as a short async
poll loop so no single request is held open. No model is involved - the
summaries come straight from KINETK. Your key stays on the server.

It is entirely optional. With no `KINETK_API_KEY` configured, the route returns
503, and the dashboard keeps rendering the built-in snapshot from
`data/<topic>.json` while the button reports that live refresh is not set up.

## Project structure

Section-based: each page section is its own folder under `components/sections`;
shared primitives live in `components/ui` and cross-section state in
`components/providers`. Component files are kebab-case; the exported component
stays PascalCase.

```
app/
  layout.tsx                Root layout: fonts, metadata, brand color injection
  page.tsx                  Composes the sections in order
  globals.css               Tailwind + the @theme design tokens
  api/insights/
    start/route.ts          Live-refresh: submit a job, return a jobId
    status/route.ts         Live-refresh: poll one job (server-side)
components/
  ui/                       Shared primitives (section, pill)
  providers/
    selection-provider.tsx  Cross-section "which subject am I?" state
  sections/                 One folder per page section
    ticker/  masthead/  share-of-voice/  brand-selector/
    weekly-pulse/  playbook/  summary-metrics/  narratives/  footer/
config/
  brand.ts                  Branding: name, logo, colors, contact  <- edit to rebrand
  subjects.ts               Subjects + active topic (pull INPUT)    <- edit for your subjects
  content.ts                Authored copy + playbooks (the WORDS)   <- edit your headlines
data/
  watches.json              Generated numbers, one file per topic   <- written by `npm run pull`
scripts/
  pull.mts                  `npm run pull`: KINETK -> data/<topic>.json
lib/
  data.ts                   Merges pulled numbers + authored words for the active topic
  pull-core.ts              Shapes raw KINETK results into a dataset (used by the pull)
  kinetk.ts                 Server-side MCP client for the live refresh
  metrics.ts                Derived metrics (score, share of voice)
  format.ts                 Number and label formatting
  types.ts                  Domain types
```

## How it is built

- **Two-phase data model.** A build-time pull (`scripts/pull.mts` +
  `lib/pull-core.ts`) turns KINETK results into `data/<topic>.json`; authored
  copy in `config/content.ts` is merged over it at render time in `lib/data.ts`.
- **Next.js App Router** with React Server Components. Static, data-driven
  sections render on the server; only the interactive pieces (brand selection,
  the trend chart, the accordion) are client components.
- **Tailwind CSS v4** with the palette, fonts and derived tints declared as
  `@theme` tokens in `app/globals.css` - no separate Tailwind config file.
- **`next/font`** self-hosts the fonts (Fraunces, Inter, IBM Plex Mono).
- **Hand-built SVG** for the share-of-voice dial and the trend chart - no
  charting dependency.
