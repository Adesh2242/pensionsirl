import type { Fund, TrackedFund } from "@/lib/types";
import {
  INFLATION_PCT,
  RISK_SPREAD_PER_POINT,
  chargesFor,
  growthAssumption,
  totalMonthly,
  type PortfolioProjection,
  type PortfolioSummary,
} from "@/lib/portfolio/projection";
import { barList, lineChart, shareBar } from "@/lib/pdf/charts";
import { ASSET_COLORS, COLOR, Report, euro, longDate, percent } from "@/lib/pdf/layout";

type Position = { holding: TrackedFund; fund: Fund; valueNow: number };

export interface PortfolioReportInput {
  positions: Position[];
  summary: PortfolioSummary;
  projection: PortfolioProjection;
  horizon: number;
  real: boolean;
  now: Date;
  lastScrapeTime: string | null;
  /** Printed as "Prepared for …" when given. */
  name?: string | null;
}

const BASIS_SHORT: Record<string, string> = {
  "5yr": "5-yr avg",
  "3yr": "3-yr avg*",
  "1yr": "1-yr*",
  none: "no history",
};

/**
 * The portfolio page as a professional PDF: headline figures, the
 * projection chart, holdings and mix, what charges cost, how each fund is
 * projected, the year-by-year table, method and warnings.
 */
