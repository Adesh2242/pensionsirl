"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { fetchLastScrapeTime } from "@/lib/supabase/funds-queries";
import { formatLastUpdated } from "@/lib/utils";

// One lookup per page load, shared by every instance on the page.
let request: Promise<string | null> | null = null;
function latestScrapeTime() {
  request ??= fetchLastScrapeTime(createClient() as SupabaseClient).catch(() => null);
  return request;
}

/**
 * "fund data updated 2 Nov 2026, 06:01 utc" — read live in the browser, so it
 * is right on every page, including ones that were built before the latest
 * weekly scrape.
 */
export function FundDataUpdated() {
  const [time, setTime] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    latestScrapeTime().then((value) => {
      if (!cancelled) setTime(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isSupabaseConfigured()) return <span>demo fund data</span>;
  if (!time) return null;
  return <span>fund data updated {formatLastUpdated(time)} utc</span>;
}
