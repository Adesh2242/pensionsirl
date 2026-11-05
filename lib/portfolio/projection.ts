import type { AssetClass, Fund, TrackedFund } from "@/lib/types";
import { returnFor } from "@/lib/fund-returns";
import { benchmarkFor, blendedReturn, describeBenchmark, type MarketData } from "@/lib/portfolio/market";

/** Full calendar months between two dates (never negative). */
export function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, end.getDate() >= start.getDate() ? months : months - 1);
}

/** Converts an annual percentage rate into the equivalent monthly compounding rate. */
function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

// ─── Charges: what a holding costs ──────────────────────────────────────────

/**
 * Annual management charge assumed when neither the user nor the fund gives
 * one. The live fund source publishes no charges, and 1% is typical for an
 * Irish personal pension or PRSA (the standard PRSA cap).
 */
export const ASSUMED_AMC_PCT = 1;

export interface HoldingCharges {
  /** Annual management charge, % of the pot a year. */
  amcPct: number;
  /** Where amcPct came from: the user's statement, the fund's published figure, or ASSUMED_AMC_PCT. */
  amcSource: "yours" | "fund" | "assumed";
  /** % taken off each contribution before it's invested. */
  contributionChargePct: number;
  /** Flat euros a year. */
  policyFee: number;
}

export function chargesFor(holding: TrackedFund, fund: Fund): HoldingCharges {
  const [amcPct, amcSource]: [number, HoldingCharges["amcSource"]] =
    holding.amcPct !== undefined
      ? [holding.amcPct, "yours"]
      : fund.amc !== undefined
        ? [fund.amc, "fund"]
        : [ASSUMED_AMC_PCT, "assumed"];
  return {
    amcPct,
    amcSource,
    contributionChargePct: holding.contributionChargePct ?? 0,
    policyFee: holding.policyFee ?? 0,
  };
}

/** The euros each kind of charge took in one month. */
export interface MonthFees {
  amc: number;
  contribution: number;
  policy: number;
}

/**
 * Moves one holding on a month: growth at `annualReturnPct` less the annual
 * charge, then the month's contribution less any contribution charge, then a
 * twelfth of the policy fee. Returns the new value (never negative) and what
 * each charge took.
 */
function stepMonth(
  value: number,
  annualReturnPct: number,
  contribution: number,
  charges: HoldingCharges,
): { value: number; fees: MonthFees } {
  const grown = value * (1 + monthlyRate(annualReturnPct - charges.amcPct));
  // The charge is the growth the pot would have had without it.
  const amc = Math.max(value * (1 + monthlyRate(annualReturnPct)) - grown, 0);
  const contributionFee = (contribution * charges.contributionChargePct) / 100;
  const beforeFee = Math.max(grown + contribution - contributionFee, 0);
  const policy = Math.min(charges.policyFee / 12, beforeFee);
  return { value: beforeFee - policy, fees: { amc, contribution: contributionFee, policy } };
}

const NO_CHARGES: HoldingCharges = {
  amcPct: 0,
  amcSource: "yours",
  contributionChargePct: 0,
  policyFee: 0,
};

/**
 * Compounds a value monthly, adding a contribution at the end of each month,
 * net of `charges`. Never returns a negative pot.
 */
export function projectValue({
  startValue,
  monthlyContribution,
  annualReturnPct,
  charges = NO_CHARGES,
  months,
}: {
  startValue: number;
  monthlyContribution: number;
  annualReturnPct: number;
  charges?: HoldingCharges;
  months: number;
}): number {
  let value = startValue;
  for (let i = 0; i < months; i++) {
    value = stepMonth(value, annualReturnPct, monthlyContribution, charges).value;
  }
  return Math.max(Math.round(value * 100) / 100, 0);
}

// ─── Tracking: what a holding is worth now ──────────────────────────────────

export function totalMonthly(holding: TrackedFund): number {
  return holding.monthlyContribution + holding.employerContribution;
}

const DAY_MS = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const utcDay = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Whole days from a holding's statement date to `at`. */
export function daysSince(valueAsOf: string, at: Date): number {
  return Math.max(0, Math.floor((utcDay(at) - Date.parse(`${valueAsOf}T00:00:00Z`)) / DAY_MS));
}

/**
 * How a holding is being kept current: the markets it's tracked against,
 * and whether daily prices cover the whole time since its statement.
 */
export function trackingFor(holding: TrackedFund, fund: Fund, market?: MarketData) {
  const weights = benchmarkFor(fund);
  const covered =
    !!market && blendedReturn(weights, market, holding.valueAsOf, holding.valueAsOf) !== null;
  return { weights, label: describeBenchmark(weights), covered, quality: fund.tracking?.quality ?? null };
}

