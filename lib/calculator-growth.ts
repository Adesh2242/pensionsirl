/**
 * Growth assumptions for the calculator, from what the money is invested
 * in. Long-run returns differ mostly by how much is in shares, so a fund's
 * share in shares (from the market blend fitted to its track record, see
 * lib/portfolio/fit.ts) sets its expected growth. Figures are before charges
 * and before inflation; the page lets people change them.
 */
import type { Fund } from "@/lib/types";
import { benchmarkFor, type BenchmarkId } from "@/lib/portfolio/market";
import { returnFor } from "@/lib/fund-returns";

/** Long-run yearly returns before charges: shares (and property, infrastructure), and bonds/cash. */
export const LONG_RUN = { sharesPct: 6.5, bondsPct: 3 } as const;

/** Markets that are lending or cash rather than ownership. */
const DEFENSIVE: BenchmarkId[] = ["gov", "corp", "cash", "inflationLinked", "emBonds"];

/** Share of a fund in shares and other growth assets, 0–100, from its fitted market blend. */
export function equitySharePct(fund: Fund): number {
  const weights = benchmarkFor(fund);
  const defensive = DEFENSIVE.reduce((sum, id) => sum + (weights[id] ?? 0), 0);
  const total = Object.values(weights).reduce((sum, w) => sum + (w ?? 0), 0) || 1;
  return Math.round(((total - defensive) / total) * 100);
}

/** Expected growth before charges for a mix with `sharesPct`% in shares. */
export function mixGrowthPct(sharesPct: number, assumptions: { sharesPct: number; bondsPct: number } = LONG_RUN): number {
  const s = Math.min(Math.max(sharesPct, 0), 100) / 100;
  return Math.round((s * assumptions.sharesPct + (1 - s) * assumptions.bondsPct) * 100) / 100;
}

/** A fund's own record: its 5-year average (else 3 or 1-year), with the period used. */
export function fundRecordPct(fund: Fund): { pct: number; years: 5 | 3 | 1 } | null {
  const five = returnFor(fund, "5y");
  if (five !== null) return { pct: five, years: 5 };
  const three = returnFor(fund, "3y");
  if (three !== null) return { pct: three, years: 3 };
  const one = returnFor(fund, "1y");
  return one !== null ? { pct: one, years: 1 } : null;
}

/** Ready-made mixes for people who don't know their fund. */
export const MIX_PRESETS = [
  { label: "cash", shares: 0 },
  { label: "cautious", shares: 30 },
  { label: "balanced", shares: 50 },
  { label: "growth", shares: 80 },
  { label: "all shares", shares: 100 },
] as const;

export function mixLabel(sharesPct: number): string {
  if (sharesPct <= 5) return "cash and bonds";
  if (sharesPct <= 35) return "cautious";
  if (sharesPct <= 60) return "balanced";
  if (sharesPct <= 90) return "growth";
  return "all shares";
}
