import type { CalculatorInput, CalculatorResult } from "./types";

/** Revenue.ie age-related percentage limits on net relevant earnings that qualify for pension tax relief. */
export function ageRelatedLimitPct(age: number): number {
  if (age < 30) return 15;
  if (age < 40) return 20;
  if (age < 50) return 25;
  if (age < 55) return 30;
  if (age < 60) return 35;
  return 40;
}

/** Annual earnings cap for pension tax relief purposes, per Revenue.ie. */
export const EARNINGS_CAP = 115_000;

export function calculateProjection(input: CalculatorInput): CalculatorResult {
  const {
    currentAge,
    retirementAge,
    currentSalary,
    currentPotValue,
    employeeContributionPct,
    employerContributionPct,
    assumedGrowthRatePct,
    fundAmcPct,
    marginalTaxRatePct,
  } = input;

  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const limitPct = ageRelatedLimitPct(currentAge);
  const relievableEarnings = Math.min(currentSalary, EARNINGS_CAP);
  const maxRelievableContribution = round2((relievableEarnings * limitPct) / 100);

  const annualEmployeeContribution = (currentSalary * employeeContributionPct) / 100;
  const relievableAmount = Math.min(annualEmployeeContribution, maxRelievableContribution);
  const annualTaxReliefSaved = round2((relievableAmount * marginalTaxRatePct) / 100);

  const annualEmployerContribution = (currentSalary * employerContributionPct) / 100;
  const totalAnnualContribution = annualEmployeeContribution + annualEmployerContribution;

  const netGrowthRate = (assumedGrowthRatePct - fundAmcPct) / 100;

  let potValue = currentPotValue;
  let totalContributions = currentPotValue;
  let grossPotValue = currentPotValue;
  const yearlyProjection: CalculatorResult["yearlyProjection"] = [
    { age: currentAge, potValue: round2(potValue), contributions: round2(totalContributions) },
  ];

  for (let year = 1; year <= yearsToRetirement; year++) {
    potValue = potValue * (1 + netGrowthRate) + totalAnnualContribution;
    grossPotValue = grossPotValue * (1 + assumedGrowthRatePct / 100) + totalAnnualContribution;
    totalContributions += totalAnnualContribution;
    yearlyProjection.push({
      age: currentAge + year,
      potValue: round2(Math.max(potValue, 0)),
      contributions: round2(totalContributions),
    });
  }

  const projectedPot = round2(Math.max(potValue, 0));
  const totalFeesDrag = round2(Math.max(grossPotValue - projectedPot, 0));

  return {
    ageRelatedLimitPct: limitPct,
    earningsCap: EARNINGS_CAP,
    maxRelievableContribution,
    annualTaxReliefSaved,
    yearsToRetirement,
    projectedPot,
    totalContributions: round2(totalContributions),
    totalFeesDrag,
    yearlyProjection,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
