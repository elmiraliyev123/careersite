import { NextResponse } from "next/server";

import { getPipelineMetrics, listRecentIngestionRuns } from "@/lib/job-pipeline";
import { getPlatformStorageStatus } from "@/lib/platform-database";;
import { isAdminAuthConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const storage = getPlatformStorageStatus();
  const pipeline = getPipelineMetrics();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage,
    pipeline,
    recentRuns: listRecentIngestionRuns(3),
    auth: {
      adminConfigured: isAdminAuthConfigured()
    }
  });
}
