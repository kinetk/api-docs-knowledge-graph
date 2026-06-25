// Zod schemas for the two MCP tool inputs. Validation runs in the MCP
// process before any HTTP call lands at graph-service, so malformed agent
// input fails fast with a readable error rather than burning a Lambda invoke.
//
// `createContextJobInputSchema` is a discriminated union on `kind`: BOTH kinds
// (records / insights, + their aliases) are keyed by `query` AND require an
// explicit `window` (via filters) + `limit`. The backend has no default and
// 400s without window/limit, and we deliberately do NOT default limit here: the
// caller is choosing their spend (records is billed per record). insights ALSO
// accepts an optional `includeSignals` projection flag — when true the backend
// additionally requires window:"all" + limit:3000, so we enforce that here (a
// per-branch refine) rather than letting the backend 400.

import { z } from "zod";

// The sub-day window is intentionally absent from the enum: the backend
// rejects it for non-admin keys (coming soon publicly — see the window
// description in the JSON schema below).
const filtersSchema = z
  .object({
    platforms: z.array(z.string().min(1)).optional(),
    window: z.enum(["7d", "30d", "all"]).optional(),
  })
  .strict()
  .optional();

const optionsSchema = z
  .object({
    expandQuery: z.boolean().optional(),
    vectors: z.union([z.literal("all_media"), z.array(z.string().min(1))]).optional(),
    maxDistance: z.number().nullable().optional(),
    clusterCount: z.number().int().min(2).max(8).optional(),
  })
  .strict()
  .optional();

// Explicit `limit` for both kinds (records and insights). Required — never
// defaulted client-side: jobs
// are billed per record, so the caller must state how many records they are
// buying. The backend accepts up to 10000 for external keys, but the MCP caps
// at 3000 (MCP_LIMIT_MAX): a reject-not-clamp ceiling that keeps an agent from
// accidentally buying a huge, slow, expensive pull through a conversational
// tool call. 3000 is plenty for the context an LLM actually consumes. Note: the
// includeSignals projection (insights only) requires window:"all" + limit:3000,
// so with the cap the only valid includeSignals limit is exactly 3000.
const MCP_LIMIT_MIN = 100;
export const MCP_LIMIT_MAX = 3000;
const limitSchema = (kind: string) =>
  z
    .number({
      required_error: `limit is required for ${kind} — the number of records to retrieve and pay for (between ${MCP_LIMIT_MIN} and ${MCP_LIMIT_MAX})`,
      invalid_type_error: `limit must be a number between ${MCP_LIMIT_MIN} and ${MCP_LIMIT_MAX} (records to retrieve for ${kind})`,
    })
    .int(`limit must be an integer (between ${MCP_LIMIT_MIN} and ${MCP_LIMIT_MAX})`)
    .min(MCP_LIMIT_MIN, `limit must be at least ${MCP_LIMIT_MIN}`)
    .max(MCP_LIMIT_MAX, `limit must be at most ${MCP_LIMIT_MAX} via this tool — for larger pulls call the graph-service API directly`);

// Each kind has a canonical name (records / insights) PLUS legacy aliases
// (the old graph_* names and the original intelligence_* names) — the backend
// accepts the canonical names + intelligence_*, and the MCP additionally accepts
// graph_* and canonicalizes everything before submit. We build one branch per
// accepted name (discriminatedUnion needs a literal discriminator per branch)
// from two shared shapes: records (query+window+limit) and insights (records'
// shape PLUS the optional includeSignals projection flag). The inputMapper
// canonicalizes the kind before submit, so downstream only sees the 2 canonical
// kinds.
type RecordsKind = "records" | "graph_records" | "intelligence_records";
type DiscoverKind = "insights" | "graph_discovery" | "intelligence_signals";

const recordsBranch = (kind: RecordsKind) =>
  z
    .object({
      kind: z.literal(kind),
      query: z.string().min(1, `query is required for ${kind}`),
      limit: limitSchema(kind),
      filters: filtersSchema,
      options: optionsSchema,
    })
    .strict();

// insights now mirrors records input-wise (query + window + limit) PLUS the
// includeSignals projection flag. The graph-service public route 400s an
// insights submit without window/limit, so they are REQUIRED here too. The
// includeSignals → window:"all" + limit:3000 constraint is enforced at the union
// level below (z.discriminatedUnion can't take a refined/ZodEffects member).
const discoverBranch = (kind: DiscoverKind) =>
  z
    .object({
      kind: z.literal(kind),
      query: z.string().min(1, `query is required for ${kind}`),
      limit: limitSchema(kind),
      // A-1 — discovery is structured-by-default; opt into the LLM prose arrays.
      includeSignals: z.boolean().optional(),
      filters: filtersSchema,
      options: optionsSchema,
    })
    .strict();

// Both kinds are keyed by `query` and require window + limit, enforced per-branch
// above. The includeSignals projection (insights only) is the one cross-field rule:
// it is only valid over the FULL corpus, so graph-service requires window:"all" AND
// limit:3000 for it. With the MCP's 3000 cap that means limit must be EXACTLY 3000.
// Enforce here (a union-level superRefine) so the agent gets a fast, readable MCP
// error instead of a backend 400. Non-includeSignals insights may use any window
// (7d/30d/all) + any limit 100–3000.
export const createContextJobInputSchema = z
  .discriminatedUnion("kind", [
    recordsBranch("records"),
    recordsBranch("graph_records"),
    recordsBranch("intelligence_records"),
    discoverBranch("insights"),
    discoverBranch("graph_discovery"),
    discoverBranch("intelligence_signals"),
  ])
  .superRefine((value, ctx) => {
    if (!("includeSignals" in value) || value.includeSignals !== true) return;
    const window = value.filters?.window ?? "all";
    if (window !== "all") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["filters", "window"],
        message: `includeSignals requires window:'all' and limit:${MCP_LIMIT_MAX}`,
      });
    }
    if (value.limit !== MCP_LIMIT_MAX) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["limit"],
        message: `includeSignals requires window:'all' and limit:${MCP_LIMIT_MAX}`,
      });
    }
  });

