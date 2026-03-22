import { NextResponse } from "next/server";

import {
  createSessionToken,
  getClearedSessionCookieConfig,
  getSessionCookieConfig,
  isAdminAuthConfigured,
  verifyAdminPassword
} from "@/lib/session";
import { hasTrustedOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ message: "Sorğunun origin-i doğrulanmadı." }, { status: 403 });
  }

  const payload = await request.json();
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!isAdminAuthConfigured()) {
    return NextResponse.json(
      { message: "Admin giriş konfiqurasiyası tamamlanmayıb. Environment secret-ləri yoxla." },
      { status: 503 }
    );
  }

  if (!password) {
    return NextResponse.json({ message: "Admin parolu daxil edilməlidir." }, { status: 400 });
  }

  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ message: "Admin parolu yanlışdır." }, { status: 401 });
  }

  const response = NextResponse.json({
    message: "Sessiya yaradıldı.",
    role: "admin"
  });

  response.cookies.set(getSessionCookieConfig(createSessionToken("admin")));

  return response;
}

export async function DELETE(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json({ message: "Sorğunun origin-i doğrulanmadı." }, { status: 403 });
  }

  const response = NextResponse.json({ message: "Sessiya bağlandı." });

  response.cookies.set(getClearedSessionCookieConfig());

  return response;
}
