import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const adminSubdomain = (process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN ?? "adminlog").toLowerCase();

function getHostname(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? "";
  return host.split(":")[0].toLowerCase();
}

function isAdminHost(hostname: string) {
  if (!hostname || hostname === "localhost") {
    return false;
  }

  const parts = hostname.split(".");
  return parts[0] === adminSubdomain && parts.length >= 2;
}

export function middleware(request: NextRequest) {
  const hostname = getHostname(request);

  if (!isAdminHost(hostname)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/" || pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/adminlog";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"]
};
