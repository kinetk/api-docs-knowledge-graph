import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ACTIVE_TOPIC, TOPICS } from "../config/subjects.ts";
import { getJob, submitJob } from "../lib/kinetk.ts";
import {
  computeWeekBuckets,
  shapeEntity,
  type InsightsResultRaw,
} from "../lib/pull-core.ts";
import type { Dataset, EntityData, Subject } from "../lib/types.ts";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 120; // ~6 minutes per job (insights jobs can run several min)
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class JobFailedError extends Error {}

async function runInsightsJob(
  query: string,
  window: "7d" | "30d" | "all",
  limit: number,
  apiKey: string,
): Promise<InsightsResultRaw> {
  // `returnRecords: limit` inlines every analyzed record in `content` so the
  // dashboard's engagement metrics aggregate over the full sample.
  const jobId = await submitJob(
    "insights",
    { query, window, limit, returnRecords: limit },
    apiKey,
  );

  for (let i = 0; i < MAX_POLLS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const state = await getJob(jobId, apiKey);
    if (state.status === "failed") {
      throw new JobFailedError(
        `KINETK job failed for "${query}": ${state.error}`,
      );
    }
    if (state.status === "succeeded") {
      return state.result as InsightsResultRaw;
    }
  }
  throw new Error(`KINETK job timed out for "${query}"`);
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
  const apiKey = process.env.KINETK_API_KEY;
  if (!apiKey) {
    throw new Error("KINETK_API_KEY is not set (expected via .env.local).");
  }

  const { subjects, window, limit } = config;
  console.log(
    `Pulling "${topic}": ${subjects.length} subjects, window=${window}, limit=${limit}`,
  );

  const done: { subject: Subject; result: InsightsResultRaw }[] = [];
  const failures: { subject: string; error: string }[] = [];

  for (const subject of subjects) {
    const label = subject.name ?? subject.query;
    process.stdout.write(`  - ${label} ... `);

    let result: InsightsResultRaw | undefined;
    let lastError = "unknown error";
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await runInsightsJob(subject.query, window, limit, apiKey);
        break;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);

        if (err instanceof JobFailedError || attempt === MAX_RETRIES) break;
        process.stdout.write(`retry ${attempt} (${lastError}) ... `);
        await sleep(2000);
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
