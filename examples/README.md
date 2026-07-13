# Examples

A standalone showcase app that demonstrates end-to-end use of the KINETK Graph
Service API + MCP. It's a self-contained Next.js app — it borrows the KINETK
brand palette and fonts but is **not** part of the marketing website. It runs on
**live data**, so it needs a `KINETK_API_KEY` (and a `GEMINI_API_KEY` for the
synthesis step).

| App | What it shows | Hero capability |
| --- | --- | --- |
| [`growth-demo`](./growth-demo) | Pass a product → an AI agent pulls the live `insights` signal over MCP and Gemini synthesizes a grounded launch & growth plan (positioning, selling hooks, audience, telemetry, hashtags, visual theme). | MCP `insights` + Gemini synthesis |
| [`competitive-social-intelligence`](./competitive-social-intelligence) | Point it at a competitive set of subjects → renders share of voice, a weekly engagement trend, a per-subject playbook, summary metrics and auto-clustered content narratives, with optional live refresh straight from the KINETK graph over MCP. | MCP live `insights` refresh + data-driven dashboard |

**Live demos:** [`growth-demo`](https://growth-demo.kinetk.ai) · [`competitive-social-intelligence`](https://calibre-demo.kinetk.ai)


## Quick start

```bash
cd examples/growth-demo
npm install
cp .env.example .env               # add KINETK_API_KEY + GEMINI_API_KEY
npm run dev                        # http://localhost:3000
```

`growth-demo` uses real data only — see [`growth-demo/.env.example`](./growth-demo/.env.example)
for the two required keys. Get a KINETK key at <https://platform.kinetk.ai/login>
and a Gemini key at <https://aistudio.google.com/apikey>.
