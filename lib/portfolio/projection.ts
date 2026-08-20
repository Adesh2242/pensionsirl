/** Full calendar months between two dates (never negative). */
export function monthsBetween(start: Date, end: Date): number {
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  return Math.max(0, end.getDate() >= start.getDate() ? months : months - 1);
}

/**
 * Projects a tracked holding's current value from a starting value and
 * monthly contribution, compounding monthly at the fund's net annual return
 * (1yr return minus AMC, matching the calculator's approach in
 * lib/calculations.ts, just compounded monthly instead of annually since
 * alerts are monthly).
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
  const netAnnualRate = (annualReturnPct - (amcPct ?? 0)) / 100;
  const monthlyRate = Math.pow(1 + netAnnualRate, 1 / 12) - 1;

  let value = startValue;
  for (let i = 0; i < months; i++) {
    value = value * (1 + monthlyRate) + monthlyContribution;
  }
  return Math.max(Math.round(value * 100) / 100, 0);
}
