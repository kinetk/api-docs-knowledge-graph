// Shapes the validated MCP tool input into the JSON object that graph-service
// expects under `input` for each JobKind. Two backend contracts to hit:
//   - QueryIntelligenceInput (graph-service/src/intelligence/pipeline/types.ts)
//     for intelligence_search / intelligence_discover
//   - CampaignBriefInput (graph-service/src/intelligence/pipeline/types.ts)
//     for campaign_brief / llm_context — accepts campaign, audience, tone,
//     platforms, window, limit. `product` and `goal` were removed; agents that
//     still pass `product` are not silently dropped here (the MCP schema
//     rejects unknown fields with strict()).
// `filters` and `options` from the MCP shape get flattened into the
// backend's flat object.

import type { CreateContextJobInput } from "../schemas";
import type { JobKind } from "../types";

type MappedSubmission = { kind: JobKind; input: Record<string, unknown> };

export function mapCreateContextJobInput(input: CreateContextJobInput): MappedSubmission {
  if (input.kind === "intelligence_search" || input.kind === "intelligence_discover") {
    return mapRetrievalInput(input);
  }
  return mapCampaignInput(input);
}

function mapRetrievalInput(input: Extract<CreateContextJobInput, { kind: "intelligence_search" | "intelligence_discover" }>): MappedSubmission {
  const { filters, options } = input;
  const mapped: Record<string, unknown> = {
    query: input.query,
  };
  if (filters?.platforms !== undefined) mapped.platforms = filters.platforms;
  if (filters?.window !== undefined) mapped.window = filters.window;
  if (options?.topK !== undefined) mapped.limit = options.topK;
  if (options?.expandQuery !== undefined) mapped.expandQuery = options.expandQuery;
  if (options?.vectors !== undefined) mapped.vectors = options.vectors;
  if (options?.maxDistance !== undefined) mapped.maxDistance = options.maxDistance;
  if (options?.debug !== undefined) mapped.debug = options.debug;
  if (input.kind === "intelligence_discover" && options?.clusterCount !== undefined) {
    mapped.clusterCount = options.clusterCount;
  }
  return { kind: input.kind, input: mapped };
}

function mapCampaignInput(input: Extract<CreateContextJobInput, { kind: "campaign_brief" | "llm_context" }>): MappedSubmission {
  // CampaignBriefInput intentionally accepts a narrower set of fields than the
  // retrieval pipeline. We omit options that don't apply (topK, vectors, etc.)
  // — they'd be silently ignored downstream but better not to send noise.
  const { filters } = input;
  const mapped: Record<string, unknown> = {};
  if (input.campaign !== undefined) mapped.campaign = input.campaign;
  if (input.audience !== undefined) mapped.audience = input.audience;
  if (input.tone !== undefined) mapped.tone = input.tone;
  if (filters?.platforms !== undefined) mapped.platforms = filters.platforms;
  if (filters?.window !== undefined) mapped.window = filters.window;
  // `debug` is honored by the submit layer (bypasses dedup/cache) regardless
  // of kind — it's read off `input.debug` in api/jobs.ts.
  if (input.options?.debug !== undefined) mapped.debug = input.options.debug;
  return { kind: input.kind, input: mapped };
}
