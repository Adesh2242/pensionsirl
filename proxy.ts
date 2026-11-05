import { NextResponse, type NextRequest } from "next/server";

/**
 * One address for search engines. Once the site has its own domain
 * (NEXT_PUBLIC_SITE_URL), visits to the Railway-generated *.up.railway.app
 * address are sent there permanently, so Google indexes one copy of each
 * page instead of two. Until then (or locally) nothing happens.
 *
 * Pages only: APIs (the healthcheck, mail-app unsubscribes) and Google
 * sign-in keep answering on whichever address they were called.
 */
const canonical = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL || "");
  } catch {
    return null;
  }
})();

export function proxy(request: NextRequest) {
  if (!canonical || canonical.hostname.endsWith(".up.railway.app")) return NextResponse.next();
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(":")[0];
  if (!host.endsWith(".up.railway.app")) return NextResponse.next();
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical);
  return NextResponse.redirect(target, 308);
}

export const config = {
  matcher: ["/((?!api/|auth/|_next/|favicon\\.ico|icon|apple-icon).*)"],
};
