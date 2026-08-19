import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client. Returns null when NEXT_PUBLIC_SUPABASE_URL /
 * _ANON_KEY aren't configured — the mock auth layer (lib/supabase/mock-client.ts)
 * is browser-only (localStorage), so there is no server-side session to read in
 * mock mode. Server components/routes that need auth should treat a null
 * client as "not configured" and fall back to client-side state.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component with no request context — safe to ignore
          // since the proxy (middleware) refreshes sessions on every request.
        }
      },
    },
  });
}
