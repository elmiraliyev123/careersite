import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/session";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function normalizeHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return loopbackHosts.has(normalized) ? "loopback" : normalized;
}

function parseOrigin(value: string) {
  try {
    const url = new URL(value);
    return {
      protocol: url.protocol,
      hostname: normalizeHostname(url.hostname),
      port: url.port || (url.protocol === "https:" ? "443" : "80")
    };
  } catch {
    return null;
  }
}

function sameOrigin(left: string, right: string) {
  const leftOrigin = parseOrigin(left);
  const rightOrigin = parseOrigin(right);

  if (!leftOrigin || !rightOrigin) {
    return false;
  }

  return (
    leftOrigin.protocol === rightOrigin.protocol &&
    leftOrigin.hostname === rightOrigin.hostname &&
    leftOrigin.port === rightOrigin.port
  );
}

function getExpectedOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const origins = new Set<string>([requestUrl.origin]);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const protocol = forwardedProto ? `${forwardedProto}:` : requestUrl.protocol;

  if (host) {
    origins.add(`${protocol}//${host}`);
  }

  return origins;
}

function matchesExpectedOrigins(candidate: string, expectedOrigins: Set<string>) {
  for (const expectedOrigin of expectedOrigins) {
    if (sameOrigin(candidate, expectedOrigin)) {
      return true;
    }
  }

  return false;
}

export function hasTrustedOrigin(request: Request) {
  const expectedOrigins = getExpectedOrigins(request);
  const origin = request.headers.get("origin");

  if (origin) {
    return matchesExpectedOrigins(origin, expectedOrigins);
  }

  const referer = request.headers.get("referer");

  if (referer) {
    return matchesExpectedOrigins(referer, expectedOrigins);
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

export function requireCronSecret(request: Request) {
  const expectedSecret = process.env.CRON_SECRET ?? process.env.REVALIDATION_CRON_SECRET ?? null;

  if (!expectedSecret) {
    return process.env.NODE_ENV === "production"
      ? NextResponse.json(
          { message: "Cron secret is not configured." },
          { status: 500 }
        )
      : null;
  }

  const providedSecret =
    request.headers.get("x-cron-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    null;

  if (providedSecret !== expectedSecret) {
    return NextResponse.json(
      { message: "Cron secret is invalid." },
      { status: 401 }
    );
  }

  return null;
}
