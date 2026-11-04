import { NextResponse } from "next/server";
import { isDatabaseConfigured, requireSql } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/auth/session";
import { findUserByEmail, normaliseEmail } from "@/lib/auth/users";
import { dummyPasswordHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { clientIp, isSameOrigin, jsonError } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

const WRONG = "Email or password is incorrect.";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
  if (!isDatabaseConfigured()) return jsonError("Accounts aren't available right now.", 503);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = normaliseEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password || password.length > 256) return jsonError(WRONG, 401);

  // Per IP and per account, so neither spraying one password across many
  // accounts nor guessing one account's password gets far.
  const [byIp, byAccount] = await Promise.all([
    checkRateLimit(`login-ip:${clientIp(request)}`, 30, 15 * 60),
    checkRateLimit(`login-acct:${email}`, 10, 15 * 60),
  ]);
  if (!byIp.success || !byAccount.success)
    return jsonError("Too many attempts. Wait 15 minutes and try again.", 429);

  const user = await findUserByEmail(email);
  // Same work whether or not the account exists, so timing doesn't tell.
  const { ok, needsRehash } = await verifyPassword(password, user?.password_hash ?? (await dummyPasswordHash()));
  if (!user || !user.password_hash || !ok) return jsonError(WRONG, 401);

  const sql = requireSql();
  if (needsRehash) {
    // Accounts migrated from Supabase move from bcrypt to scrypt here.
    await sql`update users set password_hash = ${await hashPassword(password)} where id = ${user.id}`;
  }
  await sql`update users set last_login_at = now() where id = ${user.id}`;
  await createSession(user.id);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
