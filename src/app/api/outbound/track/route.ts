import { NextResponse } from "next/server";

import { recordOutboundEvent } from "@/lib/platform-database";;
import { isSafeExternalUrl } from "@/lib/outbound";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const targetUrl = typeof payload?.targetUrl === "string" ? payload.targetUrl.trim() : "";
  const companyName = typeof payload?.companyName === "string" ? payload.companyName.trim() : "";
  const sourcePath = typeof payload?.sourcePath === "string" ? payload.sourcePath.trim() : "";
  const referrer = typeof payload?.referrer === "string" ? payload.referrer.trim() : "";

  if (!targetUrl || !companyName || !isSafeExternalUrl(targetUrl)) {
    return NextResponse.json({ message: "Keçid məlumatı etibarlı deyil." }, { status: 400 });
  }

  recordOutboundEvent({
    targetUrl,
    companyName,
    sourcePath: sourcePath.startsWith("/") ? sourcePath : undefined,
    referrer: referrer || undefined,
    userAgent: request.headers.get("user-agent") ?? undefined
  });

  return NextResponse.json({ ok: true });
}
