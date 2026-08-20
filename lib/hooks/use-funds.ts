"use client";

import { useEffect, useState } from "react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  fetchFundsFromSupabase,
  fetchLastScrapeTime,
  fetchProvidersFromSupabase,
} from "@/lib/supabase/funds-queries";
import { funds as mockFunds, providers as mockProviders } from "@/lib/mock-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Fund, Provider } from "@/lib/types";

/**
 * Client-side counterpart to lib/data/funds.server.ts. Starts with the mock
 * dataset (so the page is interactive immediately, no loading flicker) and
 * swaps in live Supabase data in the background if it's configured and
 * returns rows — silently keeps the mock data otherwise.
 */
export function useFunds() {
  const [funds, setFunds] = useState<Fund[]>(mockFunds);
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [source, setSource] = useState<"mock" | "supabase">("mock");
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient() as SupabaseClient;

    let cancelled = false;
    Promise.all([fetchFundsFromSupabase(supabase), fetchProvidersFromSupabase(supabase)])
      .then(([liveFunds, liveProviders]) => {
        if (cancelled || liveFunds.length === 0) return;
        setFunds(liveFunds);
        if (liveProviders.length > 0) setProviders(liveProviders);
        setSource("supabase");
      })
      .catch((error) => {
        console.warn("Supabase funds query failed, staying on mock data:", error);
      });

    fetchLastScrapeTime(supabase)
      .then((time) => {
        if (!cancelled) setLastScrapeTime(time);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return { funds, providers, source, lastScrapeTime };
}
