import type { AssetClass, Fund, TrackedFund } from "@/lib/types";

/** Full calendar months between two dates (never negative). */
export function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, end.getDate() >= start.getDate() ? months : months - 1);
}

/** Converts an annual percentage rate into the equivalent monthly compounding rate. */
function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/**
 * Compounds a value monthly, adding a contribution at the end of each month.
 * Never returns a negative pot.
 */
export function projectValue({
  startValue,
  monthlyContribution,
  annualReturnPct,
  amcPct,
  months,
}: {
  startValue: number;
  monthlyContribution: number;
  annualReturnPct: number;
  amcPct: number | undefined;
  months: number;
}): number {
  const rate = monthlyRate(annualReturnPct - (amcPct ?? 0));
  let value = startValue;
  for (let i = 0; i < months; i++) {
    value = value * (1 + rate) + monthlyContribution;
  }
  return Math.max(Math.round(value * 100) / 100, 0);
}

// ─── Tracking: what a holding is worth now ──────────────────────────────────

export function totalMonthly(holding: TrackedFund): number {
  return holding.monthlyContribution + holding.employerContribution;
}

/**
 * Estimates a holding's value on `at`, starting from the value the user
 * entered on `valueAsOf` and growing it month by month at the fund's most
 * recent (1yr) return net of its charge, plus contributions.
 *
 * Tracking uses the 1yr figure on purpose: it is the best evidence of how the
 * fund actually did over the months since the user's statement. The long-run
 * projection below deliberately does not.
 */
export function estimateHoldingValue(holding: TrackedFund, fund: Fund, at: Date): number {
  return projectValue({
    startValue: holding.startValue,
    monthlyContribution: totalMonthly(holding),
    annualReturnPct: fund.oneYearReturn,
    amcPct: fund.amc,
    months: monthsBetween(new Date(holding.valueAsOf), at),
  });
}

// ─── Projection: what it could be worth ─────────────────────────────────────

/**
 * Long-run annual returns are capped to this band before they are compounded
 * for decades. One exceptional five years shouldn't become a 20-year promise,
 * and one bad one shouldn't project a pot to nothing.
 */
export const TREND_CAP_PCT = 12;
export const TREND_FLOOR_PCT = -2;

/**
 * Half-width of the cautious–optimistic range, per point of SRI risk rating.
 * A risk-1 cash fund gets ±0.75%/yr; a risk-6 equity fund gets ±4.5%/yr —
 * wide enough to be honest about what "current trends" can't tell you.
 */
export const RISK_SPREAD_PER_POINT = 0.75;

/** ECB medium-term inflation target, used for the "in today's money" view. */
export const INFLATION_PCT = 2;

export interface GrowthAssumption {
  /** Which published figure the trend is based on. */
  basis: "10yr" | "5yr";
  /** The fund's long-run annualised return, before the cap. */
  trendPct: number;
  /** Net of charges, after the cap — the expected case. */
  expectedPct: number;
  cautiousPct: number;
  optimisticPct: number;
  /** True when the cap or floor changed the trend. */
  capped: boolean;
}

/**
 * The growth rate a fund is projected at: its longest published annualised
 * return (10yr when the live data has it, otherwise 5yr), held inside a sane
 * band, minus its annual charge, with a range around it scaled by risk.
 */
export function growthAssumption(fund: Fund): GrowthAssumption {
  const basis = fund.tenYearReturn !== undefined ? "10yr" : "5yr";
  const trendPct = fund.tenYearReturn ?? fund.fiveYearReturn;
  const bounded = Math.min(Math.max(trendPct, TREND_FLOOR_PCT), TREND_CAP_PCT);
  const expectedPct = bounded - (fund.amc ?? 0);
  const spread = RISK_SPREAD_PER_POINT * fund.riskRating;
  return {
    basis,
    trendPct,
    expectedPct,
    cautiousPct: expectedPct - spread,
    optimisticPct: expectedPct + spread,
    capped: bounded !== trendPct,
  };
}

export interface ProjectionPoint {
  /** Calendar year this point falls at the end of. */
  year: number;
  /** Years from now. */
  offset: number;
  cautious: number;
  expected: number;
  optimistic: number;
  /** Today's value plus every contribution from here, with no growth at all. */
  paidIn: number;
}

export interface PortfolioProjection {
  points: ProjectionPoint[];
  /** Total of all contributions over the horizon (nominal euros). */
  contributionsOverPeriod: number;
  /** How much less the expected pot is than it would be with zero charges. */
  chargesCost: number;
}

type Position = { holding: TrackedFund; fund: Fund; valueNow: number };

/**
 * Projects the whole portfolio forward `years` from `now`, month by month,
 * holding by holding, in three scenarios. With `real`, every figure is
 * deflated into today's money at INFLATION_PCT.
 */
