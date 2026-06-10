// Zod schemas for the three MCP tool inputs. Validation runs in the MCP
// process before any HTTP call lands at graph-service, so malformed agent
// input fails fast with a readable error rather than burning a Lambda invoke.
//
// `createContextJobInputSchema` is a discriminated union on `kind`: the two
// retrieval kinds (intelligence_records / intelligence_signals) require
// `query`; the two campaign kinds (campaign_brief / llm_context) require
// `campaign`. The per-record-billed kinds (intelligence_records,
// campaign_brief, llm_context) also require an explicit `limit` — the backend
// has no default and 400s without one, and we deliberately do NOT default it
// here: the caller is choosing their spend. Filters and options stay optional.
// intelligence_signals is special: the backend accepts ONLY `query` for that
// kind, so the input mapper silently drops filters/options before submit (the
// tool descriptions say so) rather than letting the backend 400.

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

// Explicit `limit` for the per-record-billed kinds (intelligence_records,
// campaign_brief, llm_context). Required — never defaulted client-side: jobs
// are billed per record, so the caller must state how many records they are
// buying. Bounds mirror the backend's external cap (100–10000).
const limitSchema = (kind: string) =>
  z
    .number({
      required_error: `limit is required for ${kind} — the number of records to retrieve and pay for (between 100 and 10000)`,
      invalid_type_error: `limit must be a number between 100 and 10000 (records to retrieve for ${kind})`,
    })
    .int("limit must be an integer (between 100 and 10000)")
    .min(100, "limit must be at least 100")
    .max(10000, "limit must be at most 10000");

// Retrieval kinds: query is required. Two parallel single-kind schemas so
// `z.discriminatedUnion("kind", ...)` can use them — discriminatedUnion
// requires each branch to be a `ZodObject` with a literal discriminator.
const intelligenceSearchSchema = z
  .object({
    kind: z.literal("intelligence_records"),
    query: z.string().min(1, "query is required for intelligence_records"),
    limit: limitSchema("intelligence_records"),
    filters: filtersSchema,
    options: optionsSchema,
  })
  .strict();

const intelligenceDiscoverSchema = z
  .object({
    kind: z.literal("intelligence_signals"),
    query: z.string().min(1, "query is required for intelligence_signals"),
    filters: filtersSchema,
    options: optionsSchema,
  })
  .strict();

const campaignBriefSchema = z
  .object({
    kind: z.literal("campaign_brief"),
    campaign: z.string().min(1).optional(),
    audience: z.string().min(1).optional(),
    tone: z.string().min(1).optional(),
    limit: limitSchema("campaign_brief"),
    filters: filtersSchema,
    options: optionsSchema,
  })
  .strict();

const llmContextSchema = z
  .object({
    kind: z.literal("llm_context"),
    campaign: z.string().min(1).optional(),
    audience: z.string().min(1).optional(),
    tone: z.string().min(1).optional(),
    limit: limitSchema("llm_context"),
    filters: filtersSchema,
    options: optionsSchema,
  })
  .strict();

// `campaign` is required for the two campaign kinds — graph-service enforces
// this server-side, but we surface a friendlier message client-side.
export const createContextJobInputSchema = z
  .discriminatedUnion("kind", [
    intelligenceSearchSchema,
    intelligenceDiscoverSchema,
    campaignBriefSchema,
    llmContextSchema,
  ])
  .superRefine((value, ctx) => {
    if (value.kind === "campaign_brief" || value.kind === "llm_context") {
      if (!value.campaign) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "campaign is required for campaign_brief and llm_context",
          path: ["campaign"],
        });
      }
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
      enum: ["intelligence_records", "intelligence_signals", "campaign_brief", "llm_context"],
      description:
        "What to get back. intelligence_records = the matching content itself, ranked posts/videos (needs `query` + `limit`). intelligence_signals = synthesized insight signals only, no raw content (needs `query` and ONLY `query` — filters/options are server-managed for this kind and silently dropped if sent). campaign_brief = a finished strategy brief we generate + persist (needs `campaign` + `limit`). llm_context = the raw campaign context bundle for YOU to synthesize from, no generated brief — faster/cheaper than campaign_brief (needs `campaign` + `limit`). Rule of thumb: `query` → records (content) or signals (insights); `campaign` → llm_context or campaign_brief.",
    },
    query: {
      type: "string",
      description: "Natural-language query. Required for intelligence_records and intelligence_signals.",
    },
    campaign: {
      type: "string",
      description: "Campaign description (free text). Required for campaign_brief and llm_context.",
    },
    limit: {
      type: "integer",
      minimum: 100,
      maximum: 10000,
      description:
        "REQUIRED for intelligence_records, campaign_brief and llm_context: how many records to retrieve, between 100 and 10000. Jobs are billed per record, so there is NO default — you are choosing the spend (1000 is a sensible starting point). Not accepted for intelligence_signals (its scan size is server-fixed).",
    },
    audience: { type: "string", description: "Target audience description (campaign kinds). Carried into the response context for downstream LLM use; not a retrieval filter." },
    tone: { type: "string", description: "Desired tone (campaign kinds). Carried into the response context; not a retrieval filter." },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Restrict to these platforms (e.g. TIKTOK, INSTAGRAM, YOUTUBE).",
        },
        window: {
          type: "string",
          enum: ["7d", "30d", "all"],
          description:
            "Time window. 'all' disables the published_at filter; bounded values keep only fresh content. The API requires an explicit window for intelligence_records, campaign_brief and llm_context — if you omit it, this MCP server defaults it to 'all'. A '24h' window is coming soon and is not yet accepted. Ignored for intelligence_signals (server-fixed to 'all').",
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        expandQuery: { type: "boolean", description: "Run LLM query expansion before vector search." },
        vectors: {
          oneOf: [
            { type: "string", enum: ["all_media"] },
            { type: "array", items: { type: "string" } },
          ],
          description: "Which vector indexes to query.",
        },
        maxDistance: { type: ["number", "null"], description: "Cosine-distance cutoff." },
        clusterCount: {
          type: "integer",
          minimum: 2,
          maximum: 8,
          description: "Number of narrative clusters. Only meaningful for intelligence_signals, where all options are currently server-managed — accepted for forward compatibility but not forwarded.",
        },
      },
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
