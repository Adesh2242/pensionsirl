import type { CalculatorInput, CalculatorResult } from "@/lib/types";
import { lineChart } from "@/lib/pdf/charts";
import { COLOR, Report, euro, percent } from "@/lib/pdf/layout";

/** The retirement calculator as a PDF: headline, inputs, chart, tax relief and the year-by-year table. */
export function buildCalculatorReport(input: CalculatorInput, result: CalculatorResult, now = new Date()): Report {
  const report = new Report({ title: "Retirement projection", subtitle: "Retirement calculator", generated: now });
  const growth = Math.max(result.projectedPot - result.totalContributions, 0);

  report.paragraph(
    `A projection from age ${input.currentAge} to ${input.retirementAge} at an assumed ${percent(input.assumedGrowthRatePct)} a year, less a ${input.fundAmcPct.toFixed(2)}% annual charge, using Revenue's age-related relief limits and the ${euro(result.earningsCap)} earnings cap. Figures are in future euros.`,
    { size: 8.5, gap: 5 },
  );
  report.stats([
    {
      label: `Projected pot at ${input.retirementAge}`,
      value: euro(result.projectedPot),
      detail: `${result.yearsToRetirement} years of contributions and growth`,
    },
    {
      label: "Tax relief saved this year",
      value: euro(result.annualTaxReliefSaved),
      detail: `at your ${input.marginalTaxRatePct}% marginal rate`,
      tone: COLOR.green,
    },
    {
      label: "Charges paid over time",
      value: euro(result.totalFeesDrag),
      detail: `${input.fundAmcPct.toFixed(2)}% a year, compounded`,
      tone: COLOR.orange,
    },
  ]);

  report.section("Your inputs");
  report.table(
    ["", "", "", ""],
    [
      ["Current age", String(input.currentAge), "Your contribution", `${input.employeeContributionPct}% of salary`],
      ["Retirement age", String(input.retirementAge), "Employer contribution", `${input.employerContributionPct}% of salary`],
      ["Annual salary", euro(input.currentSalary), "Assumed growth", `${percent(input.assumedGrowthRatePct)} a year`],
      ["Current pension pot", euro(input.currentPotValue), "Fund annual charge", `${input.fundAmcPct.toFixed(2)}%`],
      ["", "", "Marginal tax rate", `${input.marginalTaxRatePct}%`],
    ],
    {
      showHead: "never",
      columnStyles: {
        0: { textColor: COLOR.muted },
        1: { fontStyle: "bold", halign: "right" },
        2: { textColor: COLOR.muted },
        3: { fontStyle: "bold", halign: "right" },
      },
    },
  );

  report.section("Pot growth vs contributions");
  const ages = result.yearlyProjection.map((y) => y.age);
  lineChart(report, {
    labels: ages,
    areas: [
      { to: result.yearlyProjection.map((y) => y.potValue), color: COLOR.tealSoft },
      { to: result.yearlyProjection.map((y) => Math.min(y.contributions, y.potValue)), color: [208, 215, 224] },
    ],
    lines: [
      { values: result.yearlyProjection.map((y) => y.potValue), color: COLOR.teal, width: 0.9 },
      { values: result.yearlyProjection.map((y) => y.contributions), color: COLOR.slate, width: 0.5, dashed: true },
    ],
    legend: [
      { label: "Pot value", color: COLOR.teal, kind: "line" },
      { label: "Growth", color: COLOR.tealSoft, kind: "area" },
      { label: "Paid in (incl. starting pot)", color: COLOR.slate, kind: "dashed" },
    ],
    endLabel: euro(result.projectedPot),
    height: 80,
  });
  const share = result.projectedPot > 0 ? (growth / result.projectedPot) * 100 : 0;
  report.paragraph(
    `Of the projected ${euro(result.projectedPot)}, ${euro(result.totalContributions)} is money paid in (including today's pot) and ${euro(growth)} - ${share.toFixed(0)}% - is compound growth after charges.`,
    { size: 9, c: COLOR.ink, gap: 5 },
  );

  report.section("Tax relief");
  report.table(
    ["", ""],
    [
      [`Age-related relief limit (age ${input.currentAge})`, `${result.ageRelatedLimitPct}% of earnings`],
      ["Earnings cap for relief", euro(result.earningsCap)],
      ["Max relievable personal contribution", `${euro(result.maxRelievableContribution)} a year`],
      ["Tax relief saved this year", euro(result.annualTaxReliefSaved)],
      ["Total contributions to retirement", euro(result.totalContributions)],
    ],
    { showHead: "never", columnStyles: { 0: { textColor: COLOR.muted }, 1: { fontStyle: "bold", halign: "right" } } },
  );
  report.paragraph(
    "Relief limits rise with age - 15% under 30 up to 40% at 60+ - and apply to earnings up to the cap. Employer contributions don't count against your personal limit.",
    { size: 8 },
  );

  report.section("Year by year");
  report.table(
    ["Age", "Pot value", "Paid in to date", "Growth to date"],
    result.yearlyProjection.map((y) => [
      String(y.age),
      euro(y.potValue),
      euro(y.contributions),
      euro(Math.max(y.potValue - y.contributions, 0)),
    ]),
    {
      styles: { fontSize: 7.2, cellPadding: { top: 1.05, bottom: 1.05, left: 1.5, right: 1.5 } },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" }, 3: { halign: "right" } },
    },
  );

  report.disclaimer("calculator", [
    "Assumes a steady growth rate and salary, and contributions unchanged until retirement. Real returns vary year to year and can be negative.",
  ]);
  return report;
}

export function downloadCalculatorReport(input: CalculatorInput, result: CalculatorResult) {
  const now = new Date();
  buildCalculatorReport(input, result, now).save(`pensioniq-retirement-projection-${now.toISOString().slice(0, 10)}.pdf`);
}
