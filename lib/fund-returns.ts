import type { Fund, ReturnPeriod } from "@/lib/types";

/** Whether the fund has history for a period, rather than a placeholder 0. */
export function hasReturn(fund: Fund, period: ReturnPeriod): boolean {
  return !fund.missingReturns?.includes(period);
}

/** The fund's yearly return for a period, or null when it has no history that long. */
export function returnFor(fund: Fund, period: ReturnPeriod): number | null {
  if (!hasReturn(fund, period)) return null;
  if (period === "1y") return fund.oneYearReturn;
  if (period === "3y") return fund.threeYearReturn;
  return fund.fiveYearReturn;
}

/**
 * Turns a cumulative return over `years` into the average yearly return that
 * compounds to it: +30% over 5 years is +5.39% a year, not +6% and not +30%.
 */
export function annualise(cumulativePct: number, years: number): number {
  if (cumulativePct <= -100) return -100;
  const perYear = (Math.pow(1 + cumulativePct / 100, 1 / years) - 1) * 100;
  return Math.round(perYear * 100) / 100;
}
