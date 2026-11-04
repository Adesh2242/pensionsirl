import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { createSession } from "@/lib/auth/session";
import { createUser, normaliseEmail } from "@/lib/auth/users";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { clientIp, isSameOrigin, jsonError } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
  if (!isDatabaseConfigured()) return jsonError("Accounts aren't available right now.", 503);

  const { success } = await checkRateLimit(`signup:${clientIp(request)}`, 10, 60 * 60);
  if (!success) return jsonError("Too many sign-ups from here. Try again later.", 429);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const email = normaliseEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) || null : null;

  if (!email) return jsonError("Enter a valid email address.", 400);
  if (password.length < MIN_PASSWORD_LENGTH)
    return jsonError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`, 400);
  if (password.length > MAX_PASSWORD_LENGTH) return jsonError("That password is too long.", 400);

  const userId = await createUser({ email, name, password });
  if (!userId) return jsonError("An account with that email already exists. Try logging in.", 409);

  await createSession(userId);
  return NextResponse.json({ user: { id: userId, email, name } }, { status: 201 });
}
