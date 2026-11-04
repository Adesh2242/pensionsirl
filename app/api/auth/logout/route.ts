import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";
import { isSameOrigin, jsonError } from "@/lib/auth/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Cross-site request blocked.", 403);
  await destroySession();
  return NextResponse.json({ ok: true });
}
