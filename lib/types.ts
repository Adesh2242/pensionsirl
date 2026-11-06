export type AssetClass =
  | "Multi-Asset"
  | "Equity"
  | "Bond"
  | "Cash"
  | "Property"
  | "Lifecycle"
  | "Alternative";

export type SfdrArticle = 6 | 8 | 9;

export interface Provider {
  slug: string;
  name: string;
  /** Total number of funds the provider actually offers, per public fund-centre listings (research-sourced, not the curated sample below). */
  realFundCount: number;
}

export interface Fund {
  id: string;
  slug: string;
  providerSlug: string;
  providerName: string;
  name: string;
  assetClass: AssetClass;
  /** Industry-standard 1 (lowest) to 7 (highest) SRI risk rating. */
  riskRating: number;
  /**
   * Annual management charge, percent. Optional because the live scrape
   * source (National Pension Helpline) doesn't publish AMC — only the
   * curated mock dataset has it. Real scraped funds will show "—" in the UI.
   */
  amc?: number;
  subcategory?: string;
  sfdrArticle?: SfdrArticle;
  manager?: string;
  description: string;
  /**
   * Returns as average yearly percentages. The live source publishes 3/5/10
   * years as cumulative totals; lib/data/fund-repo.ts converts them
   * on read, so every figure here is "per year". A period listed in
   * `missingReturns` has no history (the fund is younger than that) and its
   * number here is a placeholder 0 — check with hasReturn() before using it.
   */
  oneYearReturn: number;
  threeYearReturn: number;
  fiveYearReturn: number;
  tenYearReturn?: number;
  missingReturns?: ReturnPeriod[];
  /** True for funds from the live catalog, as opposed to the illustrative demo set. */
  live?: boolean;
  /** Which markets the fund's estimates follow, fitted to its own returns (lib/portfolio/fit.ts). */
  tracking?: import("@/lib/portfolio/market").FundTracking;
}

export type ReturnPeriod = "1y" | "3y" | "5y";

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  dateOfBirth?: string;
  createdAt: string;
  savedFundIds: string[];
}

export interface TrackedFund {
  id: string;
  fundSlug: string;
  /** Optional name for the holding, e.g. "work pension" or "prsa". */
  label?: string;
  /** The holding's value on `valueAsOf` — from a statement, or what the user entered. */
  startValue: number;
  /** ISO date (YYYY-MM-DD) that `startValue` was true on. The anchor for every estimate. */
  valueAsOf: string;
  /** The member's own monthly contribution. */
  monthlyContribution: number;
  /** The employer's monthly contribution into the same holding. */
  employerContribution: number;
  /** ISO date (YYYY-MM-DD) the user started tracking this holding. */
  startedAt: string;
  /** ISO datetime the user last saw/acknowledged an update for this holding. */
  lastSeenAt: string;
  /**
   * The holding's own annual management charge, % a year, from the user's
   * statement. Undefined = not entered: the fund's published charge, then a
   * typical one, is assumed instead.
   */
  amcPct?: number;
  /** % taken off each contribution before it's invested (100% − allocation rate). */
  contributionChargePct?: number;
  /** Flat yearly policy fee in euros. */
  policyFee?: number;
}

/** What a user enters to add or update a holding. */
export interface HoldingInput {
  fundSlug: string;
  label?: string;
  startValue: number;
  valueAsOf: string;
  monthlyContribution: number;
  employerContribution: number;
  amcPct?: number;
  contributionChargePct?: number;
  policyFee?: number;
}

export type IncomePer = "month" | "year";

/** Everything the retirement calculator asks. Money is in today's euros unless it says otherwise. */
export interface CalculatorInput {
  currentAge: number;
  retirementAge: number;
  currentSalary: number;
  currentPotValue: number;
  employeeContributionPct: number;
  employerContributionPct: number;
  /** Yearly pay rise; contributions are a share of pay, so they rise with it. */
  salaryGrowthPct: number;
  marginalTaxRatePct: 20 | 40;
  /** Growth before charges while saving, and once retired (the ARF). */
  preRetirementGrowthPct: number;
  postRetirementGrowthPct: number;
  /** Years before retirement over which growth glides from the saving rate to the retired rate (lifestyling). 0 = off. */
  lifestyleYears: number;
  fundAmcPct: number;
  inflationPct: number;
  /** Take 25% of the pot as a lump sum at retirement (the first €200,000 tax-free). */
  takeLumpSum: boolean;
  /**
   * The income you want in retirement, in today's money, from every source.
   * The pot pays whatever the State Pension and other income don't.
   */
  incomeAmount: number;
  incomePer: IncomePer;
  /** Raise the income with inflation each year (otherwise fixed in euros from retirement). */
  incomeIndexed: boolean;
  includeStatePension: boolean;
  /** Weekly State Pension in today's money; paid from age 66, assumed to rise with inflation. */
  statePensionWeekly: number;
  /** Other yearly income in retirement (rent, a DB pension…), today's money, rising with inflation. */
  otherIncomeYearly: number;
  /** "Make it last to": the age the sustainable-income figure is worked out for. */
  planToAge: number;
}

/** One year of the plan. Money is in future euros; divide by `deflator` for today's money. */
export interface PlanYear {
  age: number;
  phase: "saving" | "retired";
  /** Pot on reaching this age (at retirement: before any lump sum). */
  potValue: number;
  /** Paid in so far, including the starting pot (saving years). */
  contributions: number;
  /** Drawn from the pot during this year of age (retired years): the income wanted, less the State Pension and other income. */
  withdrawal: number;
  statePension: number;
  otherIncome: number;
  /** True when Revenue's ARF minimum, not your plan, set the withdrawal. */
  minimumApplied: boolean;
  /** True when the pot couldn't make up the income wanted in full. */
  shortfall: boolean;
  /** (1 + inflation)^(years from now). */
  deflator: number;
}

export interface CalculatorResult {
  ageRelatedLimitPct: number;
  earningsCap: number;
  maxRelievableContribution: number;
  annualTaxReliefSaved: number;
  yearsToRetirement: number;
  /** Pot on the day you retire, future euros. */
  projectedPot: number;
  totalContributions: number;
  /** What charges cost by retirement: the pot without them less the pot with them. */
  totalFeesDrag: number;
  lumpSum: number;
  lumpSumTax: number;
  /** What's left invested to draw from (an ARF). */
  drawdownPot: number;
  /** The age the State Pension starts, and the years before it with the pot alone. */
  statePensionAge: number;
  bridgeYears: number;
  /** The first age the pot can't pay the plan in full, or null if it lasts to 100. */
  runsOutAge: number | null;
  /** The same, if returns were 2% a year lower throughout. */
  cautiousRunsOutAge: number | null;
  /** The most income a year (today's money, all sources) that still lasts to planToAge. */
  sustainableYearly: number;
  /** The first age Revenue's ARF minimum is more than your plan, if it ever is. */
  minimumFromAge: number | null;
  /** Your pay in the last year of work, today's money. */
  finalSalaryToday: number;
  years: PlanYear[];
}
