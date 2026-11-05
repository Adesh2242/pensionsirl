import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireSql } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { finishGoogleSignIn, OAUTH_COOKIE, publicOrigin } from "@/lib/auth/google";
import { safeNextPath } from "@/lib/safe-next";

export const dynamic = "force-dynamic";

/**
 * Google sends the browser back here. Checks state, exchanges the code, then
 * signs in the matching account — by Google id, else by verified email
 * (linking Google to an existing password account), else creates one.
 */
export async function GET(request: Request) {
  const origin = publicOrigin(request);
  const fail = NextResponse.redirect(`${origin}/login?error=oauth`);
  const params = new URL(request.url).searchParams;
  const jar = await cookies();
  const saved = jar.get(OAUTH_COOKIE)?.value;
  jar.delete({ name: OAUTH_COOKIE, path: "/auth/callback" });

  let stored: { state: string; verifier: string; next: string };
  try {
    stored = JSON.parse(saved ?? "");
  } catch {
    return fail;
  }
  const code = params.get("code");
  if (!code || params.get("state") !== stored.state) return fail;

  try {
    const profile = await finishGoogleSignIn(code, stored.verifier, origin);
    const sql = requireSql();
    let [user] = await sql<{ id: string }[]>`select id from users where google_sub = ${profile.sub}`;
    if (!user && profile.emailVerified) {
      [user] = await sql<{ id: string }[]>`
        update users set google_sub = ${profile.sub}, email_verified_at = coalesce(email_verified_at, now())
        where email = ${profile.email} and google_sub is null returning id`;
    }
    if (!user) {
      if (!profile.emailVerified) return fail;
      [user] = await sql<{ id: string }[]>`
        insert into users (email, name, google_sub, email_verified_at) values (${profile.email}, ${profile.name}, ${profile.sub}, now())
        on conflict (email) do nothing returning id`;
    }
    if (!user) return fail;
    await sql`update users set last_login_at = now() where id = ${user.id}`;
    await createSession(user.id);
    return NextResponse.redirect(`${origin}${safeNextPath(stored.next)}`);
  } catch (error) {
    console.error("Google sign-in failed:", error);
    return fail;
  }
}
