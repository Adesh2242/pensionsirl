import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Best-effort server-side audit trail for cookie consent decisions, writing
 * to the `consent_log` table (see supabase/migrations/001_initial_schema.sql).
 * The cookie banner (components/layout/cookie-banner.tsx) is the source of
 * truth for the user's actual consent state (localStorage) — this route
 * only logs a copy for audit purposes, so failures here (Supabase not
 * configured, migration not applied) must never break the banner.
 *
 * Per the schema's design, no raw IP is stored — only a salted hash of it,
 * which is enough to dedupe/rate-reason about consent events without being
 * reversible to the visitor's real IP.
 */
export async function POST(request: Request) {
  let body: { analytics?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ logged: false, reason: "Supabase not configured" });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "pensioniq-consent-salt";
  const identifierHash = createHash("sha256").update(`${ip}:${salt}`).digest("hex");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("consent_log").insert({
    user_id: user?.id ?? null,
    necessary: true,
    analytics: Boolean(body.analytics),
    identifier_hash: identifierHash,
  });

  if (error) {
    // Expected until the migration is applied (relation does not exist) —
    // log server-side only, never surface to the client.
    console.warn("consent_log insert failed (non-fatal):", error.message);
    return NextResponse.json({ logged: false, reason: error.message });
  }

  return NextResponse.json({ logged: true });
}

/**
 * The signed-in user's own consent records, for "export my data" (GDPR
 * Art. 15). consent_log has no select policy, so this reads with the service
 * role, strictly filtered to the caller's own user id.
 */
export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ records: [] });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ records: [] });

  const { data, error } = await admin
    .from("consent_log")
    .select("necessary, analytics, decided_at")
    .eq("user_id", user.id)
    .order("decided_at", { ascending: true });
  if (error) return NextResponse.json({ records: [], error: error.message });
  return NextResponse.json({ records: data ?? [] });
}
