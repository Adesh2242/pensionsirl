import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireSql } from "@/lib/db";
import { requireUser, jsonError } from "@/lib/auth/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { getReportSettings } from "@/lib/reports/repo";
import { REPORT_HORIZONS } from "@/lib/reports/schedule";
import { sendReportTo } from "@/lib/reports/core";
import { isEmailConfigured } from "@/lib/email/send";
import { publicOrigin } from "@/lib/auth/google";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Send me one now": emails the report straight away, to a verified address only. */
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  if (!isEmailConfigured()) return jsonError("Email isn't available right now.", 503);
  const settings = await getReportSettings(user.id);
  if (!settings?.emailVerified) return jsonError("Confirm your email address first.", 403);
  const { success } = await checkRateLimit(`report-now:${user.id}`, 3, 60 * 60);
  if (!success) return jsonError("You've sent a few already. Try again in an hour.", 429);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const horizon = (REPORT_HORIZONS as readonly unknown[]).includes(body?.horizon) ? (body!.horizon as number) : settings.horizon;
  const real = typeof body?.real === "boolean" ? body.real : settings.real;
  try {
    const result = await sendReportTo(requireSql(), {
      user: { id: user.id, email: settings.email, name: user.name },
      horizon,
      real,
      now: new Date(),
      siteUrl: publicOrigin(request),
      idempotencyKey: `report-now-${user.id}-${randomUUID()}`,
    });
    if (!result.sent) return jsonError("Add a holding first: there's nothing to report yet.", 400);
    return NextResponse.json({ sent: true, to: settings.email });
  } catch (e) {
    console.error("report send failed:", e instanceof Error ? e.message : e);
    return jsonError("The email couldn't be sent. Try again in a few minutes.", 502);
  }
}
