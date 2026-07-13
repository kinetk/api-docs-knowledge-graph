import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ACTIVE_TOPIC, TOPICS } from "../config/subjects.ts";
import {
  computeWeekBuckets,
  shapeEntity,
  type InsightsResultRaw,
} from "../lib/pull-core.ts";
import type { Dataset, EntityData, Subject } from "../lib/types.ts";

const MCP_URL = process.env.KINETK_MCP_URL ?? "https://api.kinetk.ai/graph/mcp";
const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 120; // ~6 minutes per job (insights jobs can run ~5 min)
const CALL_OPTS = { timeout: 180_000, resetTimeoutOnProgress: true } as const;
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class JobFailedError extends Error {}

async function connect(): Promise<Client> {
  const client = new Client({
    name: "social-intelligence-pull",
    version: "1.0.0",
  });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { "x-api-key": process.env.KINETK_API_KEY! } },
  });
  await client.connect(transport);
  return client;
}

function readPayload(toolResult: unknown): Record<string, unknown> {
  const { content, structuredContent } = (toolResult ?? {}) as {
    content?: unknown;
    structuredContent?: unknown;
  };
  if (structuredContent && typeof structuredContent === "object") {
    return structuredContent as Record<string, unknown>;
  }
  for (const block of Array.isArray(content) ? content : []) {
    if (
      block &&
      typeof block === "object" &&
      (block as { type?: unknown }).type === "text"
    ) {
      const { text } = block as { text?: unknown };
      if (typeof text === "string")
        return JSON.parse(text) as Record<string, unknown>;
    }
  }
  throw new Error("KINETK returned no readable content");
}

async function runInsightsJob(
  client: Client,
  query: string,
  window: "7d" | "30d" | "all",
  limit: number,
): Promise<InsightsResultRaw> {
  const submit = readPayload(
    await client.callTool(
      {
        name: "create_context_job",
        arguments: { kind: "insights", query, filters: { window }, limit },
      },
      undefined,
      CALL_OPTS,
    ),
  );
  const jobId = submit.jobId;
  if (typeof jobId !== "string")
    throw new Error("KINETK did not return a jobId");

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const status = readPayload(
      await client.callTool(
        { name: "get_context_job_status", arguments: { jobId } },
        undefined,
        CALL_OPTS,
      ),
    );
    if (status.status === "failed") {
      const reason =
        typeof status.error === "string" ? status.error : "unknown error";
      throw new JobFailedError(`KINETK job failed for "${query}": ${reason}`);
    }
    if (status.status === "completed" || status.status === "succeeded") break;
    if (i === MAX_POLLS - 1)
      throw new Error(`KINETK job timed out for "${query}"`);
  }

  const done = readPayload(
    await client.callTool(
      { name: "get_context_job_result", arguments: { jobId, verbose: true } },
      undefined,
      CALL_OPTS,
    ),
  );
  const result = (done.result ?? done) as InsightsResultRaw;
  return result;
}

async function main() {
  const topic =
    process.argv
      .find((a) => a.startsWith("--topic="))
      ?.slice("--topic=".length) ?? ACTIVE_TOPIC;

  const config = TOPICS[topic];
  if (!config) {
    throw new Error(
      `Unknown topic "${topic}". Known: ${Object.keys(TOPICS).join(", ")}`,
    );
  }
  if (!process.env.KINETK_API_KEY) {
    throw new Error("KINETK_API_KEY is not set (expected via .env.local).");
  }

  const { subjects, window, limit } = config;
  console.log(
    `Pulling "${topic}": ${subjects.length} subjects, window=${window}, limit=${limit}`,
  );

  let client = await connect();
  const done: { subject: Subject; result: InsightsResultRaw }[] = [];
  const failures: { subject: string; error: string }[] = [];
  try {
    for (const subject of subjects) {
      const label = subject.name ?? subject.query;
      process.stdout.write(`  - ${label} ... `);

      let result: InsightsResultRaw | undefined;
      let lastError = "unknown error";
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          result = await runInsightsJob(client, subject.query, window, limit);
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);

          if (err instanceof JobFailedError || attempt === MAX_RETRIES) break;
          process.stdout.write(`retry ${attempt} (${lastError}) ... `);
          try {
            await client.close();
          } catch {
            /* ignore */
          }
          await sleep(2000);
          client = await connect();
        }
      }

      if (result) {
        done.push({ subject, result });
        console.log(`ok (${result.content?.length ?? 0} posts)`);
      } else {
        failures.push({ subject: label, error: lastError });
        console.log(`FAILED (${lastError}) - skipping`);
      }
    }
  } finally {
    await client.close();
  }

  if (done.length === 0) {
    throw new Error(
      `All ${subjects.length} subjects failed - nothing written. Last error: ${failures.at(-1)?.error ?? "unknown"}`,
    );
  }

  const allContent = done.flatMap((d) => d.result.content ?? []);
  const weeks = computeWeekBuckets(window, Date.now(), allContent);
  const entities: EntityData[] = done.map((d) =>
    shapeEntity(d.subject, d.result, weeks),
  );

  const dataset: Dataset = {
    topic,
    generatedAt: new Date().toISOString(),
    window,
    weekLabels: weeks.labels,
    entities,
  };

  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const outDir = join(root, "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `${topic}.json`);
  writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(
    `Wrote ${outPath} (${entities.length}/${subjects.length} subjects).`,
  );

  if (failures.length > 0) {
    console.warn(`\n${failures.length} subject(s) failed and were skipped:`);
    for (const f of failures) console.warn(`  - ${f.subject}: ${f.error}`);
    console.warn("Re-run the pull to fill them in once KINETK recovers.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
