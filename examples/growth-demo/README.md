# Growth Demo — KINETK API + MCP showcase

Pass a product in one sentence and watch an AI agent build a grounded
**launch & growth plan** for it:

1. The agent runs the KINETK MCP workflow — `create_context_job` → `get_context_job_status` → `get_context_job_result` — on one **`insights`** job. It returns the live signal around the product's category: narratives, audiences, per-platform telemetry, hashtag dynamics and the records' visual enrichment.
2. **Gemini** (`gemini-3.5-flash`) turns that signal into a plan: positioning, a week-one play, selling hooks, the audience that's buying, the channels that convert, a hashtag strategy and a visual theme.
3. The UI renders the plan next to the live signal it was built on, so nothing is taken on faith.

This is a sibling of [`agent-gtm`](../agent-gtm): same KINETK `insights` job and
design language, but framed around taking a product to market with a launch &
growth plan rather than a GTM brief.

## How it works

`/api/agent` is a short-request + client-polling endpoint (POST is never
CDN-cached), so the browser drives the ~60-110s context job and the synthesis
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

## Run it locally

```bash
npm install
cp .env.example .env          # then fill in the two keys below
npm run dev                   # http://localhost:3000
```

Required environment variables (`.env`):

- `KINETK_API_KEY` — KINETK Graph Service key (this demo uses real data only). Get one at <https://platform.kinetk.ai/login>.
- `GEMINI_API_KEY` — used server-side for the Gemini synthesis step. Get one at <https://aistudio.google.com/apikey>.
- `KINETK_API_BASE` *(optional)* — defaults to `https://api.kinetk.ai/graph`.

## Deploy (SST → AWS)

```bash
npx sst secret set KinetkApiKey "sk_..."   --stage prod
npx sst secret set GeminiApiKey "AIza..."  --stage prod
npx sst deploy --stage prod
```

The Lambda timeout is set to 60s; the browser polling loop keeps each request
well inside it.
