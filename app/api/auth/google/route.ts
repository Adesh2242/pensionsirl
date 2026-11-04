import { NextResponse } from "next/server";
import { isGoogleConfigured, OAUTH_COOKIE, publicOrigin, startGoogleSignIn } from "@/lib/auth/google";
import { safeNextPath } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

/** Sends the browser to Google, remembering state, PKCE verifier and `next` for the callback. */
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  if (!isGoogleConfigured()) return NextResponse.redirect(`${origin}/login?error=oauth`);
  const next = safeNextPath(new URL(request.url).searchParams.get("next"));
  const { url, state, verifier } = startGoogleSignIn(origin);
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    maxAge: 600,
  });
  return response;
}
