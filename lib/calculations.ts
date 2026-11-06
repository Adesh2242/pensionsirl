import type { CalculatorInput, CalculatorResult, PlanYear } from "./types";
import { RETIREMENT, STATE_PENSION } from "./pension-guide";

/**
 * The retirement calculator: saving years, then drawing an income from the
 * pot to age 100. Yearly steps; money is tracked in future euros and the
 * page divides by each year's `deflator` for "today's money".
 *
 * Saving: contributions are a share of pay, which rises each year; the pot
 * grows at the saving-years rate less the annual charge, gliding towards the
 * retired rate over the last `lifestyleYears` (lifestyling).
 *
 * Retired: 25% may come out as a lump sum; the rest is drawn down like an
 * ARF. You set the income you want; each year the pot pays whatever the
 * State Pension and other income don't, then the rest grows.
 * From 60 Revenue taxes an ARF as if at least 4% a year were drawn (5% from
 * 70, 6% over €2m), so the model draws at least that. The State Pension
 * starts at 66, so retiring earlier leaves "bridge years" on the pot alone.
 */

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

export const LUMP_SUM_SHARE = 0.25;
export const LAST_AGE = 100;
/** The "what if returns are lower" check. */
export const CAUTIOUS_GAP_PCT = 2;

/** Tax on a retirement lump sum: nothing up to €200,000, 20% to €500,000, then your marginal rate. */
export function lumpSumTax(lumpSum: number, marginalRatePct: number): number {
  const band = Math.max(Math.min(lumpSum, RETIREMENT.standardRateBandTop) - RETIREMENT.taxFreeLumpSum, 0);
  const above = Math.max(lumpSum - RETIREMENT.standardRateBandTop, 0);
  return round2((band * RETIREMENT.standardRate) / 100 + (above * marginalRatePct) / 100);
}

/** The share of an ARF Revenue treats as drawn each year (imputed distribution), by age at the start of the year. */
export function arfMinimumPct(age: number, fundValue: number): number {
  if (age < 60) return 0;
  if (fundValue > 2_000_000) return 6;
  return age >= 70 ? 5 : 4;
}

/** The growth rate (before charges) in the year you turn `age`. */
function growthFor(input: CalculatorInput, age: number): number {
  const { retirementAge, preRetirementGrowthPct: pre, postRetirementGrowthPct: post, lifestyleYears } = input;
  if (age > retirementAge) return post;
  if (lifestyleYears <= 0) return pre;
  const yearsLeft = retirementAge - age; // 0 in the final year
  if (yearsLeft >= lifestyleYears) return pre;
  // Linear glide: the final saving year sits one step short of the retired rate.
  const progress = (lifestyleYears - yearsLeft) / (lifestyleYears + 1);
  return pre + (post - pre) * progress;
}

interface Drawdown {
  years: PlanYear[];
  runsOutAge: number | null;
  minimumFromAge: number | null;
}

/** Retired years from `startPot` at retirement, aiming for `yearlyToday` (today's euros) of income a year in all. */
function drawdown(input: CalculatorInput, startPot: number, yearlyToday: number, growthShiftPct = 0): Drawdown {
  const { currentAge, retirementAge, inflationPct, fundAmcPct } = input;
  const inflation = inflationPct / 100;
  const deflatorAt = (age: number) => Math.pow(1 + inflation, age - currentAge);
  const net = (input.postRetirementGrowthPct + growthShiftPct - fundAmcPct) / 100;
  const atRetirement = deflatorAt(retirementAge);

  const years: PlanYear[] = [];
  let pot = startPot;
  let runsOutAge: number | null = null;
  let minimumFromAge: number | null = null;
  for (let age = retirementAge; age < LAST_AGE; age++) {
    const deflator = deflatorAt(age);
    const wanted = yearlyToday * (input.incomeIndexed ? deflator : atRetirement);
    const statePension =
      input.includeStatePension && age >= STATE_PENSION.age ? input.statePensionWeekly * 52 * deflator : 0;
    const otherIncome = input.otherIncomeYearly * deflator;
    // The pot makes up the rest: all of it before the State Pension starts, less after.
    const planned = Math.max(wanted - statePension - otherIncome, 0);
    const minimum = (pot * arfMinimumPct(age, pot)) / 100;
    const minimumApplied = minimum > planned && pot > 0;
    if (minimumApplied && minimumFromAge === null) minimumFromAge = age;
    const withdrawal = Math.min(pot, Math.max(planned, minimum));
    const shortfall = planned > 0 && pot < planned - 0.5;
    if (shortfall && runsOutAge === null) runsOutAge = age;
    years.push({
      age,
      phase: "retired",
      potValue: round2(pot),
      contributions: 0,
      withdrawal: round2(withdrawal),
      statePension: round2(statePension),
      otherIncome: round2(otherIncome),
      minimumApplied,
      shortfall,
      deflator,
    });
    pot = Math.max(pot - withdrawal, 0) * (1 + net);
  }
  return { years, runsOutAge, minimumFromAge };
}

/** The largest yearly income (today's money, all sources) the plan can pay in full until `toAge`. */
function sustainableYearly(input: CalculatorInput, startPot: number, toAge: number): number {
  if (toAge <= input.retirementAge) return 0;
  const lasts = (w: number) => {
    const { runsOutAge } = drawdown(input, startPot, w);
    return runsOutAge === null || runsOutAge >= toAge;
  };
  let lo = 0;
  // Above this the pot can't even pay the first year: it fails for sure.
  let hi = Math.max(startPot, 0) + input.otherIncomeYearly + input.statePensionWeekly * 52 + 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (lasts(mid)) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo / 10) * 10;
}

