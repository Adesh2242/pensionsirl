import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { clientIp, isSameOrigin, jsonError } from "@/lib/auth/request";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Best-effort audit trail of cookie-consent decisions. The banner's choice
 * in localStorage is the source of truth; this keeps a server-side copy. No
 * raw IP is stored — only a salted one-way hash of it. Records are deleted
 * after 24 months by the weekly job, or with the account.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
  if (!sql) return NextResponse.json({ logged: false });
  const ip = clientIp(request);
  const { success } = await checkRateLimit(`consent:${ip}`, 30, 60 * 60);
  if (!success) return NextResponse.json({ logged: false });

  const body = (await request.json().catch(() => null)) as { analytics?: unknown } | null;
  const salt = process.env.CONSENT_HASH_SALT ?? process.env.SESSION_SECRET ?? "pensioniq-consent";
  const identifierHash = createHash("sha256").update(`${ip}:${salt}`).digest("hex");
  const user = await getSessionUser();
  try {
    await sql`
      insert into consent_log (user_id, necessary, analytics, identifier_hash)
      values (${user?.id ?? null}, true, ${body?.analytics === true}, ${identifierHash})`;
    return NextResponse.json({ logged: true });
  } catch (error) {
    console.warn("consent_log insert failed (non-fatal):", error);
    return NextResponse.json({ logged: false });
  }
}

/** The signed-in user's own consent records, for "export my data" (GDPR Art. 15). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Please log in.", 401);
  if (!sql) return NextResponse.json({ records: [] });
  const records = await sql`
    select necessary, analytics, decided_at from consent_log
    where user_id = ${user.id} order by decided_at`;
  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } });
}
