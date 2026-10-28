"use client";

import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.1-5.1C33.7 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6 4.4C13.9 15.6 18.6 12.4 24 12.4c3.1 0 5.8 1.1 8 3l5.1-5.1C33.7 6.1 29.1 4 24 4c-7.6 0-14.2 4.3-17.7 10.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5 0 9.5-1.9 12.9-5.1l-6-5C29 35.4 26.6 36.4 24 36.4c-5.2 0-9.6-3.5-11.2-8.2l-6.1 4.7C10 39.6 16.5 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5C40.8 35.2 44 30.1 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleClick() {
    const supabase = createClient();
    if ("isMock" in supabase) return;
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Browser navigates away to Google; no need to clear loading on success.
  }

  return (
    <button
      type="button"
      className="lower flex w-full items-center justify-center gap-3 rounded-full border border-border px-6 py-3.5 text-sm transition-colors hover:border-foreground/30 hover:text-primary disabled:opacity-40"
      disabled={!configured || loading}
      title={configured ? undefined : "Available once Supabase is connected"}
      onClick={handleClick}
    >
      <GoogleLogo />
      {loading ? "redirecting…" : "continue with google"}
    </button>
  );
}
