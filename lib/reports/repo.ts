import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { requireSql } from "@/lib/db";
import { irishToday, nextSendOn, type Frequency } from "@/lib/reports/schedule";

/** A user's report settings as the portfolio page shows them. */
export interface ReportSettings {
  email: string;
  emailVerified: boolean;
  frequency: Frequency | "off";
  horizon: number;
  real: boolean;
  nextSendOn: string | null;
  lastSentAt: string | null;
}

export async function getReportSettings(userId: string): Promise<ReportSettings | null> {
  const sql = requireSql();
  const [row] = await sql<{
    email: string;
    email_verified_at: Date | null;
    frequency: Frequency | null;
    horizon: number | null;
    real: boolean | null;
    next_send_on: Date | null;
    last_sent_at: Date | null;
  }[]>`
    select u.email, u.email_verified_at, r.frequency, r.horizon, r.real, r.next_send_on, r.last_sent_at
    from users u left join report_schedules r on r.user_id = u.id
    where u.id = ${userId}`;
  if (!row) return null;
  return {
    email: row.email,
    emailVerified: row.email_verified_at !== null,
    frequency: row.frequency ?? "off",
    horizon: row.horizon ?? 20,
    real: row.real ?? false,
    nextSendOn: row.next_send_on ? row.next_send_on.toISOString().slice(0, 10) : null,
    lastSentAt: row.last_sent_at?.toISOString() ?? null,
  };
}

/** Turns reports on (or changes them), or off. Changing frequency moves the next date. */
export async function saveReportSchedule(
  userId: string,
  input: { frequency: Frequency | "off"; horizon: number; real: boolean },
) {
  const sql = requireSql();
  if (input.frequency === "off") {
    await sql`delete from report_schedules where user_id = ${userId}`;
    return;
  }
  const next = nextSendOn(input.frequency, irishToday());
  await sql`
    insert into report_schedules (user_id, frequency, horizon, real, next_send_on, unsubscribe_token)
    values (${userId}, ${input.frequency}, ${input.horizon}, ${input.real}, ${next}, ${randomBytes(24).toString("base64url")})
    on conflict (user_id) do update set
      next_send_on = case when report_schedules.frequency = excluded.frequency
                          then report_schedules.next_send_on else excluded.next_send_on end,
      frequency = excluded.frequency,
      horizon = excluded.horizon,
      real = excluded.real,
      updated_at = now()`;
}

/** Turns reports off for whoever holds this unsubscribe token. True if it matched. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const sql = requireSql();
  const rows = await sql`delete from report_schedules where unsubscribe_token = ${token} returning user_id`;
  return rows.length > 0;
}

// ── Email verification ─────────────────────────────────────────────────────

const VERIFY_HOURS = 24;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** A one-time token proving `email` belongs to the user. Replaces any earlier one. */
export async function createVerifyToken(userId: string, email: string): Promise<string> {
  const sql = requireSql();
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + VERIFY_HOURS * 3_600_000);
  await sql`delete from email_tokens where user_id = ${userId} and purpose = 'verify'`;
  await sql`
    insert into email_tokens (token_hash, user_id, purpose, email, expires_at)
    values (${hash(token)}, ${userId}, 'verify', ${email}, ${expires})`;
  return token;
}

/**
 * Uses a verification token. Marks the address verified only if it's still
 * the account's address. Returns the user id, or null for a bad/old link.
 */
export async function consumeVerifyToken(token: string): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const sql = requireSql();
  const [row] = await sql<{ user_id: string; email: string; fresh: boolean }[]>`
    delete from email_tokens
    where token_hash = ${hash(token)} and purpose = 'verify'
    returning user_id, email, expires_at > now() as fresh`;
  if (!row?.fresh) return null;
  const updated = await sql`
    update users set email_verified_at = coalesce(email_verified_at, now())
    where id = ${row.user_id} and email = ${row.email}
    returning id`;
  return updated.length ? row.user_id : null;
}
