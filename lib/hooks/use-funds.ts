"use client";

import { useEffect, useState } from "react";
import { funds as mockFunds, providers as mockProviders } from "@/lib/mock-data";
import type { Fund, Provider } from "@/lib/types";

/**
 * Where the live fetch stands. "unavailable" means the server answered with
 * the bundled dataset (database not configured or unreachable), so what's
 * on screen is a stand-in, not something to save holdings against.
 */
export type LiveFundsStatus = "loading" | "live" | "unavailable";

interface CatalogResponse {
  funds: Fund[];
  providers: Provider[];
  lastScrapeTime: string | null;
  live: boolean;
}

// One request per page load, shared by every component that asks.
let request: Promise<CatalogResponse> | null = null;
function loadCatalog() {
  request ??= fetch("/api/funds")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<CatalogResponse>;
    })
    .catch((error) => {
      request = null; // let a later mount retry
      throw error;
    });
  return request;
}

/**
 * Starts with the bundled dataset (so the page is interactive immediately)
 * and swaps in the live catalogue from /api/funds.
 */
export function useFunds() {
  const [funds, setFunds] = useState<Fund[]>(mockFunds);
  const [providers, setProviders] = useState<Provider[]>(mockProviders);
  const [source, setSource] = useState<"mock" | "live">("mock");
  const [status, setStatus] = useState<LiveFundsStatus>("loading");
  const [lastScrapeTime, setLastScrapeTime] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadCatalog()
      .then((data) => {
        if (cancelled) return;
        setLastScrapeTime(data.lastScrapeTime);
        if (!data.live || data.funds.length === 0) {
          setStatus("unavailable");
          return;
        }
        setFunds(data.funds);
        if (data.providers.length > 0) setProviders(data.providers);
        setSource("live");
        setStatus("live");
      })
      .catch((error) => {
        console.warn("Fund catalogue request failed, staying on bundled data:", error);
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { funds, providers, source, status, lastScrapeTime };
}
