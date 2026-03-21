import { NextResponse } from "next/server";

import { getPlatformStorageStatus } from "@/lib/platform-database";
import { isAdminAuthConfigured } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const storage = getPlatformStorageStatus();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    storage,
    auth: {
      adminConfigured: isAdminAuthConfigured()
    }
  });
}