export function buildPortfolioReport(input: PortfolioReportInput): Report {
  const { positions, summary, projection, horizon, real, now, lastScrapeTime, name } = input;
  const end = projection.points[projection.points.length - 1];
  const moneyNote = real ? `in today's money (${INFLATION_PCT}% inflation)` : "in future euros";
  const holdings = positions.length;

  const report = new Report({
    title: "Portfolio report",
    subtitle: name ? `Prepared for ${name}` : "Your pension portfolio",
    generated: now,
  });

  report.paragraph(
    `${holdings} ${holdings === 1 ? "holding" : "holdings"} · ${horizon}-year projection ${moneyNote} · fund data ${
      lastScrapeTime ? `updated ${longDate(lastScrapeTime)}` : "from the demo dataset"
    }. Values are estimates grown from your statement figures; they are not statements.`,
    { size: 8.5, gap: 5 },
  );

  // Value-weighted growth after charges, as the page shows it.
  const weights = positions.map((p) => (summary.valueNow > 0 ? p.valueNow : 1));
  const weightTotal = weights.reduce((s, w) => s + w, 0) || 1;
  const blendedGrowth =
    positions.reduce((s, p, i) => s + growthAssumption(p.fund, chargesFor(p.holding, p.fund).amcPct).expectedPct * weights[i], 0) /
    weightTotal;
  const monthly = summary.monthlyPersonal + summary.monthlyEmployer;

  report.stats([
    { label: "Estimated value now", value: euro(summary.valueNow), detail: "from your statements, kept current" },
    {
      label: "Going in monthly",
      value: euro(monthly),
      detail: `you ${euro(summary.monthlyPersonal)} · employer ${euro(summary.monthlyEmployer)}`,
      tone: COLOR.slate,
    },
    {
      label: "Charges per year",
      value: euro(summary.yearlyChargesNow),
      detail: `${summary.blendedAmc.toFixed(2)}% blended${summary.amcAssumed ? ", partly assumed" : ""}`,
      tone: COLOR.orange,
    },
    {
      label: `Expected by ${end.year}`,
      value: euro(end.expected),
      detail: `range ${euro(end.cautious)} – ${euro(end.optimistic)}`,
      tone: COLOR.tealDark,
    },
  ]);

  // ── Projection ──
  report.section(`The next ${horizon} years`, moneyNote);
  lineChart(report, {
    labels: projection.points.map((p) => p.year),
    areas: [
      {
        from: projection.points.map((p) => p.cautious),
        to: projection.points.map((p) => p.optimistic),
        color: COLOR.tealSoft,
      },
    ],
    lines: [
      { values: projection.points.map((p) => p.expected), color: COLOR.teal, width: 0.9 },
      { values: projection.points.map((p) => p.paidIn), color: COLOR.slate, dashed: true, width: 0.5 },
    ],
    legend: [
      { label: "Expected", color: COLOR.teal, kind: "line" },
      { label: "Cautious to optimistic", color: COLOR.tealSoft, kind: "area" },
      { label: "Paid in, no growth", color: COLOR.slate, kind: "dashed" },
    ],
    endLabel: euro(end.expected),
    height: 78,
  });
  report.paragraph(
    `By ${end.year}, growing at your funds' 5-year average returns after charges (${percent(blendedGrowth, 1, true)} a year, weighted by what's in each), the portfolio could be worth about ${euro(end.expected)} - somewhere between ${euro(end.cautious)} and ${euro(end.optimistic)}.`,
    { size: 9, c: COLOR.ink, gap: 5 },
  );
  report.stats([
    {
      label: "You'll pay in",
      value: euro(projection.contributionsOverPeriod),
      detail: `${euro(monthly)} a month for ${horizon} years${real ? " (not inflation-adjusted)" : ""}`,
      tone: COLOR.slate,
    },
    {
      label: "Growth does the rest",
      value: euro(Math.max(end.expected - end.paidIn, 0)),
      detail: "expected, above everything paid in",
      tone: COLOR.green,
    },
    {
      label: "Charges will cost",
      value: euro(projection.charges.impact),
      detail: "pot smaller than with no charges",
      tone: COLOR.orange,
    },
  ]);

  // ── Holdings ──
  report.section("Holdings", `${holdings} in total`);
  report.table(
    ["Holding", "Provider", "Statement", "Value now", "Monthly in", "Annual charge", "Risk"],
    positions.map(({ holding, fund, valueNow }) => {
      const c = chargesFor(holding, fund);
      return [
        holding.label ? `${holding.label}\n${fund.name}` : fund.name,
        fund.providerName,
        `${euro(holding.startValue)}\n${longDate(holding.valueAsOf)}`,
        euro(valueNow),
        euro(totalMonthly(holding)),
        `${c.amcPct.toFixed(2)}%${c.amcSource === "assumed" ? " (assumed)" : ""}`,
        `${fund.riskRating}/7`,
      ];
    }),
    {
      columnStyles: {
        0: { cellWidth: 50 },
        3: { halign: "right", fontStyle: "bold" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right" },
      },
    },
  );
  if (summary.allocation.length > 0) {
    report.ensure(30);
    report.font(8, "bold", COLOR.muted);
    report.doc.text("ASSET MIX (BY VALUE)", 16, report.y);
    report.y += 5;
    shareBar(
      report,
      summary.allocation.map((a) => ({ label: a.assetClass, share: a.share, color: ASSET_COLORS[a.assetClass] ?? COLOR.faint })),
    );
    report.paragraph(`Blended risk rating ${summary.blendedRisk.toFixed(1)} out of 7, weighted by value.`, { size: 8 });
  }

  // ── Charges ──
  const ch = projection.charges;
  report.section(`What charges cost over ${horizon} years`, `expected case, ${moneyNote}`);
  report.stats([
    { label: "Charges paid", value: euro(ch.paid), detail: `starting at ${euro(ch.firstYear)} this year`, tone: COLOR.orange },
    { label: "Growth lost on them", value: euro(ch.lostGrowth), detail: "what they would have earned", tone: COLOR.orange },
    { label: "Pot smaller by", value: euro(ch.impact), detail: "versus no charges at all", tone: COLOR.orange },
  ]);
  barList(report, [
    { label: "Management charges", value: ch.amc, display: euro(ch.amc), color: COLOR.orange },
    { label: "Contribution charges", value: ch.contribution, display: euro(ch.contribution), color: COLOR.sun },
    { label: "Policy fees", value: ch.policy, display: euro(ch.policy), color: COLOR.slate },
    { label: "Growth lost", value: ch.lostGrowth, display: euro(ch.lostGrowth), color: [240, 170, 140] },
  ]);
  report.table(
    ["Holding", "Annual charge", "On contributions", "Policy fee / yr", "This year", `Over ${horizon} yrs`, "Pot smaller by"],
    positions.map(({ holding, fund }, i) => {
      const c = chargesFor(holding, fund);
      const h = ch.perHolding[i];
      return [
        holding.label ?? fund.name,
        `${c.amcPct.toFixed(2)}%${c.amcSource === "assumed" ? "*" : ""}`,
        `${c.contributionChargePct}%`,
        euro(c.policyFee),
        euro(h.firstYear),
        euro(h.paid),
        euro(h.impact),
      ];
    }),
    { columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right", textColor: COLOR.orange } } },
  );
  if (summary.amcAssumed) {
    report.paragraph(
      "* No charge was entered for this holding and the fund data doesn't publish one, so a typical 1.00% a year is assumed. Add the real charge from your statement on the portfolio page.",
      { size: 7.5 },
    );
  }

  // ── Growth assumptions ──
  report.section("How each fund is projected", lastScrapeTime ? `returns as of ${longDate(lastScrapeTime)}` : undefined);
  report.table(
    ["Fund", "Basis", "Average / yr", "After charge", "Cautious – optimistic"],
    positions.map(({ holding, fund }) => {
      const a = growthAssumption(fund, chargesFor(holding, fund).amcPct);
      return [
        holding.label ? `${holding.label} - ${fund.name}` : fund.name,
        BASIS_SHORT[a.basis],
        a.basis === "none" ? "-" : percent(a.averagePct, 1, true),
        percent(a.expectedPct, 1, true),
        `${percent(a.cautiousPct)} to ${percent(a.optimisticPct)}`,
      ];
    }),
    { columnStyles: { 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold" }, 4: { halign: "right" } } },
  );
  if (positions.some((p) => growthAssumption(p.fund, 0).basis !== "5yr")) {
    report.paragraph("* Fund is under 5 years old, so its longest available history is used.", { size: 7.5 });
  }

  // ── Year by year ──
  report.section("Year by year", moneyNote);
  report.table(
    ["Year", "Cautious", "Expected", "Optimistic", "Paid in (no growth)"],
    projection.points.map((p) => [String(p.year), euro(p.cautious), euro(p.expected), euro(p.optimistic), euro(p.paidIn)]),
    {
      styles: { fontSize: 7.2, cellPadding: { top: 1.05, bottom: 1.05, left: 1.5, right: 1.5 } },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right", fontStyle: "bold" }, 3: { halign: "right" }, 4: { halign: "right" } },
    },
  );

  // ── Method + warnings, kept together on one page ──
  report.ensure(100);
  report.section("How these figures are worked out");
  for (const line of [
    "Value now: each holding's statement value, moved day by day since the statement date with market indices matching the fund's investments (or its 1-year return where no prices exist), plus your contributions, less charges. An estimate, not the fund's unit price.",
    "Projection: each fund grows at its average yearly return over the last 5 years (3 or 1 if younger), less its annual charge. Contribution charges and policy fees are taken as they fall due.",
    `Range: ±${RISK_SPREAD_PER_POINT}% a year for each point of the fund's 1-7 risk rating - wider for equity, narrow for cash.`,
    `Contributions stay as they are today. "Today's money" deflates by ${INFLATION_PCT}% a year inflation.`,
  ]) {
    report.paragraph(`- ${line}`, { size: 8.5 });
  }
  report.y += 2;
  report.disclaimer("projection");
  return report;
}

export function downloadPortfolioReport(input: PortfolioReportInput) {
  buildPortfolioReport(input).save(`pensioniq-portfolio-report-${input.now.toISOString().slice(0, 10)}.pdf`);
}
