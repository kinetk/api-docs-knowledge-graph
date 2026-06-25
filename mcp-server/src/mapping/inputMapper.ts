// Shapes the validated MCP tool input into the JSON object that graph-service
// expects under `input` for each CANONICAL JobKind, canonicalizing the kind first:
// the agent may pass a canonical name, an old graph_* name, OR a legacy alias, and we
// always submit the canonical kind (records / insights) so the backend +
// the MCP's own response mapping deal in one vocabulary.
//   - records  → QueryIntelligenceInput (query + window + limit + retrieval knobs)
//   - insights → query + window + limit (+ the includeSignals projection flag);
//     graph-service now 400s an insights submit without window/limit, and
//     includeSignals additionally requires window:"all" + limit:3000 (enforced
//     in the zod schema before we reach here).
// `filters` and `options` from the MCP shape get flattened into the backend's flat
// object.

import type { CreateContextJobInput } from "../schemas";
import type { JobKind } from "../types";

type MappedSubmission = { kind: JobKind; input: Record<string, unknown> };

export function mapCreateContextJobInput(input: CreateContextJobInput): MappedSubmission {
  if (input.kind === "records" || input.kind === "graph_records" || input.kind === "intelligence_records") {
    return mapRecordsInput(input);
  }
  if (input.kind === "insights" || input.kind === "graph_discovery" || input.kind === "intelligence_signals") {
    return mapDiscoverInput(input);
  }
  throw new Error(`unhandled job kind: ${(input as { kind: string }).kind}`);
}

function mapRecordsInput(
  input: Extract<CreateContextJobInput, { kind: "records" | "graph_records" | "intelligence_records" }>,
): MappedSubmission {
  const { filters, options } = input;
  const mapped: Record<string, unknown> = {
    query: input.query,
    // The backend requires an explicit limit (no server default — jobs are
    // billed per record, so the caller chooses the spend). The schema already
    // enforced presence + bounds (100–3000); never defaulted here.
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
  return { kind: "records", input: mapped };
}

function mapDiscoverInput(
  input: Extract<CreateContextJobInput, { kind: "insights" | "graph_discovery" | "intelligence_signals" }>,
): MappedSubmission {
  // insights now mirrors records input-wise: graph-service REQUIRES an explicit
  // window + limit on the public route (it 400s without them). includeSignals is
  // an optional projection flag; the zod schema already enforced that, when set,
  // window is "all" and limit is 3000. We let the agent choose window + limit
  // (no silent pinning) and forward exactly what it picked.
  const { filters } = input;
  const mapped: Record<string, unknown> = {
    query: input.query,
    // The backend requires an explicit limit (billed per record); never defaulted
    // here (schema enforced presence + bounds 100–3000).
    limit: input.limit,
    // The backend requires an explicit window; "all" (no time filter) by default.
    window: filters?.window ?? "all",
  };
  // insights accepts the same optional platform filter as records on the public
  // route — forward it so an agent's platform scoping isn't silently dropped.
  if (filters?.platforms !== undefined) mapped.platforms = filters.platforms;
  if (input.includeSignals === true) mapped.includeSignals = true;
  return { kind: "insights", input: mapped };
}
