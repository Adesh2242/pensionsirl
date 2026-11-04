import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * "Continue with Google" (OpenID Connect, authorization code + PKCE).
 * Off unless GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set; the button
 * hides itself when it's off. The redirect URI to register with Google is
 * <site>/auth/callback.
 */
export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export const OAUTH_COOKIE = "piq_oauth";

/** The site's public origin, as the browser sees it (Railway sits behind a proxy). */
export function publicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

export function startGoogleSignIn(origin: string) {
  const state = randomBytes(16).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin}/auth/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return { url: url.toString(), state, verifier };
}

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
}

export async function finishGoogleSignIn(code: string, verifier: string, origin: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/auth/callback`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) throw new Error("Google returned no access token.");

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoRes.ok) throw new Error(`Google userinfo failed: ${infoRes.status}`);
  const info = (await infoRes.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string };
  if (!info.sub || !info.email) throw new Error("Google returned no account email.");
  return {
    sub: info.sub,
    email: info.email.toLowerCase(),
    emailVerified: info.email_verified === true,
    name: info.name ?? null,
  };
}
