import type { CsvRow } from "@/lib/csv";
import { money, pct } from "@/lib/csv";
import { disclaimerLines } from "@/lib/disclaimers";
import type { Fund, TrackedFund } from "@/lib/types";
import {
  INFLATION_PCT,
  chargesFor,
  growthAssumption,
  totalMonthly,
  type PortfolioProjection,
  type PortfolioSummary,
} from "@/lib/portfolio/projection";

type Position = { holding: TrackedFund; fund: Fund; valueNow: number };

const BASIS: Record<string, string> = {
  "5yr": "5-year average",
  "3yr": "3-year average (fund under 5 years old)",
  "1yr": "1-year return (fund under 3 years old)",
  none: "no return history - no growth assumed",
};

/**
 * The portfolio page as a spreadsheet: summary, holdings with their charges
 * and growth rates, the year-by-year projection and the cost of charges,
 * with the page's warnings at the top and bottom. The user's own data, for
 * their own use; it never leaves their browser.
 */
export function portfolioCsvRows({
  positions,
  summary,
  projection,
  horizon,
  real,
  now,
  lastScrapeTime,
}: {
  positions: Position[];
  summary: PortfolioSummary;
  projection: PortfolioProjection;
  horizon: number;
  real: boolean;
  now: Date;
  lastScrapeTime: string | null;
}): CsvRow[] {
  const money_ = real ? `today's money (deflated at ${INFLATION_PCT}% a year)` : "future euros";
  const end = projection.points[projection.points.length - 1];
  const warnings = disclaimerLines("projection");

  const rows: CsvRow[] = [
    ["PensionIQ portfolio export"],
    ["Generated", now.toISOString()],
    ["Fund data updated", lastScrapeTime ?? "demo data"],
    ["Figures in", money_],
    [],
    ...warnings.map((line) => [line]),
    [],
    ["SUMMARY"],
    ["Estimated value now (EUR)", money(summary.valueNow)],
    ["Paid in monthly - you (EUR)", money(summary.monthlyPersonal)],
    ["Paid in monthly - employer (EUR)", money(summary.monthlyEmployer)],
    [
      "Paid in monthly - total (EUR)",
      money(positions.reduce((sum, p) => sum + totalMonthly(p.holding), 0)),
    ],
    ["Blended annual management charge (%)", pct(summary.blendedAmc)],
    ["All charges over the next 12 months (EUR)", money(summary.yearlyChargesNow)],
    ["Blended risk rating (1-7)", pct(summary.blendedRisk)],
    [`Expected value in ${horizon} years (EUR)`, money(end.expected)],
    [`Cautious - optimistic in ${horizon} years (EUR)`, `${money(end.cautious)} - ${money(end.optimistic)}`],
    [],
    ["HOLDINGS"],
    [
      "Name",
      "Fund",
      "Provider",
      "Asset class",
      "Risk (1-7)",
      "Statement value (EUR)",
      "Statement date",
      "Estimated value now (EUR)",
      "You pay monthly (EUR)",
      "Employer pays monthly (EUR)",
      "Annual management charge (%)",
      "Charge source",
      "Contribution charge (%)",
      "Policy fee per year (EUR)",
      "Projected at (% a year, before charge)",
      "Projection basis",
      "After charge (% a year)",
      "Cautious (% a year)",
      "Optimistic (% a year)",
    ],
    ...positions.map(({ holding, fund, valueNow }) => {
      const c = chargesFor(holding, fund);
      const a = growthAssumption(fund, c.amcPct);
      return [
        holding.label ?? "",
        fund.name,
        fund.providerName,
        fund.assetClass,
        fund.riskRating,
        money(holding.startValue),
        holding.valueAsOf,
        money(valueNow),
        money(holding.monthlyContribution),
        money(holding.employerContribution),
        pct(c.amcPct),
        c.amcSource === "yours" ? "your statement" : c.amcSource === "fund" ? "fund's published charge" : "assumed (typical)",
        pct(c.contributionChargePct),
        money(c.policyFee),
        pct(a.averagePct),
        BASIS[a.basis],
        pct(a.expectedPct),
        pct(a.cautiousPct),
        pct(a.optimisticPct),
      ];
    }),
    [],
    [`PROJECTION - next ${horizon} years, ${money_}`],
    ["Year", "Years from now", "Cautious (EUR)", "Expected (EUR)", "Optimistic (EUR)", "Paid in, no growth (EUR)"],
    ...projection.points.map((p) => [
      p.year,
      p.offset,
      money(p.cautious),
      money(p.expected),
      money(p.optimistic),
      money(p.paidIn),
    ]),
    [],
    [`CHARGES - next ${horizon} years, expected case, ${money_}`],
    ["Management charges (EUR)", money(projection.charges.amc)],
    ["Contribution charges (EUR)", money(projection.charges.contribution)],
    ["Policy fees (EUR)", money(projection.charges.policy)],
    ["Total charges paid (EUR)", money(projection.charges.paid)],
    ["Growth lost on those charges (EUR)", money(projection.charges.lostGrowth)],
    ["Pot smaller than with no charges (EUR)", money(projection.charges.impact)],
    [],
    ["Holding", "Charges this year (EUR)", `Charges over ${horizon} years (EUR)`, "Pot smaller by (EUR)"],
    ...positions.map(({ holding, fund }, i) => {
      const h = projection.charges.perHolding[i];
      return [holding.label ?? fund.name, money(h.firstYear), money(h.paid), money(h.impact)];
    }),
    [],
    ["Each holding grows at its fund's average yearly return over 5 years (3 or 1 if younger), less its annual charge."],
    ["Contributions are assumed to stay as they are today. Estimated values move your statement value day by day with market indices matching each fund's investments (or its 1-year return where no prices exist), less charges."],
  ];
  return rows;
}
