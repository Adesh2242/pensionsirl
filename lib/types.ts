export type AssetClass =
  | "Multi-Asset"
  | "Equity"
  | "Bond"
  | "Cash"
  | "Property"
  | "Lifecycle";

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
  /** Annual management charge, percent. */
  amc: number;
  sfdrArticle?: SfdrArticle;
  manager?: string;
  description: string;
  oneYearReturn: number;
  threeYearReturn: number;
  fiveYearReturn: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  dateOfBirth?: string;
  createdAt: string;
  savedFundIds: string[];
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
