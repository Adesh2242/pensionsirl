import type { CsvRow } from "@/lib/csv";
import { money, pct } from "@/lib/csv";
import { disclaimerLines } from "@/lib/disclaimers";
import type { CalculatorInput, CalculatorResult } from "@/lib/types";

/** The calculator's inputs, results and year-by-year projection as a spreadsheet. */
export function calculatorCsvRows(input: CalculatorInput, result: CalculatorResult, now = new Date()): CsvRow[] {
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
    ["Current pension pot (EUR)", money(input.currentPotValue)],
    ["Your contribution (% of salary)", pct(input.employeeContributionPct)],
    ["Employer contribution (% of salary)", pct(input.employerContributionPct)],
    ["Assumed annual growth (%)", pct(input.assumedGrowthRatePct)],
    ["Fund annual charge (%)", pct(input.fundAmcPct)],
    ["Marginal tax rate (%)", input.marginalTaxRatePct],
    [],
    ["RESULTS"],
    [`Projected pot at ${input.retirementAge} (EUR)`, money(result.projectedPot)],
    ["Years to retirement", result.yearsToRetirement],
    ["Total contributions to retirement (EUR)", money(result.totalContributions)],
    ["Growth after charges (EUR)", money(Math.max(result.projectedPot - result.totalContributions, 0))],
    ["Charges paid over time (EUR)", money(result.totalFeesDrag)],
    ["Tax relief saved this year (EUR)", money(result.annualTaxReliefSaved)],
    ["Age-related relief limit (% of earnings)", result.ageRelatedLimitPct],
    ["Earnings cap for relief (EUR)", money(result.earningsCap)],
    ["Max relievable contribution (EUR)", money(result.maxRelievableContribution)],
    [],
    ["YEAR BY YEAR"],
    ["Age", "Pot value (EUR)", "Contributions to date (EUR)"],
    ...result.yearlyProjection.map((y) => [y.age, money(y.potValue), money(y.contributions)]),
  ];
}
