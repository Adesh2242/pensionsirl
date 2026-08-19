"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getMockClient } from "./mock-client";

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * Returns a real Supabase client when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are
 * set, otherwise a localStorage-backed mock with the same auth.* surface area.
 * Callers only use auth.signUp/signInWithPassword/signOut/getUser/getSession/
 * onAuthStateChange, so both implementations are interchangeable.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    return createBrowserClient(url, key);
  }
  return getMockClient();
}
