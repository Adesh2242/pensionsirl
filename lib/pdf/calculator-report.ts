import type { CalculatorInput, CalculatorResult, PlanYear } from "@/lib/types";
import { CAUTIOUS_GAP_PCT, yearlyWithdrawal } from "@/lib/calculations";
import { STATE_PENSION } from "@/lib/pension-guide";
import { lineChart } from "@/lib/pdf/charts";
import { COLOR, Report, euro, percent } from "@/lib/pdf/layout";

/**
 * The retirement calculator as a PDF: headline figures, what to know, the
 * inputs, the pot from now to 100, income in retirement by phase and where
 * it comes from, tax relief, and every year to 100.
 */
export function buildCalculatorReport(
  input: CalculatorInput,
  result: CalculatorResult,
  { todaysMoney = true, now = new Date() }: { todaysMoney?: boolean; now?: Date } = {},
): Report {
  const report = new Report({ title: "Retirement plan", subtitle: "Retirement calculator", generated: now });
  const m = (v: number, y: Pick<PlanYear, "deflator">) => (todaysMoney ? v / y.deflator : v);
  const retire = result.years.find((y) => y.age === input.retirementAge) ?? { deflator: 1 };
  const moneyNote = todaysMoney ? "in today's money" : "in future euros";
  const yearly = yearlyWithdrawal(input);
  const spAge = STATE_PENSION.age;

  report.paragraph(
    `From age ${input.currentAge}, retiring at ${input.retirementAge} and drawing ${euro(yearly)} a year from the pot (today's money${
      input.withdrawalIndexed ? ", rising with inflation" : ""
    }). Growth ${percent(input.preRetirementGrowthPct)} a year while saving and ${percent(input.postRetirementGrowthPct)} once retired, before a ${input.fundAmcPct.toFixed(2)}% charge; inflation ${percent(input.inflationPct)}. Amounts ${moneyNote}, before income tax and USC.`,
    { size: 8.5, gap: 5 },
  );
  report.stats([
    { label: `Pot at ${input.retirementAge}`, value: euro(m(result.projectedPot, retire)), detail: moneyNote },
    {
      label: "Lump sum",
      value: input.takeLumpSum ? euro(m(result.lumpSum, retire)) : "Not taken",
      detail: input.takeLumpSum ? (result.lumpSumTax > 0 ? `${euro(m(result.lumpSumTax, retire))} tax` : "tax-free") : undefined,
      tone: COLOR.slate,
    },
    {
      label: "Pot lasts",
      value: result.runsOutAge === null ? "Beyond 100" : `Until ${result.runsOutAge}`,
      detail: `drawing ${euro(yearly)} a year`,
      tone: result.runsOutAge === null || result.runsOutAge >= input.planToAge ? COLOR.green : COLOR.orange,
    },
    {
      label: `To last until ${input.planToAge}`,
      value: euro(result.sustainableYearly),
      detail: "a year at most, today's money",
      tone: COLOR.teal,
    },
  ]);

  // ── What to know ──
  const notes: string[] = [];
  if (input.retirementAge < 60)
    notes.push(
      `Check you can draw your pension at ${input.retirementAge}: workplace pensions usually from 50 once you've left that employer; PRSAs and personal pensions generally from 60.`,
    );
  if (input.includeStatePension && input.retirementAge < spAge)
    notes.push(
      `No State Pension until ${spAge}: ${spAge - input.retirementAge} years on the pot alone${
        input.bridgeTopUp ? `, drawing an extra ${euro(input.statePensionWeekly * 52)} a year until then to keep income level` : ""
      }.`,
    );
  notes.push(
    result.runsOutAge !== null && result.runsOutAge < input.planToAge
      ? `At ${euro(yearly)} a year the pot runs out at ${result.runsOutAge}. To last until ${input.planToAge}, draw about ${euro(result.sustainableYearly)} a year.`
      : `The plan lasts ${result.runsOutAge === null ? "past 100" : `until ${result.runsOutAge}`}; up to ${euro(result.sustainableYearly)} a year would last until ${input.planToAge}.`,
  );
  if (result.cautiousRunsOutAge !== null && result.cautiousRunsOutAge !== result.runsOutAge)
    notes.push(`If returns were ${CAUTIOUS_GAP_PCT}% a year lower, the pot would run out at ${result.cautiousRunsOutAge}.`);
  if (result.minimumFromAge !== null)
    notes.push(
      `From ${result.minimumFromAge}, Revenue's ARF minimum (4% a year from 60, 5% from 70, 6% over EUR 2m) is more than planned, so that much is drawn.`,
    );
  report.section("What to know");
  for (const n of notes) report.paragraph(`- ${n}`, { size: 8.8, c: COLOR.ink });

  report.section("Your inputs");
  report.table(
    ["", "", "", ""],
    [
      ["Current age", String(input.currentAge), "You pay in", `${input.employeeContributionPct}% of pay`],
      ["Retire at", String(input.retirementAge), "Employer pays in", `${input.employerContributionPct}% of pay`],
      ["Annual salary", euro(input.currentSalary), "Pay rises", `${percent(input.salaryGrowthPct)} a year`],
      ["Pension pot today", euro(input.currentPotValue), "Tax rate", `${input.marginalTaxRatePct}%`],
      ["Growth while saving", `${percent(input.preRetirementGrowthPct)} a year`, "Growth once retired", `${percent(input.postRetirementGrowthPct)} a year`],
      ["Reduce risk over", input.lifestyleYears ? `last ${input.lifestyleYears} years` : "off", "Annual charge", `${input.fundAmcPct.toFixed(2)}%`],
      ["Draw from pot", `${euro(input.withdrawalAmount)} a ${input.withdrawalPer}`, "Rises with inflation", input.withdrawalIndexed ? "yes" : "no"],
      ["25% lump sum", input.takeLumpSum ? "yes" : "no", "State Pension", input.includeStatePension ? `${euro(input.statePensionWeekly)} a week from ${spAge}` : "not included"],
      ["Other income", `${euro(input.otherIncomeYearly)} a year`, "Inflation", `${percent(input.inflationPct)} a year`],
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

  report.ensure(110); // keep the heading with its chart
  report.section(`Your pot, age ${input.currentAge} to 100`, moneyNote);
  const ages = result.years.map((y) => y.age);
  const pots = result.years.map((y) => m(y.potValue, y));
  lineChart(report, {
    labels: ages,
    areas: [{ to: pots, color: COLOR.tealSoft }],
    lines: [
      { values: pots, color: COLOR.teal, width: 0.9 },
      {
        // Saving years only: a shorter series stops the line at retirement.
        values: result.years
          .filter((y) => y.phase === "saving" || y.age === input.retirementAge)
          .map((y) => m(y.contributions, y)),
        color: COLOR.slate,
        width: 0.5,
        dashed: true,
      },
    ],
    legend: [
      { label: "Pot", color: COLOR.teal, kind: "line" },
      { label: "Paid in while saving", color: COLOR.slate, kind: "dashed" },
    ],
    height: 76,
  });

  const retired = result.years.filter((y) => y.phase === "retired");
  if (retired.length) {
    report.ensure(100);
    report.section("Your income in retirement", `${moneyNote}, before tax`);
    const fromPot = retired.map((y) => m(y.withdrawal, y));
    const withSp = retired.map((y, i) => fromPot[i] + m(y.statePension, y));
    const total = retired.map((y, i) => withSp[i] + m(y.otherIncome, y));
    lineChart(report, {
      labels: retired.map((y) => y.age),
      areas: [
        { to: fromPot, color: COLOR.tealSoft },
        { from: fromPot, to: withSp, color: [250, 232, 170] },
        ...(input.otherIncomeYearly > 0 ? [{ from: withSp, to: total, color: [208, 215, 224] as [number, number, number] }] : []),
      ],
      lines: [{ values: total, color: COLOR.ink, width: 0.6 }],
      legend: [
        { label: "From your pot", color: COLOR.tealSoft, kind: "area" },
        { label: "State Pension", color: [250, 232, 170], kind: "area" },
        ...(input.otherIncomeYearly > 0 ? [{ label: "Other income", color: [208, 215, 224] as [number, number, number], kind: "area" as const }] : []),
        { label: "Total", color: COLOR.ink, kind: "line" },
      ],
      height: 64,
    });
  }

  report.section("Tax relief now");
  report.table(
    ["", ""],
    [
      [`Age-related relief limit (age ${input.currentAge})`, `${result.ageRelatedLimitPct}% of earnings`],
      ["Most you can pay in with relief", `${euro(result.maxRelievableContribution)} a year`],
      ["Tax relief saved this year", euro(result.annualTaxReliefSaved)],
      ["Charges paid by retirement", euro(result.totalFeesDrag)],
    ],
    { showHead: "never", columnStyles: { 0: { textColor: COLOR.muted }, 1: { fontStyle: "bold", halign: "right" } } },
  );

  report.section("Year by year", moneyNote);
  report.table(
    ["Age", "Pot", "Drawn", "State Pension", "Total income"],
    result.years.map((y) => [
      `${y.age}${y.age === input.retirementAge ? " retire" : ""}`,
      euro(m(y.potValue, y)),
      y.phase === "retired" ? `${euro(m(y.withdrawal, y))}${y.minimumApplied ? "*" : ""}` : "-",
      y.statePension ? euro(m(y.statePension, y)) : "-",
      y.phase === "retired" ? euro(m(y.withdrawal + y.statePension + y.otherIncome, y)) : "-",
    ]),
    {
      styles: { fontSize: 7, cellPadding: { top: 0.9, bottom: 0.9, left: 1.5, right: 1.5 } },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    },
  );

  report.disclaimer("calculator", [
    "Assumes steady growth, pay rises and inflation. Real returns vary year to year and can be negative; a poor run early in retirement matters most.",
    "Income is before income tax and USC. ARF withdrawals and the State Pension are taxable income.",
    ...(result.minimumFromAge !== null ? ["* Revenue's ARF minimum (imputed distribution) applies."] : []),
  ]);
  return report;
}

export function downloadCalculatorReport(input: CalculatorInput, result: CalculatorResult, options: { todaysMoney?: boolean } = {}) {
  const now = new Date();
  buildCalculatorReport(input, result, { ...options, now }).save(`pensioniq-retirement-plan-${now.toISOString().slice(0, 10)}.pdf`);
}
