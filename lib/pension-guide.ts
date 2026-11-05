/**
 * Irish pension rules for /pensions-explained, in one place so the yearly
 * update (Budget day in October, new rates from January) is one edit.
 * Every figure is taken from the official source linked beside it.
 */

export const GUIDE_CHECKED = "November 2026";

export const SOURCES = {
  welfareRates2026: "https://www.citizensinformation.ie/en/money-and-tax/budgets/social-welfare-rates-announced-in-budget-2026/",
  welfareRates2027: "https://www.citizensinformation.ie/en/money-and-tax/budgets/social-welfare-rates-announced-in-budget-2027/",
  budget2027: "https://www.citizensinformation.ie/en/whats-new/key-social-welfare-changes-in-budget-2027/",
  spc: "https://www.citizensinformation.ie/en/social-welfare/older-and-retired-people/state-pension-contributory/",
  spcGov: "https://www.gov.ie/en/department-of-social-protection/services/state-pension-contributory/",
  spcDeferral: "https://www.citizensinformation.ie/en/social-welfare/older-and-retired-people/deferring-your-state-pension-contributory/",
  spnc: "https://www.citizensinformation.ie/en/social-welfare/older-and-retired-people/state-pension-non-contributory/",
  autoEnrolment: "https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/auto-enrolment/",
  myFutureFund: "https://myfuturefund.ie/",
  occupational: "https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/occupational-pensions/",
  avcs: "https://pensionsauthority.ie/scheme-members-and-prsa-contributors/understanding-pensions/paying_more_to_improve_benefits/additional_voluntary_contributions_avcs_/",
  pensionOptions: "https://pensionsauthority.ie/web-page/what-are-my-pension-options/",
  prsa: "https://www.revenue.ie/en/jobs-and-pensions/pension/products/prsa.aspx",
  taxReliefLimits: "https://www.revenue.ie/en/jobs-and-pensions/pension/relief/tax-relief-limits.aspx",
  taxReliefCI: "https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/tax-relief-on-pensions/",
  lumpSums: "https://www.revenue.ie/en/tax-professionals/tdm/pensions/chapter-27.pdf",
  arf: "https://www.revenue.ie/en/tax-professionals/tdm/pensions/chapter-28.pdf",
  sft: "https://www.revenue.ie/en/personal-tax-credits-reliefs-and-exemptions/documents/form787s.pdf",
  introduction: "https://www.citizensinformation.ie/en/money-and-tax/personal-finance/pensions/introduction-to-pensions/",
} as const;

export const STATE_PENSION = {
  age: 66,
  deferUntil: 70,
  contributoryMax2026: 299.3,
  contributoryMax2027: 309.3,
  contributoryAt67In2026: 313.4,
  nonContributory2026: { under80: 288, over80: 298 },
  nonContributory2027: { under80: 298, over80: 308 },
  minPaidContributions: 520,
  fullRateContributions: 2080,
  /** Share worked out under the old yearly-average method for people reaching 66 in 2026; the rest uses total contributions. */
  yearlyAverageShare2026: 80,
  nonContributoryMeansIgnored: 30,
  nonContributoryEarningsDisregard: 200,
} as const;

export const AUTO_ENROLMENT = {
  started: "1 January 2026",
  minAge: 23,
  maxAge: 60,
  minEarnings: 20_000,
  earningsCap: 80_000,
  schedule: [
    { years: "2026–2028", you: 1.5, employer: 1.5, state: 0.5 },
    { years: "2029–2031", you: 3, employer: 3, state: 1 },
    { years: "2032–2034", you: 4.5, employer: 4.5, state: 1.5 },
    { years: "2035 on", you: 6, employer: 6, state: 2 },
  ],
} as const;

export const RETIREMENT = {
  taxFreeLumpSum: 200_000,
  standardRateBandTop: 500_000,
  standardRate: 20,
  sft2026: 2_200_000,
  sft2027: 2_400_000,
  arfImputed: [
    { when: "Fund up to €2m, aged 60–69", rate: 4 },
    { when: "Fund up to €2m, aged 70 or over all year", rate: 5 },
    { when: "Fund over €2m", rate: 6 },
  ],
  prsaLatestAge: 75,
} as const;
