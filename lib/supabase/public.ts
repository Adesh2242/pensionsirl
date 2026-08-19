import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-free Supabase client for publicly-readable data (funds, providers,
 * fund_prices — all have public SELECT RLS policies). Safe to use anywhere,
 * including generateStaticParams/build time, where there's no request
 * context for cookies() (see lib/supabase/server.ts, which needs one).
 */
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key);
}
