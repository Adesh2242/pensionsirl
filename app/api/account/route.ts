import { NextResponse } from "next/server";
import { requireSql } from "@/lib/db";
import { destroySession } from "@/lib/auth/session";
import { requireUser } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

/**
 * Permanently deletes the signed-in user's account and everything tied to it
 * (GDPR Art. 17): holdings and sessions go with the user row (on delete
 * cascade); consent records are deleted outright rather than anonymised.
 */
export async function DELETE(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const sql = requireSql();
  await sql.begin(async (t) => {
    const tx = t as unknown as typeof sql;
    await tx`delete from consent_log where user_id = ${user.id}`;
    await tx`delete from users where id = ${user.id}`;
  });
  await destroySession();
  return NextResponse.json({ success: true });
}
