import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { isGoogleConfigured } from "@/lib/auth/google";

export const dynamic = "force-dynamic";

/** Who is signed in, and which sign-in options this deployment offers. */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(
    {
      user,
      accounts: isDatabaseConfigured(),
      google: isGoogleConfigured(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
