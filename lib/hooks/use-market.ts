"use client";

import { useEffect, useState } from "react";
import type { MarketData } from "@/lib/portfolio/market";

/**
 * Daily index prices from `from` (the earliest date any holding needs),
 * for market-tracked estimates. `ready` turns true once the request has
 * settled, either way: without prices, estimates use yearly returns.
 */
export function useMarket(from: string | null, ids: string) {
  const [state, setState] = useState<{ from: string | null; market: MarketData | undefined; ready: boolean }>({
    from: null,
    market: undefined,
    ready: false,
  });

  useEffect(() => {
    if (!from || !ids) return;
    let cancelled = false;
    fetch(`/api/market?from=${encodeURIComponent(from)}&ids=${encodeURIComponent(ids)}`, { signal: AbortSignal.timeout(8000) })
      .then((r) => (r.ok ? (r.json() as Promise<{ market: MarketData }>) : { market: {} as MarketData }))
      .catch(() => ({ market: {} as MarketData }))
      .then(({ market }) => {
        if (!cancelled) setState({ from: `${from}|${ids}`, market: Object.keys(market).length ? market : undefined, ready: true });
      });
    return () => {
      cancelled = true;
    };
  }, [from, ids]);

  return { market: state.market, ready: state.from === `${from}|${ids}` && state.ready };
}
