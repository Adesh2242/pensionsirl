"use client";

import { useEffect, useState } from "react";
import { formatLastUpdated } from "@/lib/utils";

// One lookup per page load, shared by every instance on the page.
let request: Promise<{ lastScrapeTime: string | null; live: boolean } | null> | null = null;
function latest() {
  request ??= fetch("/api/funds/updated")
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  return request;
}

/** "fund data updated 2 Nov 2026, 06:01 utc", read live so it's right on every page. */
export function FundDataUpdated() {
  const [state, setState] = useState<{ lastScrapeTime: string | null; live: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    latest().then((value) => {
      if (!cancelled) setState(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  if (!state.live) return <span>demo fund data</span>;
  if (!state.lastScrapeTime) return null;
  return <span>fund data updated {formatLastUpdated(state.lastScrapeTime)} utc</span>;
}
