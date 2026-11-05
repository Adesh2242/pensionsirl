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
  allWorld: { symbol: "IUSQ.DE", label: "global shares incl. emerging", source: "iShares MSCI ACWI UCITS ETF (EUR)" },
  worldHedged: { symbol: "IBCH.DE", label: "global shares (currency-hedged)", source: "iShares MSCI World EUR Hedged UCITS ETF" },
  usa: { symbol: "SXR8.DE", label: "us shares", source: "iShares Core S&P 500 UCITS ETF (EUR)" },
  japan: { symbol: "SXR5.DE", label: "japanese shares", source: "iShares MSCI Japan UCITS ETF (EUR)" },
  pacific: { symbol: "SXR1.DE", label: "asia-pacific shares", source: "iShares Core MSCI Pacific ex-Japan UCITS ETF (EUR)" },
  uk: { symbol: "SXRW.DE", label: "uk shares", source: "iShares Core FTSE 100 UCITS ETF (EUR)" },
  smallCap: { symbol: "IUSN.DE", label: "global smaller companies", source: "iShares MSCI World Small Cap UCITS ETF (EUR)" },
  tech: { symbol: "XDWT.DE", label: "global technology shares", source: "Xtrackers MSCI World Information Technology UCITS ETF" },
  infrastructure: { symbol: "IQQI.DE", label: "global infrastructure", source: "iShares Global Infrastructure UCITS ETF (EUR)" },
  commodities: { symbol: "EXXY.DE", label: "commodities", source: "iShares Diversified Commodity Swap UCITS ETF" },
  inflationLinked: { symbol: "IBCI.DE", label: "inflation-linked bonds", source: "iShares € Inflation Linked Govt Bond UCITS ETF" },
  emBonds: { symbol: "IUS7.DE", label: "emerging-market bonds", source: "iShares J.P. Morgan $ EM Bond UCITS ETF (EUR)" },
} as const;

export type BenchmarkId = keyof typeof BENCHMARKS;
export type BenchmarkWeights = Partial<Record<BenchmarkId, number>>;

/** Share of the fund in shares, by SRI risk rating, for funds with no clearer label. */
const EQUITY_BY_RISK: Record<number, number> = { 1: 0, 2: 0.1, 3: 0.25, 4: 0.45, 5: 0.65, 6: 0.85, 7: 1 };

export type BondMix = "gov-corp" | "gov" | "corp" | "cash";

/** Shares (in one market) and bonds in proportion. */
export function mix(equity: number, equityId: BenchmarkId = "world", bonds: BondMix = "gov-corp"): BenchmarkWeights {
  const rest = 1 - equity;
  const w: BenchmarkWeights = {};
  if (equity > 0) w[equityId] = equity;
  if (rest > 0) {
    if (bonds === "gov-corp") {
      w.gov = (rest * 2) / 3;
      w.corp = rest / 3;
    } else {
      w[bonds] = rest;
    }
  }
  return w;
}

/**
 * The family of blends a fund can be fitted within: which share markets
 * may stand in for its equity, how much of it is in shares (and the most
 * likely amount, which the fit is pulled towards), and what the rest is in.
 * Fixed-blend funds (cash, a single bond market) have nothing to fit.
 */
export interface FitSpace {
  equityIds: BenchmarkId[];
  shareMin: number;
  shareMax: number;
  sharePrior: number;
  bondMixes: BondMix[];
  /** A blend used as-is: fitting only measures how close it is. */
  fixed?: BenchmarkWeights;
}

const GLOBAL_EQUITY: BenchmarkId[] = ["world", "allWorld", "worldHedged"];

/**
 * What a fund invests in, from the source's subcategory, the fund's name,
 * its asset class and its risk rating. Name rules come first because the
 * subcategory is broad: "Equity Global" covers hedged, small-company,
 * technology and infrastructure funds alike.
 */
