import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/session";
import { scrapeSources } from "@/lib/scrape-config";
import { syncScrapedJobs } from "@/lib/scrape-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  return NextResponse.json({
    sources: scrapeSources
  });
}

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "Bu əməliyyat üçün admin girişi tələb olunur." }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const result = await syncScrapedJobs({
    dryRun: Boolean(payload?.dryRun)
  });

  return NextResponse.json({
    message: result.dryRun
      ? "Scrape preview tamamlandı."
      : "Scrape sync tamamlandı.",
    ...result
  });
}
