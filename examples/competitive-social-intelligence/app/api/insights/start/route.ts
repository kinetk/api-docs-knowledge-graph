import { getEntity } from "@/lib/data";
import { startInsightsJob } from "@/lib/kinetk";

/**
 * Kick off a live insights refresh for one entity and return its `jobId`.
 *
 * Returns immediately - the browser then polls `POST /api/insights/status` with
 * the `jobId`. Optional: with no `KINETK_API_KEY` configured it returns 503 and
 * the UI keeps showing the snapshot from `lib/data.ts`.
 */
export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.KINETK_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "live_refresh_not_configured" },
      { status: 503 },
    );
  }

  let entityId: unknown;
  try {
    ({ id: entityId } = await request.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  const entity = typeof entityId === "string" ? getEntity(entityId) : undefined;
  if (!entity) {
    return Response.json({ error: "unknown_entity" }, { status: 404 });
  }

  try {
    const jobId = await startInsightsJob(entity.query ?? entity.name, apiKey);
    return Response.json({ jobId });
  } catch (error) {
    console.error(`Live insights job start failed for ${entity.id}:`, error);
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }
}
