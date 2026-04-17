import { NextResponse } from "next/server";

import { runDailySourceCycle } from "@/lib/scrape-sync";
import { requireCronSecret } from "@/lib/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = requireCronSecret(request);

  if (authError) {
    return authError;
  }

  const result = await runDailySourceCycle();

  return NextResponse.json({
    ok: true,
    ...result
  });
}
