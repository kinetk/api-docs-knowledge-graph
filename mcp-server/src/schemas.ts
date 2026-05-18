// Zod schemas for the three MCP tool inputs. Validation runs in the MCP
// process before any HTTP call lands at graph-service, so malformed agent
// input fails fast with a readable error rather than burning a Lambda invoke.
//
// `createContextJobInputSchema` is a discriminated union on `kind`: the two
// retrieval kinds (intelligence_search / intelligence_discover) require
// `query`; the two campaign kinds (campaign_brief / llm_context) require
// `campaign`. Everything else (filters, options) is shared and optional.

import { z } from "zod";

const filtersSchema = z
  .object({
    platforms: z.array(z.string().min(1)).optional(),
    window: z.enum(["24h", "7d", "30d", "all"]).optional(),
  })
  .strict()
  .optional();

const optionsSchema = z
  .object({
    topK: z.number().int().positive().max(1000).optional(),
    expandQuery: z.boolean().optional(),
    vectors: z.union([z.literal("all_media"), z.array(z.string().min(1))]).optional(),
    maxDistance: z.number().nullable().optional(),
    clusterCount: z.number().int().positive().max(50).optional(),
    debug: z.boolean().optional(),
  })
  .strict()
  .optional();

// Retrieval kinds: query is required. Two parallel single-kind schemas so
// `z.discriminatedUnion("kind", ...)` can use them — discriminatedUnion
// requires each branch to be a `ZodObject` with a literal discriminator.
const intelligenceSearchSchema = z
  .object({
    kind: z.literal("intelligence_search"),
    query: z.string().min(1, "query is required for intelligence_search"),
    filters: filtersSchema,
    options: optionsSchema,
  })
  .strict();

const intelligenceDiscoverSchema = z
  .object({
    kind: z.literal("intelligence_discover"),
    query: z.string().min(1, "query is required for intelligence_discover"),
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
      enum: ["intelligence_search", "intelligence_discover", "campaign_brief", "llm_context"],
      description:
        "Backend pipeline depth. intelligence_search = ranked content. intelligence_discover = search + narratives + tag/creator analytics. campaign_brief = LLM-generated persisted brief. llm_context = ephemeral LLM-ready campaign context bundle.",
    },
    query: {
      type: "string",
      description: "Natural-language query. Required for intelligence_search and intelligence_discover.",
    },
    campaign: {
      type: "string",
      description: "Campaign description (free text). Required for campaign_brief and llm_context.",
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
          enum: ["24h", "7d", "30d", "all"],
          description:
            "Time window. 'all' disables the published_at filter; bounded values keep only fresh content.",
        },
      },
    },
    options: {
      type: "object",
      additionalProperties: false,
      properties: {
        topK: { type: "integer", minimum: 1, maximum: 1000, description: "Max ranked items to return. Forwarded to graph-service as `limit`; if omitted the server applies its own default (1000). MCP caps at 1000 to keep agent payloads token-bounded." },
        expandQuery: { type: "boolean", description: "Run Anthropic 3-query expansion before vector search." },
        vectors: {
          oneOf: [
            { type: "string", enum: ["all_media"] },
            { type: "array", items: { type: "string" } },
          ],
          description: "Which Weaviate vectors to query.",
        },
        maxDistance: { type: ["number", "null"], description: "Cosine-distance cutoff (~0.35 typical)." },
        clusterCount: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Number of narrative clusters (intelligence_discover only).",
        },
        debug: { type: "boolean", description: "Bypass dedup + cache." },
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