export function fitSpaceFor(fund: Fund): FitSpace {
  const sub = (fund.subcategory ?? "").toLowerCase();
  const name = fund.name.toLowerCase();
  const risk = Math.min(Math.max(Math.round(fund.riskRating), 1), 7);
  const fixed = (w: BenchmarkWeights): FitSpace => ({ equityIds: [], shareMin: 0, shareMax: 0, sharePrior: 0, bondMixes: [], fixed: w });
  const equity = (ids: BenchmarkId[]): FitSpace => ({ equityIds: ids, shareMin: 0.85, shareMax: 1, sharePrior: 1, bondMixes: ["cash"] });

  if (sub.includes("money market") || /\bcash\b|liquidity|deposit/.test(name)) return fixed({ cash: 1 });
  if (fund.assetClass === "Property" || sub.includes("property") || /\breit\b|property/.test(name))
    return /europe|euro/.test(name) ? fixed({ property: 0.5, europe: 0.5 }) : fixed({ property: 1 });

  // Specialist equity, by name.
  if (/infrastructure/.test(name)) return equity(["infrastructure"]);
  if (/energy|metals|commodit|resources|gold/.test(name) || sub.includes("materials")) return equity(["commodities"]);
  if (/technology|\btech\b/.test(name) || sub.includes("information technology")) return equity(["tech"]);
  if (/small(er)? (cap|compan)/.test(name) || sub.includes("small cap")) return equity(["smallCap"]);

  if (fund.assetClass === "Equity" || sub.startsWith("equity")) {
    if (sub.includes("emerging") || /emerging|china|india/.test(name)) return equity(["emerging"]);
    if (sub.includes("north america") || /north americ|\bus\b|\busa\b|american|s&p/.test(name)) return equity(["usa"]);
    if (sub.includes("japan") || /japan/.test(name)) return equity(["japan"]);
    if (sub.includes("asia") || /asia|pacific/.test(name)) return equity(["pacific", "emerging"]);
    if (sub.includes("equity uk") || /\buk\b|british/.test(name)) return equity(["uk"]);
    if (/eurozone|advanced europe|equity ireland/.test(sub) || /\beuro(zone|pean)?\b|irish equity/.test(name)) return equity(["europe"]);
    if (/hedged/.test(name) && !/unhedged/.test(name)) return equity(["worldHedged"]);
    return equity(GLOBAL_EQUITY);
  }

  if (fund.assetClass === "Bond" || sub.startsWith("bond")) {
    if (sub.includes("index-linked") || /inflation/.test(name)) return fixed({ inflationLinked: 1 });
    if (sub.includes("emerging") || /emerging/.test(name)) return fixed({ emBonds: 1 });
    if (sub.includes("government") || /gilt|government|sovereign/.test(name)) return { ...fixed({ gov: 1 }), bondMixes: ["gov"] };
    if (sub.includes("corporate") || /corporate|credit/.test(name)) return fixed({ corp: 1 });
    return fixed({ gov: 0.5, corp: 0.5 });
  }

  // Managed funds: the subcategory states the share band.
  const managed = (min: number, max: number, prior: number): FitSpace => ({
    equityIds: GLOBAL_EQUITY,
    shareMin: min,
    shareMax: max,
    sharePrior: prior,
    bondMixes: ["gov-corp", "gov", "corp", "cash"],
  });
  if (sub.includes("defensive")) return managed(0, 0.35, 0.25);
  if (sub.includes("balanced")) return managed(0.35, 0.65, 0.5);
  if (sub.includes("aggressive")) return managed(0.65, 1, 0.75);

  // Lifecycle, specialist, fund-of-funds, structured and alternative funds:
  // anywhere, pulled towards the share that matches the risk rating.
  if (risk === 1) return fixed({ cash: 1 });
  return managed(0, 1, EQUITY_BY_RISK[risk]);
}

/** The blend a fund starts from before any fit: its most likely mix. */
export function defaultBlend(space: FitSpace): BenchmarkWeights {
  return space.fixed ?? mix(space.sharePrior, space.equityIds[0], space.bondMixes[0]);
}

export type MatchQuality = "close" | "fair" | "rough";

/** A fund's fitted tracking, as stored by the daily job and served with the catalogue. */
export interface FundTracking {
  weights: BenchmarkWeights;
  /** How far the blend's past returns were from the fund's, in % a year (root-mean-square). */
  errorPp: number | null;
  quality: MatchQuality | null;
}

/** What a fund is tracked against: its fitted blend when there is one, else the rule-based default. */
export function benchmarkFor(fund: Fund): BenchmarkWeights {
  return fund.tracking?.weights && Object.keys(fund.tracking.weights).length
    ? fund.tracking.weights
    : defaultBlend(fitSpaceFor(fund));
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
