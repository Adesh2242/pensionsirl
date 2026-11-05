import { NextResponse } from "next/server";
import { consumeVerifyToken } from "@/lib/reports/repo";
import { publicOrigin } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/** The link in the verification email: confirms the address, then back to the portfolio. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await consumeVerifyToken(token).catch(() => null);
  const origin = publicOrigin(request);
  return NextResponse.redirect(`${origin}/portfolio?email=${ok ? "verified" : "link-expired"}#email-reports`, 303);
}
