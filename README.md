# api-docs-knowledge-graph

Public developer surface for the **KINETK Graph Service**: API documentation site and the `kinetk-mcp` Model Context Protocol server that wraps the async intelligence API for AI agents.

Live docs: `https://docs.kinetk.ai`.

## Layout

| Path | What's inside |
|---|---|
| [`fern/`](./fern) | Fern docs source — `docs.yml`, narrative `pages/*.mdx`, mirrored OpenAPI spec in `openapi/` |
| [`mcp-server/`](./mcp-server) | TypeScript stdio MCP server (`@modelcontextprotocol/sdk`). Built artifact in `mcp-server/dist/index.js` |
| [`examples/`](./examples) | Placeholder for end-to-end mini-projects (coming soon) |
| [`.github/workflows/`](./.github/workflows) | CI: `deploy-docs.yml` publishes Fern; `ci-mcp.yml` lints + builds the MCP on PR |

## Develop the docs locally

```bash
npm install -g fern-api
cd .  # repo root
fern docs dev
```

Live preview at `http://localhost:3000` (or whatever port Fern picks). Edit anything under `fern/pages/` or `fern/docs.yml` and the preview hot-reloads. Run `fern check` before pushing.

## Develop the MCP server locally

```bash
cd mcp-server
npm install
npm run build
cp .env.example .env
# fill in GRAPH_SERVICE_URL and GRAPH_SERVICE_API_KEY
node dist/index.js   # starts the stdio MCP — Ctrl-C to exit
```

To wire it into Claude Code / Cursor / Gemini CLI / etc., follow [`fern/pages/mcp/installation.mdx`](./fern/pages/mcp/installation.mdx) (the canonical user-facing install guide).

## Deployment

| Workflow | Trigger | What it does |
|---|---|---|
| `.github/workflows/deploy-docs.yml` | Push to `main` touching `fern/**` | Runs `fern check` + `fern generate --docs`. Publishes to `kinetk.docs.buildwithfern.com`. |
| `.github/workflows/ci-mcp.yml` | PR or push touching `mcp-server/**` | `npm ci` + `npm run lint` + `npm run build` + smoke-load `dist/index.js` |

Required GitHub secret: `FERN_TOKEN` (generate from the Fern dashboard).

## Repo conventions

- **Docs are the source of truth for users.** `mcp-server/README.md` is repo-local dev notes only; user-facing MCP docs live in [`fern/pages/mcp/`](./fern/pages/mcp/).
- **Don't author OpenAPI here.** The spec lives in `graph-service` and is pushed in via `npm run openapi:push` from that repo. Don't hand-edit `fern/openapi/openapi.yaml` — your changes will be overwritten on the next push.
- **No SDK generation for v0.** `fern/generators.yml` is intentionally minimal. SDKs are not on the near-term roadmap.


## Contact

API access & questions: **api@kinetk.ai**.
