import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/reports/repo";
import { publicOrigin } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/**
 * Stops emailed reports. The token in the link is the only credential (no
 * login, no Origin check): mail apps' one-click unsubscribe (RFC 8058)
 * POSTs here directly, and so does the button on /unsubscribe.
 */
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await unsubscribe(token).catch(() => false);
  // A form post gets a page back; a mail app just needs the 2xx.
  if (request.headers.get("content-type")?.includes("application/x-www-form-urlencoded")) {
    const body = await request.text().catch(() => "");
    if (!body.includes("List-Unsubscribe=One-Click")) {
      return NextResponse.redirect(`${publicOrigin(request)}/unsubscribe?done=${ok ? "1" : "0"}`, 303);
    }
  }
  return NextResponse.json({ unsubscribed: ok });
}

/** Opened in a browser: show the confirm page rather than acting on a GET. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return NextResponse.redirect(`${publicOrigin(request)}/unsubscribe?token=${encodeURIComponent(token)}`, 303);
}
