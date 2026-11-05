/**
 * Daily: emails every portfolio report that's due. Runs on Railway in the
 * `prices` cron service, straight after the price update (21:30 UTC daily);
 * locally `pnpm reports`.
 *
 * Each due schedule is claimed first (its next date moved on), then sent,
 * so a crash or a second run never double-sends; a failed send puts the
 * date back so tomorrow's run retries it. Resend's idempotency key covers
 * the gap between sending and recording.
 */
import postgres from "postgres";
import { sendReportTo } from "../lib/reports/core";
import { irishToday, nextSendOn, type Frequency } from "../lib/reports/schedule";
import { isEmailConfigured } from "../lib/email/send";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://pensioniq.ie").replace(/\/$/, "");
/** Resend's default rate limit is a few requests a second. */
const PAUSE_MS = 600;

interface Due {
  user_id: string;
  email: string;
  name: string | null;
  frequency: Frequency;
  horizon: number;
  real: boolean;
  next_send_on: Date;
  unsubscribe_token: string;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (!isEmailConfigured()) throw new Error("EMAIL_API_KEY is not set.");
  const sql = postgres(url, { max: 2, ssl: /sslmode=require/.test(url) ? "require" : false, onnotice: () => {} });
  const today = irishToday();
  const counts = { sent: 0, empty: 0, failed: 0 };
  try {
    const due = await sql<Due[]>`
      select r.user_id, u.email, u.name, r.frequency, r.horizon, r.real, r.next_send_on, r.unsubscribe_token
      from report_schedules r join users u on u.id = r.user_id
      where r.next_send_on <= ${today} and u.email_verified_at is not null
      order by r.next_send_on, r.user_id`;
    console.log(`reports: ${due.length} due on ${today}`);

    for (const d of due) {
      const was = d.next_send_on.toISOString().slice(0, 10);
      const next = nextSendOn(d.frequency, today);
      const claimed = await sql`
        update report_schedules set next_send_on = ${next}, updated_at = now()
        where user_id = ${d.user_id} and next_send_on = ${was} returning user_id`;
      if (claimed.length === 0) continue; // another run took it
      try {
        const result = await sendReportTo(sql, {
          user: { id: d.user_id, email: d.email, name: d.name },
          horizon: d.horizon,
          real: d.real,
          now: new Date(),
          siteUrl: SITE_URL,
          frequency: d.frequency,
          unsubscribeToken: d.unsubscribe_token,
          idempotencyKey: `report-${d.user_id}-${was}`,
        });
        if (result.sent) {
          counts.sent++;
          await sql`update report_schedules set last_sent_at = now(), last_error = null where user_id = ${d.user_id}`;
        } else {
          // No holdings: nothing to send this time; try again next period.
          counts.empty++;
        }
      } catch (error) {
        counts.failed++;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`reports: send failed for one user — ${message}`, (error as { cause?: unknown })?.cause ?? "");
        await sql`
          update report_schedules set next_send_on = ${was}, last_error = ${message.slice(0, 500)}
          where user_id = ${d.user_id}`;
      }
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    console.log(`reports: sent ${counts.sent}, nothing to report ${counts.empty}, failed ${counts.failed}`);
  } finally {
    await sql.end();
  }
  if (counts.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("reports: failed —", error);
  process.exit(1);
});