/**
 * Estimates a holding's value on `at`, day by day from the value the user
 * entered on `valueAsOf`:
 *
 * - each day it moves with the markets the fund invests in (see
 *   lib/portfolio/market.ts), or — for days without market prices, or when
 *   none are loaded — at the fund's latest 1-year return, spread evenly;
 * - the annual management charge comes off daily;
 * - contributions arrive evenly through the month, less any contribution
 *   charge, and any policy fee is taken evenly through the year.
 *
 * So the value moves every day, and with the markets: if global shares fall
 * 5% this week, a global equity holding shows roughly that.
 */
export function estimateHoldingValue(holding: TrackedFund, fund: Fund, at: Date, market?: MarketData): number {
  const charges = chargesFor(holding, fund);
  const days = daysSince(holding.valueAsOf, at);
  const weights = market ? benchmarkFor(fund) : null;
  const fallbackDaily = Math.pow(1 + (returnFor(fund, "1y") ?? 0) / 100, 1 / 365) - 1;
  const chargeDaily = Math.pow(1 + charges.amcPct / 100, 1 / 365);
  const contributionDaily = ((totalMonthly(holding) * 12) / 365) * (1 - charges.contributionChargePct / 100);
  const feeDaily = charges.policyFee / 365;

  const start = Date.parse(`${holding.valueAsOf}T00:00:00Z`);
  let value = holding.startValue;
  let previous = holding.valueAsOf;
  for (let i = 1; i <= days; i++) {
    const today = isoDay(start + i * DAY_MS);
    const marketReturn = weights && market ? blendedReturn(weights, market, previous, today) : null;
    value = Math.max(((value * (1 + (marketReturn ?? fallbackDaily))) / chargeDaily) + contributionDaily - feeDaily, 0);
    previous = today;
  }
  return Math.round(value * 100) / 100;
}

// ─── Projection: what it could be worth ─────────────────────────────────────

/**
 * Half-width of the cautious–optimistic range, per point of SRI risk rating.
 * A risk-1 cash fund gets ±0.75%/yr; a risk-6 equity fund gets ±4.5%/yr —
 * wide enough to be honest about what "current trends" can't tell you.
 */
export const RISK_SPREAD_PER_POINT = 0.75;

/** ECB medium-term inflation target, used for the "in today's money" view. */
export const INFLATION_PCT = 2;

export interface GrowthAssumption {
  /**
   * Which return the projection rests on: the 5-year average, or — for a fund
   * too young to have one — the longest history it does have. "none" means
   * no return history at all, so no growth is assumed.
   */
  basis: "5yr" | "3yr" | "1yr" | "none";
  /** That average yearly return, before charges. */
  averagePct: number;
  /** After the fund's annual charge — the expected case. */
  expectedPct: number;
  cautiousPct: number;
  optimisticPct: number;
}

/**
 * The yearly growth rate a fund is projected at: its 5-year average yearly
 * return, less the holding's annual charge (`amcPct`), with a cautious–optimistic range around it
 * scaled by risk. A fund younger than five years falls back to its 3-year,
 * then 1-year average, and says so; one with no history assumes no growth.
 *
 * Deliberately not last year's return: one year is too noisy to compound for
 * decades, and five years spans both good and bad markets.
 */
