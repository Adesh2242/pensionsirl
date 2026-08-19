import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return NextResponse.json({
    status: "ok",
    supabase: supabaseConfigured ? "configured" : "mock",
    gemini: process.env.GEMINI_API_KEY ? "configured" : "mock",
    timestamp: new Date().toISOString(),
  });
}