export function yearlyIncome(input: Pick<CalculatorInput, "incomeAmount" | "incomePer">): number {
  return input.incomePer === "month" ? input.incomeAmount * 12 : input.incomeAmount;
}

export function calculateProjection(input: CalculatorInput): CalculatorResult {
  const {
    currentAge,
    retirementAge,
    currentSalary,
    currentPotValue,
    employeeContributionPct,
    employerContributionPct,
    salaryGrowthPct,
    fundAmcPct,
    marginalTaxRatePct,
    inflationPct,
  } = input;

  const yearsToRetirement = Math.max(retirementAge - currentAge, 0);
  const limitPct = ageRelatedLimitPct(currentAge);
  const relievableEarnings = Math.min(currentSalary, EARNINGS_CAP);
  const maxRelievableContribution = round2((relievableEarnings * limitPct) / 100);
  const annualEmployeeContribution = (currentSalary * employeeContributionPct) / 100;
  const relievableAmount = Math.min(annualEmployeeContribution, maxRelievableContribution);
  const annualTaxReliefSaved = round2((relievableAmount * marginalTaxRatePct) / 100);

  // ── Saving years ──
  const inflation = inflationPct / 100;
  let pot = currentPotValue;
  let grossPot = currentPotValue;
  let paidIn = currentPotValue;
  let salary = currentSalary;
  const years: PlanYear[] = [];
  for (let y = 0; y < yearsToRetirement; y++) {
    const age = currentAge + y;
    years.push({
      age,
      phase: "saving",
      potValue: round2(pot),
      contributions: round2(paidIn),
      withdrawal: 0,
      statePension: 0,
      otherIncome: 0,
      minimumApplied: false,
      shortfall: false,
      deflator: Math.pow(1 + inflation, y),
    });
    const contribution = (salary * (employeeContributionPct + employerContributionPct)) / 100;
    const growth = growthFor(input, age + 1) / 100;
    pot = pot * (1 + growth - fundAmcPct / 100) + contribution;
    grossPot = grossPot * (1 + growth) + contribution;
    paidIn += contribution;
    if (y < yearsToRetirement - 1) salary *= 1 + salaryGrowthPct / 100;
  }
  const projectedPot = round2(Math.max(pot, 0));

  // ── Retirement ──
  const lumpSum = input.takeLumpSum ? round2(projectedPot * LUMP_SUM_SHARE) : 0;
  const drawdownPot = round2(projectedPot - lumpSum);
  const yearly = yearlyIncome(input);
  const plan = drawdown(input, drawdownPot, yearly);
  const cautious = drawdown(input, cautiousPot(input, drawdownPot), yearly, -CAUTIOUS_GAP_PCT);
  // The retirement row shows the pot before the lump sum comes out.
  if (plan.years[0]) plan.years[0] = { ...plan.years[0], potValue: projectedPot, contributions: round2(paidIn) };

  const finalDeflator = Math.pow(1 + inflation, Math.max(yearsToRetirement - 1, 0));
  return {
    ageRelatedLimitPct: limitPct,
    earningsCap: EARNINGS_CAP,
    maxRelievableContribution,
    annualTaxReliefSaved,
    yearsToRetirement,
    projectedPot,
    totalContributions: round2(paidIn),
    totalFeesDrag: round2(Math.max(grossPot - projectedPot, 0)),
    lumpSum,
    lumpSumTax: lumpSumTax(lumpSum, marginalTaxRatePct),
    drawdownPot,
    statePensionAge: STATE_PENSION.age,
    bridgeYears: input.includeStatePension ? Math.max(STATE_PENSION.age - retirementAge, 0) : 0,
    runsOutAge: plan.runsOutAge,
    cautiousRunsOutAge: cautious.runsOutAge,
    sustainableYearly: sustainableYearly(input, drawdownPot, input.planToAge),
    minimumFromAge: plan.minimumFromAge,
    finalSalaryToday: round2((yearsToRetirement > 0 ? salary : currentSalary) / finalDeflator),
    years: [...years, ...plan.years],
  };
}

/**
 * The pot at retirement had returns been CAUTIOUS_GAP_PCT lower while
 * saving too, less the same share as a lump sum.
 */
function cautiousPot(input: CalculatorInput, drawdownPot: number): number {
  if (input.retirementAge <= input.currentAge) return drawdownPot;
  const lower = {
    ...input,
    preRetirementGrowthPct: input.preRetirementGrowthPct - CAUTIOUS_GAP_PCT,
    postRetirementGrowthPct: input.postRetirementGrowthPct - CAUTIOUS_GAP_PCT,
    // Only the saving years are needed here.
    retirementAge: input.retirementAge,
  };
  let pot = input.currentPotValue;
  let salary = input.currentSalary;
  const years = input.retirementAge - input.currentAge;
  for (let y = 0; y < years; y++) {
    const contribution = (salary * (input.employeeContributionPct + input.employerContributionPct)) / 100;
    pot = pot * (1 + (growthFor(lower, input.currentAge + y + 1) - input.fundAmcPct) / 100) + contribution;
    if (y < years - 1) salary *= 1 + input.salaryGrowthPct / 100;
  }
  return Math.max(pot, 0) * (input.takeLumpSum ? 1 - LUMP_SUM_SHARE : 1);
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
