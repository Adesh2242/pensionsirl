import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

export const SESSION_COOKIE = "piq_session";
const SESSION_DAYS = 30;
/** Sessions with less than this left are extended on use (sliding expiry). */
const RENEW_WHEN_DAYS_LEFT = 15;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

/** Starts a session for `userId` and sets the cookie. */
export async function createSession(userId: string) {
  if (!sql) throw new Error("DATABASE_URL is not set.");
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${hashToken(token)}, ${userId}, ${expires})`;
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(expires));
  // Housekeeping: expired sessions are useless; drop them now and then.
  if (Math.random() < 0.05) await sql`delete from sessions where expires_at < now()`;
}

/** The signed-in user, or null. Extends the session when it's getting old. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (!sql) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = hashToken(token);
  const rows = await sql<{ id: string; email: string; name: string | null; expires_at: Date }[]>`
    select u.id, u.email, u.name, s.expires_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash} and s.expires_at > now()
  `;
  const row = rows[0];
  if (!row) return null;
  if (row.expires_at.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * 86_400_000) {
    const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
    await sql`update sessions set expires_at = ${expires} where token_hash = ${tokenHash}`;
    try {
      jar.set(SESSION_COOKIE, token, cookieOptions(expires));
    } catch {
      // Read from a Server Component, where cookies can't be set: renews next time.
    }
  }
  return { id: row.id, email: row.email, name: row.name };
}

/** Ends this browser's session. */
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token && sql) await sql`delete from sessions where token_hash = ${hashToken(token)}`;
  jar.delete(SESSION_COOKIE);
}
