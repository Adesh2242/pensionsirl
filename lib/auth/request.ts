import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

/**
 * Blocks cross-site form posts and fetches (CSRF). Session cookies are
 * SameSite=Lax already; this is the second lock. Requests without an Origin
 * header (same-origin GETs, curl) are let through only for safe methods.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET" || request.method === "HEAD";
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The client's IP, for rate limiting. Railway's edge sets X-Real-IP itself,
 * so a visitor can't choose it. The first X-Forwarded-For entry is whatever
 * the client sent, so it's only a fallback, and then the last hop — the one
 * the proxy in front of us appended — is used.
 */
export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = request.headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  return hops?.[hops.length - 1] || "unknown";
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * For API routes that need a signed-in user: the user, or a ready-made 401
 * (or 403 for a cross-site write) to return.
 */
export async function requireUser(
  request: Request,
): Promise<{ user: SessionUser; error?: undefined } | { user?: undefined; error: NextResponse }> {
  if (!isSameOrigin(request)) return { error: jsonError("Cross-site request blocked.", 403) };
  const user = await getSessionUser();
  if (!user) return { error: jsonError("Please log in.", 401) };
  return { user };
}