export function projectPortfolio(
  positions: Position[],
  { years, now, real }: { years: number; now: Date; real: boolean },
): PortfolioProjection {
  const assumptions = positions.map((p) => growthAssumption(p.fund));
  const rates = assumptions.map((a) => ({
    cautious: monthlyRate(a.cautiousPct),
    expected: monthlyRate(a.expectedPct),
    optimistic: monthlyRate(a.optimisticPct),
  }));
  // The same expected path with charges added back, to price what they cost.
  const grossRates = positions.map((p, i) =>
    monthlyRate(assumptions[i].expectedPct + (p.fund.amc ?? 0)),
  );

  const cautious = positions.map((p) => p.valueNow);
  const expected = positions.map((p) => p.valueNow);
  const optimistic = positions.map((p) => p.valueNow);
  const gross = positions.map((p) => p.valueNow);
  const monthly = positions.map((p) => totalMonthly(p.holding));

  const startTotal = positions.reduce((sum, p) => sum + p.valueNow, 0);
  const monthlyTotal = monthly.reduce((sum, m) => sum + m, 0);
  const deflator = (offset: number) => (real ? Math.pow(1 + INFLATION_PCT / 100, offset) : 1);
  const sum = (values: number[]) => values.reduce((total, v) => total + Math.max(v, 0), 0);

  const points: ProjectionPoint[] = [
    {
      year: now.getFullYear(),
      offset: 0,
      cautious: startTotal,
      expected: startTotal,
      optimistic: startTotal,
      paidIn: startTotal,
    },
  ];

  for (let offset = 1; offset <= years; offset++) {
    for (let month = 0; month < 12; month++) {
      for (let i = 0; i < positions.length; i++) {
        cautious[i] = cautious[i] * (1 + rates[i].cautious) + monthly[i];
        expected[i] = expected[i] * (1 + rates[i].expected) + monthly[i];
        optimistic[i] = optimistic[i] * (1 + rates[i].optimistic) + monthly[i];
        gross[i] = gross[i] * (1 + grossRates[i]) + monthly[i];
      }
    }
    const d = deflator(offset);
    points.push({
      year: now.getFullYear() + offset,
      offset,
      cautious: sum(cautious) / d,
      expected: sum(expected) / d,
      optimistic: sum(optimistic) / d,
      paidIn: (startTotal + monthlyTotal * 12 * offset) / d,
    });
  }

  return {
    points,
    contributionsOverPeriod: monthlyTotal * 12 * years,
    chargesCost: Math.max(sum(gross) - sum(expected), 0) / deflator(years),
  };
}

// ─── Summary: the portfolio at a glance ─────────────────────────────────────

export interface PortfolioSummary {
  valueNow: number;
  /** Estimated value at the user's last visit, for "since your last visit". */
  valueAtLastVisit: number;
  lastVisit: Date | null;
  monthlyPersonal: number;
  monthlyEmployer: number;
  /** Value-weighted annual charge across holdings, or null if none publish one. */
  blendedAmc: number | null;
  /** Value-weighted SRI risk rating. */
  blendedRisk: number;
  allocation: { assetClass: AssetClass; value: number; share: number }[];
}

export function summarisePortfolio(positions: Position[], now: Date): PortfolioSummary {
  const valueNow = positions.reduce((sum, p) => sum + p.valueNow, 0);

  // The latest of the holdings' last-seen times stands for the last visit.
  const lastSeen = positions
    .map((p) => new Date(p.holding.lastSeenAt))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const valueAtLastVisit = lastSeen
    ? positions.reduce(
        (sum, p) =>
          sum +
          (lastSeen < new Date(p.holding.valueAsOf)
            ? p.holding.startValue
            : estimateHoldingValue(p.holding, p.fund, lastSeen)),
        0,
      )
    : valueNow;

  const withAmc = positions.filter((p) => p.fund.amc !== undefined && p.valueNow > 0);
  const amcWeight = withAmc.reduce((sum, p) => sum + p.valueNow, 0);
  const blendedAmc =
    amcWeight > 0
      ? withAmc.reduce((sum, p) => sum + p.valueNow * (p.fund.amc ?? 0), 0) / amcWeight
      : null;

  const blendedRisk =
    valueNow > 0
      ? positions.reduce((sum, p) => sum + p.valueNow * p.fund.riskRating, 0) / valueNow
      : 0;

  const byClass = new Map<AssetClass, number>();
  for (const p of positions) {
    byClass.set(p.fund.assetClass, (byClass.get(p.fund.assetClass) ?? 0) + p.valueNow);
  }
  // By value today, so a contribution-only holding with nothing in it yet
  // doesn't show up as a 0% slice.
  const allocation = [...byClass.entries()]
    .filter(([, value]) => value > 0)
    .map(([assetClass, value]) => ({
      assetClass,
      value,
      share: valueNow > 0 ? value / valueNow : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return {
    valueNow,
    valueAtLastVisit,
    lastVisit: lastSeen && lastSeen < now ? lastSeen : null,
    monthlyPersonal: positions.reduce((sum, p) => sum + p.holding.monthlyContribution, 0),
    monthlyEmployer: positions.reduce((sum, p) => sum + p.holding.employerContribution, 0),
    blendedAmc,
    blendedRisk,
    allocation,
  };
}
