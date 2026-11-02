import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

/**
 * Exchanges the OAuth `code` from Google (or any other provider configured
 * in Supabase) for a session, then redirects into the app. Supabase's
 * signInWithOAuth() sends the browser here after the provider redirects back.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Validated: an unchecked `next` would make this an open redirect.
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}
