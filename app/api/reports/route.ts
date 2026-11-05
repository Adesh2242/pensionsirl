import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth/request";
import { getReportSettings, saveReportSchedule } from "@/lib/reports/repo";
import { REPORT_HORIZONS, isFrequency } from "@/lib/reports/schedule";
import { isEmailConfigured } from "@/lib/email/send";

export const dynamic = "force-dynamic";
const noStore = { headers: { "Cache-Control": "no-store" } };

/** The signed-in user's emailed-report settings. */
export async function GET(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const settings = await getReportSettings(user.id);
  return NextResponse.json({ settings, available: isEmailConfigured() }, noStore);
}

/** Sets how often reports are emailed: monthly, quarterly, yearly or off. */
export async function PUT(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const frequency = body?.frequency;
  if (frequency !== "off" && !isFrequency(frequency)) return jsonError("Choose monthly, quarterly, yearly or off.", 400);
  const horizon = (REPORT_HORIZONS as readonly unknown[]).includes(body?.horizon) ? (body!.horizon as number) : 20;
  const real = body?.real === true;
  if (frequency !== "off") {
    const current = await getReportSettings(user.id);
    if (!current?.emailVerified) return jsonError("Confirm your email address first.", 403);
  }
  await saveReportSchedule(user.id, { frequency, horizon, real });
  return NextResponse.json({ settings: await getReportSettings(user.id) }, noStore);
}
