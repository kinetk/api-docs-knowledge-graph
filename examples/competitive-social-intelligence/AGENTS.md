<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Setting this up for a new subject (agent guide)

A user may open this repo and ask you to point the dashboard at their own subjects. It's a template with a deliberate split - honor the split:

- **Numbers and insights are pulled, never authored.** `npm run pull` writes `data/<topic>.json` — engagement metrics, KINETK's clustered narratives, whitespace tags and top posts. No model is involved and you never hand-edit this file.
- **Playbooks are the one authored piece.** The per-subject analysis in `config/content.ts` (`headline` / `drivers` / `counters` / `caveat`) is the only thing an LLM writes. Everything else — copy, colors, branding — is static config or generated numbers.

## Setup flow

1. **Branding** — set `brand.name`, colors and contact in `config/brand.ts`.
2. **Subjects** — define the competitor set in `config/subjects.ts`: add a topic to `TOPICS` (each subject is `{ query, name?, color }`, plus `window` and `limit`), then point `ACTIVE_TOPIC` at it. KINETK does not pick the set — the user names the subjects.
3. **API key** — make sure `KINETK_API_KEY` is in `.env.local` (copy `.env.example`). Without it the pull can't run and the app just renders the shipped `data/watches.json`.
4. **Pull** — run `npm run pull` (or `npm run pull -- --topic=<topic>`). This writes `data/<topic>.json`.
5. **Register** — if the topic is new, import the JSON and add it to `DATASETS` in `lib/data.ts`.
6. **Offer to write the playbooks** (see below). This is the step to _ask the user about_ — don't assume.

## Writing the playbooks

After the pull, ask the user: **"Want me to write the per-subject playbooks from the freshly pulled data, or leave the auto-generated summaries?"** If they decline, the page already renders a plain, no-LLM `fallbackPlaybook` (in `lib/data.ts`) built from each subject's own numbers — fine to ship as-is.

If they say yes:

- **Read `data/<topic>.json`.** Each entity has everything you need: `metrics` (records/views/likes/comments/shares), `narratives`, `whitespace` tags and top `posts`. Share of voice and comments-per-post are _derived_ — compute them via `computeStats` in `lib/metrics.ts`, don't guess.
- **Match the shape** in `lib/types.ts`: `{ headline, drivers: string[], counters: string[], caveat: string | null }`.
- **Use the shipped `watches` playbooks in `config/content.ts` as the style example** — a sharp one-line `headline`, 2–3 evidence-backed `drivers` that cite real figures, 2–3 actionable `counters`, and a `caveat` (or `null`) that flags anything misleading in the data.
- **Write them into `CONTENT["<topic>"].playbooks`**, keyed by each entity's `id` exactly as it appears in `data/<topic>.json` (a slug of the name, e.g. `patek-philippe`).
- **Ground every number in the JSON.** Don't invent figures. If a subject's top posts are off-topic viral bleed-through, say so in the `caveat` — that honesty is the whole point of the example playbooks.

**On a re-pull the numbers move but the playbooks don't**, so they go stale — a `headline` citing "2,500 records" or "18.4% share" is now wrong. Whenever the user re-pulls, offer to rewrite the affected playbooks the same way.
