# kinetk-mcp-server

> **User-facing docs live at [`fern/pages/mcp/`](../fern/pages/mcp/)** — overview, installation in 6 AI clients, and tool reference. This file covers local development only.

TypeScript stdio MCP server that wraps the deployed [Graph Service](https://api.kinetk.ai/graph) async-job API (`POST /intelligence/jobs`, `GET /intelligence/jobs/{id}`) as three agent-friendly tools: `create_context_job`, `get_context_job_status`, `get_context_job_result`.

## Local dev

```bash
cd mcp-server
npm install
npm run build       # tsc -> dist/
cp .env.example .env
# fill in GRAPH_SERVICE_URL and GRAPH_SERVICE_API_KEY
```

Required env:

| Var | What |
|---|---|
| `GRAPH_SERVICE_URL` | Base URL of the deployed Graph Service. Prod: `https://api.kinetk.ai/graph`. Dev: `https://api.dev.kinetk.ai/graph`. |
| `GRAPH_SERVICE_API_KEY` | API Gateway key. Sent as `x-api-key` on every backend request. |
| `GRAPH_SERVICE_TIMEOUT_MS` | Optional. Per-request HTTP timeout (default `10000`). |

Run the built MCP standalone (for spec-driven debugging — clients launch it automatically):

```bash
npm run start
# or
node dist/index.js
```

Stdout is reserved for MCP protocol frames; logs go to stderr.

## Scripts

| Script | Purpose |
|---|---|
| `npm run lint` | `tsc --noEmit` |
| `npm run build` | `tsc` → emits `dist/` |
| `npm run start` | `node dist/index.js` (run after build) |

## Layout

```
src/
├── index.ts              stdio entrypoint (@modelcontextprotocol/sdk)
├── client.ts             HTTPS client for the Graph Service
├── schemas.ts            zod schemas for tool inputs
├── types.ts              shared types
├── tools/
│   ├── createContextJob.ts
│   ├── getContextJobStatus.ts
│   └── getContextJobResult.ts
└── mapping/
    ├── inputMapper.ts      tool input → API submit body
    └── responseMapper.ts   API response → slim envelope
```

## Distribution

v0 distribution is **clone-and-build**. Users follow the install guide in [`fern/pages/mcp/installation.mdx`](../fern/pages/mcp/installation.mdx) to clone this repo, build, and point their AI client at `dist/index.js`.

Publishing to npm as `kinetk-mcp` for `npx kinetk-mcp`-style installs is a planned DX upgrade — not in v0.

## Roadmap

- HTTP/SSE transport (currently stdio-only) — unlocks ChatGPT Connectors and remote use cases.
- `npm publish` so users can run `npx kinetk-mcp` without cloning.
- Surface additional precomputed-read endpoints (`/narratives/trending`, `/creators/{id}`) as MCP tools if agent use cases demand it.
