import type { CsvRow } from "@/lib/csv";
import { money, pct } from "@/lib/csv";
import { disclaimerLines } from "@/lib/disclaimers";
import { yearlyWithdrawal } from "@/lib/calculations";
import type { CalculatorInput, CalculatorResult } from "@/lib/types";

const yesNo = (v: boolean) => (v ? "Yes" : "No");

/** The calculator's inputs, results and every year to 100 as a spreadsheet, in both future euros and today's money. */
export function calculatorCsvRows(input: CalculatorInput, result: CalculatorResult, now = new Date()): CsvRow[] {
  const retire = result.years.find((y) => y.age === input.retirementAge);
  const today = (v: number) => money(retire ? v / retire.deflator : v);
  return [
    ["PensionIQ retirement calculator export"],
    ["Generated", now.toISOString()],
    [],
    ...disclaimerLines("calculator").map((line) => [line]),
    [],
    ["YOUR INPUTS"],
    ["Current age", input.currentAge],
    ["Retirement age", input.retirementAge],
    ["Annual salary (EUR)", money(input.currentSalary)],
    ["Pension pot today (EUR)", money(input.currentPotValue)],
    ["Your contribution (% of pay)", pct(input.employeeContributionPct)],
    ["Employer contribution (% of pay)", pct(input.employerContributionPct)],
    ["Pay rises a year (%)", pct(input.salaryGrowthPct)],
    ["Marginal tax rate (%)", input.marginalTaxRatePct],
    ["Growth while saving, before charges (% a year)", pct(input.preRetirementGrowthPct)],
    ["Growth once retired, before charges (% a year)", pct(input.postRetirementGrowthPct)],
    ["Reduce risk over the last (years, 0 = off)", input.lifestyleYears],
    ["Annual charge (%)", pct(input.fundAmcPct)],
    ["Inflation (% a year)", pct(input.inflationPct)],
    ["Take 25% lump sum", yesNo(input.takeLumpSum)],
    [`Draw from pot (EUR a ${input.withdrawalPer}, today's money)`, money(input.withdrawalAmount)],
    ["Withdrawal rises with inflation", yesNo(input.withdrawalIndexed)],
    ["Include State Pension", yesNo(input.includeStatePension)],
    ["State Pension (EUR a week, today's money)", money(input.statePensionWeekly)],
    ["Cover the gap until the State Pension", yesNo(input.bridgeTopUp)],
    ["Other income (EUR a year, today's money)", money(input.otherIncomeYearly)],
    ["Make it last until age", input.planToAge],
    [],
    ["RESULTS", "Future euros", "Today's money"],
    [`Pot at ${input.retirementAge} (EUR)`, money(result.projectedPot), today(result.projectedPot)],
    ["Lump sum (EUR)", money(result.lumpSum), today(result.lumpSum)],
    ["Tax on lump sum (EUR)", money(result.lumpSumTax), today(result.lumpSumTax)],
    ["Left invested to draw from (EUR)", money(result.drawdownPot), today(result.drawdownPot)],
    ["Paid in by retirement, incl. today's pot (EUR)", money(result.totalContributions)],
    ["Charges by retirement (EUR)", money(result.totalFeesDrag)],
    ["Planned withdrawal (EUR a year, today's money)", "", money(yearlyWithdrawal(input))],
    ["Pot runs out at age", result.runsOutAge ?? "Lasts beyond 100"],
    [`If returns were 2% a year lower, runs out at age`, result.cautiousRunsOutAge ?? "Lasts beyond 100"],
    [`Most you can draw to last until ${input.planToAge} (EUR a year)`, "", money(result.sustainableYearly)],
    ["Years before the State Pension on the pot alone", result.bridgeYears],
    ["Revenue's ARF minimum exceeds the plan from age", result.minimumFromAge ?? "Never"],
    ["Final pay (EUR a year)", "", money(result.finalSalaryToday)],
    ["Tax relief saved this year (EUR)", money(result.annualTaxReliefSaved)],
    ["Age-related relief limit (% of earnings)", result.ageRelatedLimitPct],
    ["Max relievable contribution (EUR)", money(result.maxRelievableContribution)],
    [],
    ["YEAR BY YEAR (future euros; divide by the deflator for today's money)"],
    ["Age", "Phase", "Pot (EUR)", "Paid in to date (EUR)", "Drawn (EUR)", "State Pension (EUR)", "Other income (EUR)", "ARF minimum applied", "Shortfall", "Deflator"],
    ...result.years.map((y) => [
      y.age,
      y.phase,
      money(y.potValue),
      y.phase === "saving" ? money(y.contributions) : "",
      money(y.withdrawal),
      money(y.statePension),
      money(y.otherIncome),
      yesNo(y.minimumApplied),
      yesNo(y.shortfall),
      y.deflator.toFixed(4),
    ]),
  ];
}
