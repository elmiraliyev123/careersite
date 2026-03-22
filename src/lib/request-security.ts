import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/session";

function sameOrigin(left: string, right: string) {
  try {
    return new URL(left).origin === new URL(right).origin;
  } catch {
    return false;
  }
}

export function hasTrustedOrigin(request: Request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");

  if (origin) {
    return sameOrigin(origin, expectedOrigin);
  }

  const referer = request.headers.get("referer");

  if (referer) {
    return sameOrigin(referer, expectedOrigin);
  }

  return process.env.NODE_ENV !== "production";
}

export async function requireAdminMutation(request: Request) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { message: "Sorğunun origin-i doğrulanmadı. Yenidən cəhd et." },
      { status: 403 }
    );
  }

  if (!(await hasAdminSession())) {
    return NextResponse.json(
      { message: "Bu əməliyyat üçün admin girişi tələb olunur." },
      { status: 401 }
    );
  }

  return null;
}
