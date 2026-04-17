import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const adminSubdomain = (process.env.NEXT_PUBLIC_ADMIN_SUBDOMAIN ?? "adminlog").toLowerCase();
const adminSessionCookieName = "careerapple_admin_session";
const adminLoginPath = "/admin/login";

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
  const { pathname } = request.nextUrl;

  if (pathname === "/adminlog") {
    const url = request.nextUrl.clone();
    url.pathname = adminLoginPath;
    return NextResponse.redirect(url);
  }

  if (
    pathname.startsWith("/admin") &&
    pathname !== adminLoginPath &&
    !request.cookies.get(adminSessionCookieName)?.value
  ) {
    const url = request.nextUrl.clone();
    url.pathname = adminLoginPath;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (!isAdminHost(hostname)) {
    return NextResponse.next();
  }

  if (pathname === "/" || pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = adminLoginPath;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"]
};
