import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Railway's healthcheck. Healthy whenever the server is up; reports the
 * database separately so a database blip doesn't take the whole site out of
 * rotation (fund pages fall back to cached or bundled data).
 */
export async function GET() {
  let database: "ok" | "unreachable" | "not-configured" = "not-configured";
  if (sql) {
    try {
      await sql`select 1`;
      database = "ok";
    } catch {
      database = "unreachable";
    }
  }
  return NextResponse.json(
    {
      status: "ok",
      database,
      gemini: process.env.GEMINI_API_KEY ? "configured" : "mock",
      timestamp: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