export function growthAssumption(fund: Fund, amcPct: number): GrowthAssumption {
  const five = returnFor(fund, "5y");
  const three = returnFor(fund, "3y");
  const one = returnFor(fund, "1y");
  const [basis, averagePct]: [GrowthAssumption["basis"], number] =
    five !== null
      ? ["5yr", five]
      : three !== null
        ? ["3yr", three]
        : one !== null
          ? ["1yr", one]
          : ["none", 0];

  const expectedPct = averagePct - amcPct;
  // No history means no basis for a range either.
  const spread = basis === "none" ? 0 : RISK_SPREAD_PER_POINT * fund.riskRating;
  return {
    basis,
    averagePct,
    expectedPct,
    cautiousPct: expectedPct - spread,
    optimisticPct: expectedPct + spread,
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

/** What charges take over the horizon, in the expected case. */
export interface ChargesBreakdown {
  /** Annual management charges taken from the pot. */
  amc: number;
  /** Taken off contributions before they're invested. */
  contribution: number;
  /** Flat policy fees. */
  policy: number;
  /** amc + contribution + policy: the euros actually taken. */
  paid: number;
  /** Growth those euros would have earned had they stayed invested. */
  lostGrowth: number;
  /** How much smaller the pot ends up than with no charges at all: paid + lostGrowth. */
  impact: number;
  /** Charges taken in the first year — what they cost now. */
  firstYear: number;
  /** Per holding, in `positions` order. */
  perHolding: { firstYear: number; paid: number; impact: number }[];
}

export interface PortfolioProjection {
  points: ProjectionPoint[];
  /** Total of all contributions over the horizon (nominal euros). */
  contributionsOverPeriod: number;
  charges: ChargesBreakdown;
}

type Position = { holding: TrackedFund; fund: Fund; valueNow: number };

/**
 * Projects the whole portfolio forward `years` from `now`, month by month,
 * holding by holding, in three scenarios — and alongside them the expected
 * case with no charges at all, to price what charges cost. With `real`, every
 * figure is deflated into today's money at INFLATION_PCT.
 */
export function projectPortfolio(
  positions: Position[],
  { years, now, real }: { years: number; now: Date; real: boolean },
): PortfolioProjection {
  const charges = positions.map((p) => chargesFor(p.holding, p.fund));
  const assumptions = positions.map((p, i) => growthAssumption(p.fund, charges[i].amcPct));
  // Each scenario's return before the annual charge, which stepMonth takes off.
  const gross = assumptions.map((a, i) => ({
    cautious: a.cautiousPct + charges[i].amcPct,
    expected: a.averagePct,
    optimistic: a.optimisticPct + charges[i].amcPct,
  }));

  const cautious = positions.map((p) => p.valueNow);
  const expected = positions.map((p) => p.valueNow);
  const optimistic = positions.map((p) => p.valueNow);
  const noCharges = positions.map((p) => p.valueNow);
  const monthly = positions.map((p) => totalMonthly(p.holding));

  const startTotal = positions.reduce((sum, p) => sum + p.valueNow, 0);
  const monthlyTotal = monthly.reduce((sum, m) => sum + m, 0);
  const deflator = (offset: number) => (real ? Math.pow(1 + INFLATION_PCT / 100, offset) : 1);
  const sum = (values: number[]) => values.reduce((total, v) => total + Math.max(v, 0), 0);

  const fees = { amc: 0, contribution: 0, policy: 0 };
  const perHolding = positions.map(() => ({ firstYear: 0, paid: 0, impact: 0 }));

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
    // Fees taken during this year, counted in that year's money.
    const d = deflator(offset);
    for (let month = 0; month < 12; month++) {
      for (let i = 0; i < positions.length; i++) {
        cautious[i] = stepMonth(cautious[i], gross[i].cautious, monthly[i], charges[i]).value;
        optimistic[i] = stepMonth(optimistic[i], gross[i].optimistic, monthly[i], charges[i]).value;
        noCharges[i] = stepMonth(noCharges[i], gross[i].expected, monthly[i], NO_CHARGES).value;
        const step = stepMonth(expected[i], gross[i].expected, monthly[i], charges[i]);
        expected[i] = step.value;
        const taken = (step.fees.amc + step.fees.contribution + step.fees.policy) / d;
        fees.amc += step.fees.amc / d;
        fees.contribution += step.fees.contribution / d;
        fees.policy += step.fees.policy / d;
        perHolding[i].paid += taken;
        if (offset === 1) perHolding[i].firstYear += taken;
      }
    }
    points.push({
      year: now.getFullYear() + offset,
      offset,
      cautious: sum(cautious) / d,
      expected: sum(expected) / d,
      optimistic: sum(optimistic) / d,
      paidIn: (startTotal + monthlyTotal * 12 * offset) / d,
    });
  }

  const endDeflator = deflator(years);
  perHolding.forEach((h, i) => {
    h.impact = Math.max(noCharges[i] - expected[i], 0) / endDeflator;
  });
  const paid = fees.amc + fees.contribution + fees.policy;
  const impact = Math.max(sum(noCharges) - sum(expected), 0) / endDeflator;

  return {
    points,
    contributionsOverPeriod: monthlyTotal * 12 * years,
    charges: {
      ...fees,
      paid,
      lostGrowth: Math.max(impact - paid, 0),
      impact,
      firstYear: perHolding.reduce((total, h) => total + h.firstYear, 0),
      perHolding,
    },
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
  /** Value-weighted annual management charge across holdings (equal weights while all are at zero). */
  blendedAmc: number;
  /** True when any holding's charge is ASSUMED_AMC_PCT rather than the user's or the fund's. */
  amcAssumed: boolean;
  /** Every charge the portfolio pays over the next 12 months at today's value and contributions. */
  yearlyChargesNow: number;
  /** Value-weighted SRI risk rating. */
  blendedRisk: number;
  allocation: { assetClass: AssetClass; value: number; share: number }[];
}

export function summarisePortfolio(positions: Position[], now: Date, market?: MarketData): PortfolioSummary {
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
            : estimateHoldingValue(p.holding, p.fund, lastSeen, market)),
        0,
      )
    : valueNow;

  const charges = positions.map((p) => chargesFor(p.holding, p.fund));
  const weights = positions.map((p) => (valueNow > 0 ? p.valueNow : 1));
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  const blendedAmc =
    weightTotal > 0
      ? charges.reduce((sum, c, i) => sum + c.amcPct * weights[i], 0) / weightTotal
      : 0;
  const yearlyChargesNow = positions.reduce(
    (sum, p, i) =>
      sum +
      (p.valueNow * charges[i].amcPct) / 100 +
      (totalMonthly(p.holding) * 12 * charges[i].contributionChargePct) / 100 +
      charges[i].policyFee,
    0,
  );

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
    amcAssumed: charges.some((c) => c.amcSource === "assumed"),
    yearlyChargesNow,
    blendedRisk,
    allocation,
  };
}
