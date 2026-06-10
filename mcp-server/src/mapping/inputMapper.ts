// Shapes the validated MCP tool input into the JSON object that graph-service
// expects under `input` for each JobKind. Two backend contracts to hit:
//   - QueryIntelligenceInput (graph-service/src/intelligence/pipeline/types.ts)
//     for intelligence_records / intelligence_signals
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
  if (input.kind === "intelligence_records" || input.kind === "intelligence_signals") {
    return mapRetrievalInput(input);
  }
  return mapCampaignInput(input);
}

function mapRetrievalInput(input: Extract<CreateContextJobInput, { kind: "intelligence_records" | "intelligence_signals" }>): MappedSubmission {
  // intelligence_signals accepts ONLY `query` server-side — every other input
  // field is server-managed (window "all", fixed scan size, all platforms,
  // query expansion on) and the backend 400s anything else. Drop filters/
  // options here so agent calls succeed; the tool schema documents this.
  if (input.kind === "intelligence_signals") {
    return { kind: input.kind, input: { query: input.query } };
  }

  const { filters, options } = input;
  const mapped: Record<string, unknown> = {
    query: input.query,
    // The backend requires an explicit limit (no server default — jobs are
    // billed per record, so the caller chooses the spend). The schema already
    // enforced presence + bounds (100–50000); never defaulted here.
    limit: input.limit,
    // The backend requires an explicit window (no server default). When the
    // agent doesn't pick one, "all" (no time filter) is the cheapest and most
    // inclusive choice.
    window: filters?.window ?? "all",
  };
  if (filters?.platforms !== undefined) mapped.platforms = filters.platforms;
  if (options?.expandQuery !== undefined) mapped.expandQuery = options.expandQuery;
  if (options?.vectors !== undefined) mapped.vectors = options.vectors;
  if (options?.maxDistance !== undefined) mapped.maxDistance = options.maxDistance;
  return { kind: input.kind, input: mapped };
}

function mapCampaignInput(input: Extract<CreateContextJobInput, { kind: "campaign_brief" | "llm_context" }>): MappedSubmission {
  // CampaignBriefInput intentionally accepts a narrower set of fields than the
  // retrieval pipeline. We omit options that don't apply (vectors, etc.)
  // — they'd be silently ignored downstream but better not to send noise.
  const { filters } = input;
  const mapped: Record<string, unknown> = {
    // The backend requires an explicit limit (no server default — billed per
    // record; the caller chooses the spend). Presence + bounds (100–50000)
    // already enforced by the schema; never defaulted here.
    limit: input.limit,
    // The backend requires an explicit window (no server default); "all"
    // (no time filter) when the agent doesn't pick one.
    window: filters?.window ?? "all",
  };
  if (input.campaign !== undefined) mapped.campaign = input.campaign;
  if (input.audience !== undefined) mapped.audience = input.audience;
  if (input.tone !== undefined) mapped.tone = input.tone;
  if (filters?.platforms !== undefined) mapped.platforms = filters.platforms;
  return { kind: input.kind, input: mapped };
}
