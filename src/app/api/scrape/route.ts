import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/session";
import { requireAdminMutation } from "@/lib/request-security";
import { getIngestionRun, getPipelineMetrics, listRecentIngestionRuns } from "@/lib/job-pipeline";
import { getEnabledScrapeSources } from "@/lib/scrape-config";
import { getScrapeSourceInventoryWithHealth, syncScrapedJobs } from "@/lib/scrape-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const url = new URL(request.url);
  const runId = url.searchParams.get("runId");

  return NextResponse.json({
    sources: getEnabledScrapeSources(),
    inventory: getScrapeSourceInventoryWithHealth(),
    metrics: getPipelineMetrics(),
    run: runId ? getIngestionRun(runId) : null,
    recentRuns: listRecentIngestionRuns(8)
  });
}

export async function POST(request: Request) {
  const authError = await requireAdminMutation(request);

  if (authError) {
    return authError;
  }

  const payload = await request.json().catch(() => ({}));
  const result = await syncScrapedJobs({
    dryRun: Boolean(payload?.dryRun),
    sourceIds: Array.isArray(payload?.sourceIds)
      ? payload.sourceIds.filter((value: unknown): value is string => typeof value === "string")
      : undefined
  });

  return NextResponse.json({
    ...result
  });
}
