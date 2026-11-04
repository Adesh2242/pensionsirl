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

/** The client's IP as Railway's edge reports it. */
export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
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
