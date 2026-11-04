import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/request";
import { markSeen } from "@/lib/portfolio/repo";

export const dynamic = "force-dynamic";

/** Resets "since your last visit". */
export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  return NextResponse.json({ seenAt: await markSeen(user.id) });
}
