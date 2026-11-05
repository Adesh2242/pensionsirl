/**
 * Fits each fund to the blend of markets that best explains its own track
 * record. For every candidate blend in the fund's fit space (see
 * fitSpaceFor), the blend's return over the last 1, 3 and 5 years is
 * compared with what the fund actually returned over the same periods;
 * the closest wins, pulled gently towards the fund's most likely mix so
 * three data points can't drag it somewhere implausible.
 *
 * The leftover difference is the match quality shown to users: "close"
 * means the blend has tracked the fund to within about 1.5% a year.
 *
 * Plain functions, no server-only imports: run by the daily price job.
 */
import type { Fund } from "@/lib/types";
import { returnFor } from "@/lib/fund-returns";
import {
  closeOn,
  defaultBlend,
  fitSpaceFor,
  mix,
  type BenchmarkId,
  type BenchmarkWeights,
  type FundTracking,
  type MarketData,
  type MatchQuality,
} from "@/lib/portfolio/market";

/** Fund returns are after the fund's own charge; index ETFs' are close to gross. Typical Irish fund charge. */
export const ASSUMED_FUND_CHARGE_PCT = 1;

/** Pull towards the most likely share in shares: a 20-point move costs as much as 1% a year of error. */
const PRIOR_WEIGHT = 25;

const SHARE_STEP = 0.05;

function yearsBefore(date: string, years: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

/** Growth multiple of one benchmark over `years` to `asOf` (e.g. 1.25 for +25%), or null without prices. */
function growth(market: MarketData, id: BenchmarkId, asOf: string, years: number): number | null {
  const series = market[id];
  if (!series) return null;
  const start = closeOn(series, yearsBefore(asOf, years));
  const end = closeOn(series, asOf);
  return start && end ? end / start : null;
}

export function qualityFor(errorPp: number): MatchQuality {
  if (errorPp <= 1.5) return "close";
  if (errorPp <= 3.5) return "fair";
  return "rough";
}

/**
 * The best-fitting blend for one fund, with its error. `asOf` is the date
 * the fund's published returns run to.
 */
export function fitFund(fund: Fund, market: MarketData, asOf: string): FundTracking {
  const space = fitSpaceFor(fund);
  const targets = ([1, 3, 5] as const)
    .map((years) => ({ years, fund: returnFor(fund, years === 1 ? "1y" : years === 3 ? "3y" : "5y") }))
    .filter((t): t is { years: 1 | 3 | 5; fund: number } => t.fund !== null);
  const fallback = defaultBlend(space);
  if (targets.length === 0) return { weights: fallback, errorPp: null, quality: null };

  const growthCache = new Map<string, number | null>();
  const g = (id: BenchmarkId, years: number) => {
    const key = `${id}:${years}`;
    if (!growthCache.has(key)) growthCache.set(key, growth(market, id, asOf, years));
    return growthCache.get(key)!;
  };

  /** Root-mean-square gap in % a year between the blend (after charge) and the fund, over the periods both have. */
  const errorOf = (weights: BenchmarkWeights): number | null => {
    let sum = 0;
    let n = 0;
    for (const t of targets) {
      let blended = 0;
      let ok = true;
      for (const [id, w] of Object.entries(weights) as [BenchmarkId, number][]) {
        const m = g(id, t.years);
        if (m === null) {
          ok = false;
          break;
        }
        blended += w * m;
      }
      if (!ok || blended <= 0) continue;
      const modelPct = (Math.pow(blended, 1 / t.years) - 1) * 100 - ASSUMED_FUND_CHARGE_PCT;
      sum += (modelPct - t.fund) ** 2;
      n++;
    }
    return n ? Math.sqrt(sum / n) : null;
  };

  const candidates: { weights: BenchmarkWeights; share: number }[] = [];
  if (space.fixed) {
    candidates.push({ weights: space.fixed, share: space.sharePrior });
  } else {
    for (const equityId of space.equityIds) {
      for (let s = space.shareMin; s <= space.shareMax + 1e-9; s += SHARE_STEP) {
        const share = Math.round(s * 100) / 100;
        for (const bonds of share >= 1 ? space.bondMixes.slice(0, 1) : space.bondMixes) {
          candidates.push({ weights: mix(share, equityId, bonds), share });
        }
      }
    }
  }

  let best: { weights: BenchmarkWeights; error: number; score: number } | null = null;
  for (const c of candidates) {
    const error = errorOf(c.weights);
    if (error === null) continue;
    const score = error ** 2 + PRIOR_WEIGHT * (c.share - space.sharePrior) ** 2;
    if (!best || score < best.score) best = { weights: c.weights, error, score };
  }
  if (!best) return { weights: fallback, errorPp: null, quality: null };
  const errorPp = Math.round(best.error * 100) / 100;
  return { weights: roundWeights(best.weights), errorPp, quality: qualityFor(errorPp) };
}

function roundWeights(w: BenchmarkWeights): BenchmarkWeights {
  const out: BenchmarkWeights = {};
  for (const [id, v] of Object.entries(w) as [BenchmarkId, number][]) {
    if (v > 0.0001) out[id] = Math.round(v * 10000) / 10000;
  }
  return out;
}
