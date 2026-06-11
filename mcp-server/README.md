# kinetk-mcp-server

MCP (Model Context Protocol) server that exposes the KINETK Knowledge Graph async-job API to AI agents.

Agents submit *intent-shaped* context jobs — the MCP handles auth, queueing, polling semantics, and response normalization. Underneath it just talks HTTPS to the deployed **graph-service** (`POST /intelligence/jobs`, `GET /intelligence/jobs/{id}`).

## Tools

### `create_context_job`
Submit an async job. Pick `kind` based on how much analysis depth you want:

| `kind`                  | Output                                                                    |
|-------------------------|---------------------------------------------------------------------------|
| `intelligence_records`   | Ranked content with vector similarity + Postgres metadata.                |
| `intelligence_signals` | Search + narratives + tag/creator analytics + LLM insights.               |
| `campaign_brief`        | Persisted LLM-generated campaign brief (heavier).                         |
| `llm_context`           | Ephemeral LLM-ready campaign context bundle.                              |

`intelligence_records` / `intelligence_signals` need `query`. `campaign_brief` / `llm_context` need `campaign`. Common filters (`platforms`, `window`) and options (`topK`, `expandQuery`, etc.) work across kinds. `topK` maps to graph-service's `limit` (default 1000 server-side; capped client-side at 1000 to keep agent payloads bounded).

Returns `{ jobId, kind, status, fromCache }`. If the backend already has a fresh cached run, `status` is `succeeded` and the result is fetched in O(1) on the next call.

### `get_context_job_status`
Returns `{ jobId, kind, status, submittedAt, startedAt, completedAt, error? }`. `status` is `queued | running | completed | failed`. Cheap to poll.

### `get_context_job_result`
Returns the slim envelope by default (token-efficient): per-item `id`, `platform`, `title`, `tags`, `similarity`, `engagement`, `creator`, plus the graph and (for `intelligence_signals`) narratives + insights. Pass `verbose: true` to get the full untouched graph-service payload.

If the job is still running, returns `{ status: "pending" }` instead of erroring.

## Setup

```bash
cd mcp-server
npm install
npm run build
cp .env.example .env
# fill in GRAPH_SERVICE_URL and GRAPH_SERVICE_API_KEY
```

Required env:

| Var                       | What                                                            |
|---------------------------|-----------------------------------------------------------------|
| `GRAPH_SERVICE_URL`       | Base URL of the deployed graph-service API (e.g. `https://api.kinetk.ai/graph`). |
| `GRAPH_SERVICE_API_KEY`   | API Gateway key. Sent as `x-api-key` on every request.          |
| `GRAPH_SERVICE_TIMEOUT_MS`| Optional. Per-request HTTP timeout (default 10000).             |



## Using the MCP

Mention `kinetk` in the prompt so the LLM knows to call this MCP rather than answer from training. You can either name the query type (`intelligence_records`, `intelligence_signals`, `campaign_brief`, `llm_context`) or describe what you want and let the agent pick. Without that cue, the LLM may just answer from its general knowledge and skip the MCP entirely.

**Examples:**
- *"Use kinetk to find trending content about luxury watches in the last 7 days."* — agent picks the query type.
- *"Submit an `intelligence_signals` job via kinetk for `luxury watch culture 2026`."* — you pick the type explicitly.



---

## Development

```bash
npm run lint     # tsc --noEmit
npm run build    # tsc -> dist/
npm run start    # node dist/index.js (run after build)
```

Stdout is reserved for MCP protocol frames — anything the server logs goes to stderr. If you launch it manually for debugging, frames will print to your terminal.


## Distribution

v0 distribution is **clone-and-build**. Users follow the install guide in [`fern/pages/mcp/installation.mdx`](../fern/pages/mcp/installation.mdx) to clone this repo, build, and point their AI client at `dist/index.js`.

Publishing to npm as `kinetk-mcp` for `npx kinetk-mcp`-style installs is a planned DX upgrade — not in v0.

## Roadmap

- HTTP/SSE transport (currently stdio-only) — unlocks ChatGPT Connectors and remote use cases.
- `npm publish` so users can run `npx kinetk-mcp` without cloning.
