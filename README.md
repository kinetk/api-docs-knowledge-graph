# api-docs-knowledge-graph

Public developer surface for the **KINETK Graph Service**: API documentation site (hosted by [Fern](https://buildwithfern.com)) and the `kinetk-mcp` Model Context Protocol server that wraps the async intelligence API for AI agents.

Live docs: `https://kinetk.docs.buildwithfern.com` (once first deploy completes).

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

## Refresh the OpenAPI spec

The spec is **pushed in** from [`graph-service`](../../serverless/ip-knowledge-graph/graph-service) (the source of truth). After editing the spec there, run from that repo:

```bash
cd ../serverless/ip-knowledge-graph/graph-service
npm run openapi:push
```

That copies the spec into `fern/openapi/openapi.yaml` here and strips internal vendor names (Claude/Anthropic/Vertex/Weaviate → generic terms) so the public docs stay vendor-neutral. Genericization rules live in [`graph-service/push-openapi-to-docs.sh`](../../serverless/ip-knowledge-graph/graph-service/push-openapi-to-docs.sh); if a new vendor name slips through, the script fails loudly so you know to add a rule.

If this repo lives somewhere other than `../../../api/api-docs-knowledge-graph` relative to graph-service, override with `API_DOCS_DIR=/path/to/api-docs-knowledge-graph npm run openapi:push`.

After the push, commit `fern/openapi/openapi.yaml` here and merge to `main` to trigger the docs deploy.

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

API access & key issuance: **api@kinetk.ai**.
