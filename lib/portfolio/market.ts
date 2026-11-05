/**
 * Daily market tracking for portfolio estimates.
 *
 * The fund data source publishes returns, not daily unit prices, so between
 * statements each holding is moved with the markets its fund invests in: a
 * blend of euro-priced index ETFs chosen from the fund's category and risk
 * rating. A global equity fund moves with global shares; a "managed
 * balanced" fund moves roughly half with shares and half with euro bonds.
 * It's an estimate — close for index funds, rougher for actively managed or
 * multi-asset funds — and is shown as one.
 *
 * Shared by the browser (estimates) and the server (the daily price job).
 */
import type { Fund } from "@/lib/types";

export const BENCHMARKS = {
  world: { symbol: "EUNL.DE", label: "global shares", source: "iShares Core MSCI World UCITS ETF (EUR)" },
  europe: { symbol: "EXSA.DE", label: "european shares", source: "iShares STOXX Europe 600 UCITS ETF (EUR)" },
  emerging: { symbol: "IS3N.DE", label: "emerging-market shares", source: "iShares Core MSCI EM IMI UCITS ETF (EUR)" },
  gov: { symbol: "EUNH.DE", label: "euro government bonds", source: "iShares Core € Govt Bond UCITS ETF" },
  corp: { symbol: "EUN5.DE", label: "euro corporate bonds", source: "iShares Core € Corp Bond UCITS ETF" },
  cash: { symbol: "XEON.DE", label: "cash", source: "Xtrackers II EUR Overnight Rate Swap UCITS ETF" },
  property: { symbol: "IQQ6.DE", label: "listed property", source: "iShares Developed Markets Property Yield UCITS ETF (EUR)" },
} as const;

export type BenchmarkId = keyof typeof BENCHMARKS;
export type BenchmarkWeights = Partial<Record<BenchmarkId, number>>;

/** Share of the fund in shares, by SRI risk rating, for funds with no clearer label. */
const EQUITY_BY_RISK: Record<number, number> = { 1: 0, 2: 0.1, 3: 0.25, 4: 0.45, 5: 0.65, 6: 0.85, 7: 1 };

/** Shares and bonds in proportion, bonds two-thirds government, one-third corporate. */
function mix(equity: number, equityId: BenchmarkId = "world"): BenchmarkWeights {
  const bonds = 1 - equity;
  const w: BenchmarkWeights = {};
  if (equity > 0) w[equityId] = equity;
  if (bonds > 0) {
    w.gov = (bonds * 2) / 3;
    w.corp = bonds / 3;
  }
  return w;
}

/**
 * Which markets a fund is tracked against. Uses the source's own
 * subcategory where it says (e.g. "Managed Balanced (<65% Equity)"), then
 * the fund name, then the asset class and risk rating.
 */
export function benchmarkFor(fund: Fund): BenchmarkWeights {
  const sub = (fund.subcategory ?? "").toLowerCase();
  const name = fund.name.toLowerCase();
  const risk = Math.min(Math.max(Math.round(fund.riskRating), 1), 7);

  if (sub.includes("money market") || /\bcash\b|liquidity|deposit/.test(name)) return { cash: 1 };
  if (fund.assetClass === "Property" || sub.includes("property")) return { property: 1 };

  if (fund.assetClass === "Equity" || sub.startsWith("equity")) {
    if (sub.includes("emerging") || /emerging|china|india/.test(name)) return { emerging: 1 };
    if (/eurozone|advanced europe|equity uk|equity ireland/.test(sub) || /\beuro(zone|pean)?\b|irish equity|uk equity/.test(name))
      return { europe: 1 };
    return { world: 1 };
  }

  if (fund.assetClass === "Bond" || sub.startsWith("bond")) {
    if (sub.includes("government") || sub.includes("index-linked") || /gilt|government|sovereign/.test(name)) return { gov: 1 };
    if (sub.includes("corporate") || /corporate|credit/.test(name)) return { corp: 1 };
    return { gov: 0.5, corp: 0.5 };
  }

  if (sub.includes("defensive")) return mix(0.25);
  if (sub.includes("balanced")) return mix(0.5);
  if (sub.includes("aggressive")) return mix(0.75);

  // Lifecycle, specialist, fund-of-funds, structured and alternative funds:
  // by risk rating. Risk 1 is cash-like.
  if (risk === 1) return { cash: 1 };
  return mix(EQUITY_BY_RISK[risk]);
}

/** "75% global shares · 25% euro bonds" — for showing what a holding moves with. */
export function describeBenchmark(weights: BenchmarkWeights): string {
  const merged = new Map<string, number>();
  for (const [id, w] of Object.entries(weights) as [BenchmarkId, number][]) {
    const label = id === "gov" || id === "corp" ? "euro bonds" : BENCHMARKS[id].label;
    merged.set(label, (merged.get(label) ?? 0) + w);
  }
  return [...merged]
    .sort((a, b) => b[1] - a[1])
    .map(([label, w]) => (merged.size === 1 ? label : `${Math.round(w * 100)}% ${label}`))
    .join(" · ");
}

// ─── Price series ───────────────────────────────────────────────────────────

/** Daily closes per benchmark: ISO dates ascending, with matching closes. */
export interface MarketSeries {
  dates: string[];
  closes: number[];
}
export type MarketData = Partial<Record<BenchmarkId, MarketSeries>>;

/** The close on `date`, or the last one before it (weekends, holidays). Null before the series starts. */
export function closeOn(series: MarketSeries, date: string): number | null {
  const { dates, closes } = series;
  if (dates.length === 0 || date < dates[0]) return null;
  let lo = 0;
  let hi = dates.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (dates[mid] <= date) lo = mid;
    else hi = mid - 1;
  }
  return closes[lo];
}

/**
 * The blended market return from `from` to `to` for these weights, or null
 * if any weighted benchmark has no price on either date — the caller then
 * falls back to the fund's own yearly return.
 */
export function blendedReturn(weights: BenchmarkWeights, market: MarketData, from: string, to: string): number | null {
  let total = 0;
  for (const [id, w] of Object.entries(weights) as [BenchmarkId, number][]) {
    const series = market[id];
    if (!series) return null;
    const a = closeOn(series, from);
    const b = closeOn(series, to);
    if (a === null || b === null || a <= 0) return null;
    total += w * (b / a - 1);
  }
  return total;
}

/** The latest date every benchmark has a price for. */
export function marketAsOf(market: MarketData): string | null {
  const last = Object.values(market)
    .map((s) => s?.dates[s.dates.length - 1])
    .filter((d): d is string => Boolean(d));
  return last.length ? last.sort()[0] : null;
}
