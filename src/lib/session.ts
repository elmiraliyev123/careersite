import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

export type SessionRole = "candidate" | "admin";

export const sessionCookieName = "careerapple_admin_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

function getSessionSecret() {
  if (process.env.ADMIN_SESSION_SECRET) {
    return process.env.ADMIN_SESSION_SECRET;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-careerapple-admin-session-secret";
  }

  return null;
}

function getAdminPassword() {
  if (process.env.ADMIN_LOGIN_PASSWORD) {
    return process.env.ADMIN_LOGIN_PASSWORD;
  }

  if (process.env.NODE_ENV !== "production") {
    return "local-admin-password";
  }

  return null;
}

function getAdminUsername() {
  if (process.env.ADMIN_LOGIN_USERNAME) {
    return process.env.ADMIN_LOGIN_USERNAME;
  }

  if (process.env.NODE_ENV !== "production") {
    return "admin";
  }

  return null;
}

function signPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAdminAuthConfigured() {
  return Boolean(getSessionSecret() && getAdminPassword() && getAdminUsername());
}

export function verifyAdminCredentials(username: string, password: string) {
  const expected = getAdminPassword();
  const expectedUsername = getAdminUsername();

  if (!expected || !expectedUsername) {
    return false;
  }

  return safeCompare(username, expectedUsername) && safeCompare(password, expected);
}

export function createSessionToken(role: SessionRole) {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("Admin sessiya sirri konfiqurasiya olunmayıb.");
  }

  const expiresAt = Date.now() + sessionMaxAgeSeconds * 1000;
  const payload = `${role}.${expiresAt}`;
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

function readRoleFromToken(token: string) {
  const secret = getSessionSecret();

  if (!secret) {
    return null;
  }

  const [role, expiresAtValue, signature] = token.split(".");

  if (!role || !expiresAtValue || !signature) {
    return null;
  }

  if (role !== "candidate" && role !== "admin") {
    return null;
  }

  const payload = `${role}.${expiresAtValue}`;
  const expectedSignature = signPayload(payload, secret);

  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  const expiresAt = Number(expiresAtValue);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return null;
  }

  return role as SessionRole;
}

export async function getSessionRole(): Promise<SessionRole | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  return readRoleFromToken(token);
}

export async function hasAdminSession() {
  return (await getSessionRole()) === "admin";
}

export function getSessionCookieConfig(token: string) {
  return {
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  };
}

export function getClearedSessionCookieConfig() {
  return {
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}

export function getHomeRouteForRole(role: SessionRole) {
  return role === "admin" ? "/admin" : "/jobs";
}
