# kinetk-mcp-server

MCP (Model Context Protocol) server that exposes the KINETK Knowledge Graph job API to AI agents.

Agents submit *intent-shaped* context jobs — the MCP handles auth, queueing, polling semantics, and response normalization. Underneath it talks to the deployed [`graph-service/`](../graph-service/) (`POST /intelligence/jobs`, `GET /intelligence/jobs/{id}`).

Two ways to run it:
- **stdio** (this package) — the client launches it as a subprocess; good for local dev and desktop clients. See [Install in an MCP client](#install-in-an-mcp-client).
- **hosted HTTP** — the same tool core runs as a route on graph-service's API (`POST …/graph/mcp`), so external customers connect over the network with their KINETK API key. The handler lives in `graph-service/src/intelligence/mcp/`; see [Hosted (remote HTTP)](#hosted-remote-http).

## Tools

### `get_context` (preferred)
One-shot: submit a job **and wait** for the result, returned inline in a single call. Use this by default for interactive queries. Same input as `create_context_job` plus optional `verbose`. If the job is still running after the synchronous wait budget (~25s), it returns `{ status: "pending", jobId }` so you can fall back to the async trio below for the long tail. Keep `limit` modest (e.g. 200–1000) since the result comes back inline.

### `create_context_job`
Async alternative: submit a job and return immediately with a `jobId`, without waiting. Use only for jobs you expect to be slow (`window:all`, `expandQuery`, large insights pulls) or to fire-and-forget. The MCP exposes exactly **two** kinds (`records` and `insights`, plus their `graph_*`/`intelligence_*` aliases). Pick `kind` by what you want back:

| `kind`                  | Needs                          | Output                                                                    |
|-------------------------|--------------------------------|---------------------------------------------------------------------------|
| `records` (`intelligence_records`)  | `query` + `window` + `limit`   | Ranked content with vector similarity + Postgres metadata.    |
| `insights` (`intelligence_signals`) | `query` + `window` + `limit`   | Synthesized insight signals (narratives + tag/theme/whitespace), STRUCTURED by default. Add `includeSignals:true` for the LLM prose lines. |

`limit` is **required** for both kinds — how many records to retrieve, **100–3000** through this tool, **billed per record, no default** (you choose the spend). `window` is also **required** for both kinds: `filters.window` is `7d | 30d | all` and defaults to `all` if omitted. `insights` with `includeSignals:true` runs over the full corpus, so it additionally requires `window:"all"` **and** `limit:3000` (the only valid limit given the 3000 cap) — the MCP rejects other combinations before submit.

Returns `{ jobId, kind, status, fromCache }`. Status vocabulary: `create_context_job` reports `queued | running | succeeded | failed`; `get_context_job_status` reports a finished job as `completed` — treat `succeeded` and `completed` as the same terminal state.

### `get_context_job_status`
Returns `{ jobId, kind, status, submittedAt, startedAt, completedAt, error? }`. `status` is `queued | running | completed | failed`. Cheap to poll — jobs typically finish in ~5–20s; poll every ~3s, up to ~2 min, before treating as stuck.

### `get_context_job_result`
Returns the slim envelope by default (token-efficient): per-item `id`, `platform`, `title`, `tags`, `similarity`, `engagement`, `creator`, plus the graph and (for `insights`) the structured signals (and the prose arrays when `includeSignals:true` was set). Pass `verbose: true` to get the full untouched graph-service payload.

If the job is still running, returns `{ status: "pending" }` instead of erroring (normal — keep polling, not a failure).

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

Mention `kinetk` in the prompt so the LLM knows to call this MCP rather than answer from training. You can either name the query type (`records` / `intelligence_records`, or `insights` / `intelligence_signals`) or describe what you want and let the agent pick. Without that cue, the LLM may just answer from its general knowledge and skip the MCP entirely.

**Examples:**
- *"Use kinetk to find trending content about luxury watches in the last 7 days."* — agent picks the query type.
- *"Submit an `insights` job via kinetk for `luxury watch culture 2026`."* — you pick the type explicitly.


## Install in an MCP client

The MCP runs over **stdio** — clients launch it as a subprocess and speak JSON-RPC on its stdin/stdout. Find the absolute path to your `node` binary first (it must be on the client's PATH or you must use the absolute path, which is the safe default):

```bash
which node
# e.g. /usr/local/bin/node  or  /opt/homebrew/bin/node
```

Use that path in every config below.

### Claude Code (CLI)

Easiest — one command:

```bash
claude mcp add kinetk \
  -e GRAPH_SERVICE_URL=https://api.kinetk.ai/graph \
  -e GRAPH_SERVICE_API_KEY=<key> \
  -- /usr/local/bin/node /absolute/path/to/ip-knowledge-graph/mcp-server/dist/index.js
```

Then start a new Claude Code session and run `/mcp` — `kinetk` should show as connected with the four tools.

If anything fails, run `claude --debug` and `/mcp` to see the spawn error.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "kinetk": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/ip-knowledge-graph/mcp-server/dist/index.js"],
      "env": {
        "GRAPH_SERVICE_URL": "https://api.kinetk.ai/graph",
        "GRAPH_SERVICE_API_KEY": "<key>"
      }
    }
  }
}
```

Fully quit and relaunch Claude Desktop. The hammer icon on the prompt bar should show four new tools.

### Gemini CLI

Gemini CLI supports stdio MCP servers via `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "kinetk": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/ip-knowledge-graph/mcp-server/dist/index.js"],
      "env": {
        "GRAPH_SERVICE_URL": "https://api.kinetk.ai/graph",
        "GRAPH_SERVICE_API_KEY": "<key>"
      }
    }
  }
}
```

Start a new `gemini` session — `/mcp list` shows registered servers, `/tools` lists `get_context`, `create_context_job`, `get_context_job_status`, `get_context_job_result`.

> Note: only the **Gemini CLI** (`google-gemini/gemini-cli`) supports custom MCP servers today. Gemini in the web UI / AI Studio does not expose an install path for local stdio MCPs.

### Cursor

Cursor supports MCP via either a project-scoped file (`.cursor/mcp.json` at the repo root) or a user-scoped one (`~/.cursor/mcp.json`). Both use the same shape as Claude Desktop:

```json
{
  "mcpServers": {
    "kinetk": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/ip-knowledge-graph/mcp-server/dist/index.js"],
      "env": {
        "GRAPH_SERVICE_URL": "https://api.kinetk.ai/graph",
        "GRAPH_SERVICE_API_KEY": "<key>"
      }
    }
  }
}
```

Restart Cursor (or use *Cursor → Settings → MCP → Refresh*). The four tools should appear in the Composer / Agent panel and Cursor will offer to call them when relevant.

> Tip: drop the file at `.cursor/mcp.json` inside this repo if you only want the MCP active when you're working in this codebase. Use `~/.cursor/mcp.json` to make it available globally.

### Windsurf (Codeium)

Windsurf supports MCP via `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "kinetk": {
      "command": "/usr/local/bin/node",
      "args": ["/absolute/path/to/ip-knowledge-graph/mcp-server/dist/index.js"],
      "env": {
        "GRAPH_SERVICE_URL": "https://api.kinetk.ai/graph",
        "GRAPH_SERVICE_API_KEY": "<key>"
      }
    }
  }
}
```

Open *Windsurf → Settings → Cascade → Plugins / MCP* and click **Refresh**. The four tools register and Cascade can call them.

### ChatGPT

ChatGPT's MCP support targets **remote** (HTTP) MCP servers via the Connectors interface — not local stdio. Use the [Hosted (remote HTTP)](#hosted-remote-http) endpoint below as the Connector URL. (Listing in the ChatGPT/Claude.ai connector *directory* additionally requires an OAuth 2.1 flow, which the hosted endpoint does not yet implement — a programmatic Connector with a bearer/API key works today.)

## Hosted (remote HTTP)

The same tool core also runs as a **remote MCP** behind graph-service's API, so external customers connect over the network with their KINETK API key — no local install. The endpoint is a single `POST …/graph/mcp` (stateless Streamable HTTP). The handler lives in [`graph-service/src/intelligence/mcp/`](../graph-service/src/intelligence/mcp/) and reuses this package's `createMcpServer` core via an in-process adapter, so the gateway-validated API key is metered to the right tenant.

Add it to Claude Code with the HTTP transport (pass your KINETK key as `x-api-key`):

```bash
claude mcp add --transport http kinetk \
  https://api.kinetk.ai/graph/mcp \
  --header "x-api-key: <your-kinetk-key>"
```

Any MCP client that speaks Streamable HTTP and lets you set a request header works the same way: URL `https://api.kinetk.ai/graph/mcp`, header `x-api-key: <key>`. Use the dev URL (`https://api.dev.kinetk.ai/graph/mcp`) to test against the dev stage.


---

## Development

```bash
npm run lint     # tsc --noEmit
npm run build    # tsc -> dist/
npm run start    # node dist/index.js (run after build)
```

Stdout is reserved for MCP protocol frames — anything the server logs goes to stderr. If you launch it manually for debugging, frames will print to your terminal.
