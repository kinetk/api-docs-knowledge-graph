import { pollInsightsJob } from "@/lib/kinetk";

/**
 * Poll a live insights job once (see `POST /api/insights/start` for the `jobId`).
 *
 * Each call does one KINETK status check - and a result fetch once the job is
 * done - so the request always returns quickly. The browser repeats this until
 * the returned `status` is no longer `running`.
 */
export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.KINETK_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "live_refresh_not_configured" },
      { status: 503 },
    );
  }

  let jobId: unknown;
  try {
    ({ jobId } = await request.json());
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  if (typeof jobId !== "string" || jobId.length === 0) {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const state = await pollInsightsJob(jobId, apiKey);
    return Response.json(state);
  } catch (error) {
    console.error(`Live insights poll failed for job ${jobId}:`, error);
    return Response.json({ error: "upstream_failed" }, { status: 502 });
  }
}