export const getContextJobStatusInputSchema = z
  .object({
    jobId: z.string().uuid({ message: "jobId must be a UUID" }),
  })
  .strict();

export const getContextJobResultInputSchema = z
  .object({
    jobId: z.string().uuid({ message: "jobId must be a UUID" }),
    verbose: z.boolean().optional(),
  })
  .strict();

export type CreateContextJobInput = z.infer<typeof createContextJobInputSchema>;
export type GetContextJobStatusInput = z.infer<typeof getContextJobStatusInputSchema>;
export type GetContextJobResultInput = z.infer<typeof getContextJobResultInputSchema>;

// JSON Schemas for MCP tool registration. The MCP SDK ships with zod-to-json-
// schema as a dep, but hand-rolling them keeps the surface area visible to
// the agent (descriptions matter — agents read them to decide which tool to
// call). These mirror the zod schemas above; if you change one, change both.
export const createContextJobJsonSchema = {
  type: "object",
  required: ["kind"],
  properties: {
    kind: {
      type: "string",
      enum: [
        "records",
        "insights",
        "intelligence_records",
        "intelligence_signals",
      ],
      description:
        "What to get back. Both kinds are keyed by `query` and require `window` + `limit`. Prefer the short names records/insights (the graph_*/intelligence_* names are accepted legacy aliases). records (aliases graph_records/intelligence_records) = the matching content itself, ranked posts/videos, each carrying enrichment (themes/tone/novelty) (needs `query` + `window` + `limit`). insights (aliases graph_discovery/intelligence_signals) = synthesized intelligence — narratives with trajectory/lifecycle + sentiment, tag/theme signals, white-space — STRUCTURED by default; set `includeSignals:true` to also get the LLM prose lines (needs `query` + `window` + `limit`; includeSignals additionally requires window:'all' AND limit:3000).",
    },
    includeSignals: {
      type: "boolean",
      description:
        "insights (aliases graph_discovery/intelligence_signals) ONLY. Discovery is structured-by-default (narratives + signals, no prose). Set true to ALSO include the LLM-written insight lines (more tokens). When true you MUST set window:'all' and limit:3000 (the prose projection runs over the full corpus). Ignored for records.",
    },
    query: {
      type: "string",
      description:
        "Natural-language search topic — REQUIRED for both kinds (records and insights).",
    },
    limit: {
      type: "integer",
      minimum: 100,
      maximum: 3000,
      description:
        "REQUIRED for records AND insights: how many records to retrieve, between 100 and 3000. Jobs are billed per record, so there is NO default — you are choosing the spend (1000 is a sensible starting point). Values above 3000 are rejected through this tool (large pulls are slow/expensive and rarely useful as LLM context — use the graph-service API directly if you genuinely need more). For insights with includeSignals:true the only valid value is exactly 3000.",
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Restrict to these platforms (case-insensitive; applies to records and insights). Public set: tiktok, instagram, reddit, pinterest, x, snapchat.",
        },
        window: {
          type: "string",
          enum: ["7d", "30d", "all"],
          description:
            "Time window. 'all' disables the published_at filter; bounded values keep only fresh content. The API requires an explicit window for records AND insights — if you omit it, this MCP server defaults it to 'all'. A '24h' window is coming soon and is not yet accepted. For insights with includeSignals:true the window must be 'all'.",
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        expandQuery: { type: "boolean", description: "Run LLM query expansion before vector search. Applies to records only — ignored for insights." },
        vectors: {
          oneOf: [
            { type: "string", enum: ["all_media"] },
            { type: "array", items: { type: "string" } },
          ],
          description: "Which vector indexes to query. Applies to records only — ignored for insights.",
        },
        maxDistance: { type: ["number", "null"], description: "Cosine-distance cutoff. Applies to records only — ignored for insights." },
        clusterCount: {
          type: "integer",
          minimum: 2,
          maximum: 8,
          description: "Number of narrative clusters. Only meaningful for insights, where all options are currently server-managed — accepted for forward compatibility but not forwarded.",
        },
      },
    },
  },
  additionalProperties: false,
} as const;

// get_context = same input surface as create_context_job (so the agent picks
// `kind` + query/window/limit identically), plus an optional `verbose`. It
// submits AND waits, returning the result inline in one call.
export const getContextJsonSchema = {
  type: "object",
  required: ["kind"],
  properties: {
    ...createContextJobJsonSchema.properties,
    verbose: {
      type: "boolean",
      description:
        "If true, return the full untouched graph-service response (richer but more tokens). Default false returns a slim LLM-optimized envelope.",
    },
  },
  additionalProperties: false,
} as const;

export const getContextJobStatusJsonSchema = {
  type: "object",
  required: ["jobId"],
  properties: {
    jobId: { type: "string", format: "uuid", description: "Job ID returned by create_context_job." },
  },
  additionalProperties: false,
} as const;

export const getContextJobResultJsonSchema = {
  type: "object",
  required: ["jobId"],
  properties: {
    jobId: { type: "string", format: "uuid", description: "Job ID returned by create_context_job." },
    verbose: {
      type: "boolean",
      description:
        "If true, return the full untouched graph-service response (richer but more tokens). Default false returns a slim LLM-optimized envelope.",
    },
  },
  additionalProperties: false,
} as const;
