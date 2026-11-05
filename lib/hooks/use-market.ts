"use client";

import { useEffect, useState } from "react";
import type { MarketData } from "@/lib/portfolio/market";

/**
 * Daily index prices from `from` (the earliest date any holding needs),
 * for market-tracked estimates. `ready` turns true once the request has
 * settled, either way: without prices, estimates use yearly returns.
 */
export function useMarket(from: string | null) {
  const [state, setState] = useState<{ from: string | null; market: MarketData | undefined; ready: boolean }>({
    from: null,
    market: undefined,
    ready: false,
  });

  useEffect(() => {
    if (!from) return;
    let cancelled = false;
    fetch(`/api/market?from=${encodeURIComponent(from)}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? (r.json() as Promise<{ market: MarketData }>) : { market: {} as MarketData }))
      .catch(() => ({ market: {} as MarketData }))
      .then(({ market }) => {
        if (!cancelled) setState({ from, market: Object.keys(market).length ? market : undefined, ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, [from]);

  return { market: state.market, ready: state.from === from && state.ready };
}
