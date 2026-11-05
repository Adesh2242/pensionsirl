import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth/request";
import { checkRateLimit } from "@/lib/rate-limit";
import { createVerifyToken, getReportSettings } from "@/lib/reports/repo";
import { isEmailConfigured, sendEmail } from "@/lib/email/send";
import { verifyEmail } from "@/lib/email/templates";
import { publicOrigin } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/** Emails the signed-in user a link that confirms their address. */
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  if (!isEmailConfigured()) return jsonError("Email isn't available right now.", 503);
  const settings = await getReportSettings(user.id);
  if (!settings) return jsonError("Please log in.", 401);
  if (settings.emailVerified) return NextResponse.json({ alreadyVerified: true });
  const { success } = await checkRateLimit(`verify-email:${user.id}`, 3, 60 * 60);
  if (!success) return jsonError("We've sent a few links already. Check your inbox (and spam), or try again in an hour.", 429);

  const token = await createVerifyToken(user.id, settings.email);
  const message = verifyEmail({ name: user.name, url: `${publicOrigin(request)}/verify-email?token=${token}` });
  try {
    await sendEmail({ to: settings.email, ...message });
  } catch (e) {
    console.error("verification email failed:", e instanceof Error ? e.message : e);
    return jsonError("The email couldn't be sent. Try again in a few minutes.", 502);
  }
  return NextResponse.json({ sent: true, to: settings.email });
}
