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

export interface CalculatorInput {
  currentAge: number;
  retirementAge: number;
  currentSalary: number;
  currentPotValue: number;
  employeeContributionPct: number;
  employerContributionPct: number;
  assumedGrowthRatePct: number;
  fundAmcPct: number;
  marginalTaxRatePct: 20 | 40;
}

export interface CalculatorResult {
  ageRelatedLimitPct: number;
  earningsCap: number;
  maxRelievableContribution: number;
  annualTaxReliefSaved: number;
  yearsToRetirement: number;
  projectedPot: number;
  totalContributions: number;
  totalFeesDrag: number;
  yearlyProjection: {
    age: number;
    potValue: number;
    contributions: number;
  }[];
}
