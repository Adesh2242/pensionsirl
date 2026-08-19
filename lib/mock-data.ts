import type { AssetClass, Fund, Provider, SfdrArticle } from "./types";

/**
 * Provider names, real fund counts, and fund names below are sourced from each
 * provider's public fund centre and the National Pension Helpline fund explorer
 * (funds.nationalpensionhelpline.ie) as of August 2026. Exact live NAV/return
 * series require the daily scraper (see TODO.md) and are not available yet, so
 * 1/3/5-year returns here are deterministically generated, illustrative figures
 * banded by each fund's real risk rating — not live performance data.
 */

export const providers: Provider[] = [
  { slug: "zurich-life", name: "Zurich Life", realFundCount: 69 },
  { slug: "irish-life", name: "Irish Life", realFundCount: 58 },
  { slug: "aviva", name: "Aviva", realFundCount: 35 },
  { slug: "standard-life", name: "Standard Life", realFundCount: 52 },
  { slug: "new-ireland", name: "New Ireland", realFundCount: 114 },
  { slug: "royal-london", name: "Royal London", realFundCount: 17 },
  { slug: "mercer-aspire", name: "Mercer Aspire", realFundCount: 29 },
  { slug: "boi-life", name: "BOI Life", realFundCount: 10 },
  { slug: "aib-life", name: "AIB Life", realFundCount: 25 },
  { slug: "acorn-life", name: "Acorn Life", realFundCount: 14 },
];

interface FundSeed {
  name: string;
  assetClass: AssetClass;
  riskRating: number;
  amc: number;
  sfdrArticle?: SfdrArticle;
  manager?: string;
}

// mulberry32 — deterministic PRNG so illustrative figures are stable across builds.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function generateReturns(id: string, riskRating: number) {
  const rand = mulberry32(hashSeed(id));
  const base = 1.2 + riskRating * 2.1;
  const oneYearReturn = round2(base + (rand() - 0.5) * riskRating * 3.2);
  const threeYearReturn = round2(base * 0.82 + (rand() - 0.5) * riskRating * 1.6);
  const fiveYearReturn = round2(base * 0.72 + (rand() - 0.5) * riskRating * 1.1);
  return { oneYearReturn, threeYearReturn, fiveYearReturn };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function slugify(providerSlug: string, name: string) {
  return `${providerSlug}-${name
    .toLowerCase()
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export function categoryDescription(assetClass: AssetClass, riskRating: number) {
  const riskWord =
    riskRating <= 2
      ? "low"
      : riskRating <= 4
        ? "moderate"
        : riskRating <= 5
          ? "medium-high"
          : "high";
  switch (assetClass) {
    case "Multi-Asset":
      return `A multi-asset fund blending equities, bonds and other assets, targeting a ${riskWord}-risk profile.`;
    case "Equity":
      return `An equity fund investing predominantly in shares, carrying a ${riskWord}-risk profile.`;
    case "Bond":
      return `A fixed-income fund investing in government and/or corporate bonds, a ${riskWord}-risk profile.`;
    case "Cash":
      return `A capital-protection fund investing in cash and near-cash deposits, the lowest-risk option in the range.`;
    case "Property":
      return `A property fund investing in commercial and/or residential real estate, a ${riskWord}-risk profile.`;
    case "Lifecycle":
      return `An automatically de-risking lifestyle strategy that shifts from growth assets to safer assets as retirement approaches.`;
    case "Alternative":
      return `An alternative strategy fund (e.g. specialist, absolute-return, or fund-of-funds), a ${riskWord}-risk profile.`;
  }
}

const fundSeeds: Record<string, FundSeed[]> = {
  "zurich-life": [
    { name: "Prisma Low", assetClass: "Multi-Asset", riskRating: 2, amc: 1.0, sfdrArticle: 8 },
    { name: "Prisma 2", assetClass: "Multi-Asset", riskRating: 2, amc: 1.0, sfdrArticle: 8 },
    { name: "Prisma 3", assetClass: "Multi-Asset", riskRating: 3, amc: 1.05, sfdrArticle: 8 },
    { name: "Prisma 4", assetClass: "Multi-Asset", riskRating: 4, amc: 1.1, sfdrArticle: 8 },
    { name: "Prisma 5", assetClass: "Multi-Asset", riskRating: 5, amc: 1.15, sfdrArticle: 8 },
    { name: "Prisma Max", assetClass: "Multi-Asset", riskRating: 6, amc: 1.2, sfdrArticle: 8 },
    { name: "Life Investment", assetClass: "Multi-Asset", riskRating: 4, amc: 1.0 },
    { name: "Life Performance", assetClass: "Multi-Asset", riskRating: 5, amc: 1.05 },
    { name: "Performance Fund", assetClass: "Multi-Asset", riskRating: 5, amc: 1.1 },
    { name: "Emerging Market Opportunities (JPM)", assetClass: "Equity", riskRating: 6, amc: 1.35, manager: "J.P. Morgan" },
  ],
  "irish-life": [
    { name: "Irish Life Active Managed", assetClass: "Multi-Asset", riskRating: 5, amc: 1.25 },
    { name: "Consensus Life", assetClass: "Multi-Asset", riskRating: 5, amc: 1.0 },
    { name: "Diversified Balanced", assetClass: "Multi-Asset", riskRating: 4, amc: 0.95 },
    { name: "Diversified Cautious", assetClass: "Multi-Asset", riskRating: 3, amc: 0.9 },
    { name: "Diversified Growth", assetClass: "Multi-Asset", riskRating: 5, amc: 1.05 },
    { name: "Multi-Asset Portfolio 4", assetClass: "Multi-Asset", riskRating: 4, amc: 1.0 },
    { name: "Portfolio Pension 4", assetClass: "Multi-Asset", riskRating: 4, amc: 1.0 },
    { name: "Retirement Portfolio 3", assetClass: "Multi-Asset", riskRating: 3, amc: 0.9 },
    { name: "Indexed World Equity Fund", assetClass: "Equity", riskRating: 6, amc: 0.75, manager: "ILIM" },
    { name: "Fidelity World Fund", assetClass: "Equity", riskRating: 6, amc: 1.45, manager: "Fidelity" },
    { name: "Annuity Fund", assetClass: "Bond", riskRating: 3, amc: 0.85 },
    { name: "Property", assetClass: "Property", riskRating: 4, amc: 1.35 },
  ],
  aviva: [
    { name: "Aviva Multi-Asset ESG Active 3", assetClass: "Multi-Asset", riskRating: 3, amc: 1.05, sfdrArticle: 8 },
    { name: "Aviva Multi-Asset ESG Active 4", assetClass: "Multi-Asset", riskRating: 4, amc: 1.1, sfdrArticle: 8 },
    { name: "Aviva Multi-Asset ESG Active 5", assetClass: "Multi-Asset", riskRating: 5, amc: 1.15, sfdrArticle: 8 },
    { name: "Aviva Multi-Asset ESG Passive Plus 3", assetClass: "Multi-Asset", riskRating: 3, amc: 0.85, sfdrArticle: 8 },
    { name: "Aviva Cantor Fitzgerald Multi-Asset 50 Fund", assetClass: "Multi-Asset", riskRating: 4, amc: 1.2, manager: "Cantor Fitzgerald" },
    { name: "Aviva Global Leaders Equity", assetClass: "Equity", riskRating: 6, amc: 1.3 },
    { name: "Aviva Emerging Markets Equity Index", assetClass: "Equity", riskRating: 6, amc: 0.8 },
    { name: "Aviva Stewardship Ethical Equity", assetClass: "Equity", riskRating: 6, amc: 1.25, sfdrArticle: 8 },
    { name: "Aviva Irish Property Fund", assetClass: "Property", riskRating: 4, amc: 1.4 },
    { name: "Aviva Bond Fund", assetClass: "Bond", riskRating: 3, amc: 0.9 },
    { name: "Aviva Cash Fund", assetClass: "Cash", riskRating: 1, amc: 0.55 },
  ],
  "standard-life": [
    { name: "Managed", assetClass: "Multi-Asset", riskRating: 5, amc: 1.05 },
    { name: "Cautious Managed", assetClass: "Multi-Asset", riskRating: 3, amc: 0.95 },
    { name: "MyFolio Active III", assetClass: "Multi-Asset", riskRating: 4, amc: 1.05 },
    { name: "MyFolio Market III", assetClass: "Multi-Asset", riskRating: 4, amc: 0.85 },
    { name: "Global Index 20", assetClass: "Multi-Asset", riskRating: 2, amc: 0.95, manager: "Vanguard" },
    { name: "Global Index 40", assetClass: "Multi-Asset", riskRating: 3, amc: 0.95, manager: "Vanguard" },
    { name: "Global Index 60", assetClass: "Multi-Asset", riskRating: 4, amc: 0.95, manager: "Vanguard" },
    { name: "Global Index 80", assetClass: "Multi-Asset", riskRating: 5, amc: 0.95, manager: "Vanguard" },
    { name: "Global Index 100", assetClass: "Multi-Asset", riskRating: 6, amc: 0.95, manager: "Vanguard" },
    { name: "Global Equity", assetClass: "Equity", riskRating: 6, amc: 0.9, manager: "abrdn", sfdrArticle: 8 },
    { name: "Vanguard Global Stock Index Tracker", assetClass: "Equity", riskRating: 6, amc: 0.4, manager: "Vanguard" },
    { name: "Property", assetClass: "Property", riskRating: 4, amc: 1.3 },
  ],
  "new-ireland": [
    { name: "New Ireland Passive IRIS Fund 2030", assetClass: "Lifecycle", riskRating: 4, amc: 0.95 },
    { name: "New Ireland Retirement Fund (IRIS) 2030", assetClass: "Lifecycle", riskRating: 4, amc: 1.05 },
    { name: "New Ireland Global Equity", assetClass: "Equity", riskRating: 6, amc: 1.2 },
    { name: "New Ireland North American", assetClass: "Equity", riskRating: 6, amc: 1.2 },
    { name: "New Ireland Ethical Equity", assetClass: "Equity", riskRating: 6, amc: 1.25, sfdrArticle: 8 },
    { name: "New Ireland Balanced Managed", assetClass: "Multi-Asset", riskRating: 4, amc: 1.1 },
    { name: "New Ireland iFunds 4 Alpha", assetClass: "Multi-Asset", riskRating: 4, amc: 1.15 },
    { name: "New Ireland PruFund", assetClass: "Multi-Asset", riskRating: 4, amc: 1.2, manager: "M&G Prudential" },
    { name: "New Ireland Gilt", assetClass: "Bond", riskRating: 3, amc: 0.85 },
    { name: "New Ireland Property", assetClass: "Property", riskRating: 4, amc: 1.35 },
  ],
  "royal-london": [
    { name: "Royal London BlackRock Developed World Equity Index Fund", assetClass: "Equity", riskRating: 6, amc: 0.65, manager: "BlackRock" },
    { name: "Royal London BlackRock Emerging Markets Equity Index Fund", assetClass: "Equity", riskRating: 7, amc: 0.85, manager: "BlackRock" },
    { name: "Royal London BlackRock Europe ex UK Equity Index Fund", assetClass: "Equity", riskRating: 6, amc: 0.65, manager: "BlackRock" },
    { name: "Royal London BlackRock US Equity Index Fund", assetClass: "Equity", riskRating: 6, amc: 0.65, manager: "BlackRock" },
    { name: "Royal London Global Sustainable Equity Fund", assetClass: "Equity", riskRating: 6, amc: 1.15, sfdrArticle: 8 },
    { name: "Royal London BlackRock Euro Government Bond Index Fund", assetClass: "Bond", riskRating: 3, amc: 0.6, manager: "BlackRock" },
    { name: "Royal London European Sustainable Credit Fund", assetClass: "Bond", riskRating: 3, amc: 0.9, sfdrArticle: 8 },
    { name: "Royal London Multi-Asset Adventurous Fund", assetClass: "Multi-Asset", riskRating: 6, amc: 1.1 },
    { name: "Royal London Multi-Asset Balanced Fund", assetClass: "Multi-Asset", riskRating: 4, amc: 1.0 },
    { name: "Royal London Multi-Asset Defensive Fund", assetClass: "Multi-Asset", riskRating: 2, amc: 0.85 },
    { name: "Royal London BlackRock Euro Environmentally Aware Cash Fund", assetClass: "Cash", riskRating: 1, amc: 0.5, manager: "BlackRock" },
    { name: "Royal London BlackRock Developed Real Estate Index Fund", assetClass: "Property", riskRating: 5, amc: 0.85, manager: "BlackRock" },
  ],
  "mercer-aspire": [
    { name: "Aspire High Growth Portfolio IS", assetClass: "Multi-Asset", riskRating: 6, amc: 0.75, sfdrArticle: 8 },
    { name: "Aspire Moderate Growth Portfolio IS", assetClass: "Multi-Asset", riskRating: 4, amc: 0.65, sfdrArticle: 8 },
    { name: "Aspire Cautious Growth Portfolio IS", assetClass: "Multi-Asset", riskRating: 3, amc: 0.6, sfdrArticle: 8 },
    { name: "Aspire Cash Portfolio", assetClass: "Cash", riskRating: 1, amc: 0.35 },
    { name: "Active Global Equity Unhedged", assetClass: "Equity", riskRating: 6, amc: 0.85, sfdrArticle: 8 },
    { name: "Passive Global Equity Unhedged", assetClass: "Equity", riskRating: 6, amc: 0.45, sfdrArticle: 8 },
    { name: "Passive Sustainable Equity", assetClass: "Equity", riskRating: 6, amc: 0.5, sfdrArticle: 8 },
    { name: "Global Credit Fund", assetClass: "Bond", riskRating: 3, amc: 0.55, sfdrArticle: 8 },
    { name: "Passive Corporate Bond", assetClass: "Bond", riskRating: 3, amc: 0.4 },
    { name: "Emerging Markets Equity", assetClass: "Equity", riskRating: 7, amc: 0.75, sfdrArticle: 8 },
    { name: "Diversified Growth", assetClass: "Multi-Asset", riskRating: 5, amc: 0.7, sfdrArticle: 8 },
  ],
  "boi-life": [
    { name: "Cash", assetClass: "Cash", riskRating: 1, amc: 0.75 },
    { name: "European (ex UK)", assetClass: "Equity", riskRating: 5, amc: 1.5 },
    { name: "Fixed Interest", assetClass: "Bond", riskRating: 3, amc: 1.25 },
    { name: "International", assetClass: "Equity", riskRating: 5, amc: 1.5 },
    { name: "Irish Equity", assetClass: "Equity", riskRating: 5, amc: 1.5 },
    { name: "Managed Growth", assetClass: "Multi-Asset", riskRating: 5, amc: 1.4 },
    { name: "Managed Opportunity", assetClass: "Multi-Asset", riskRating: 4, amc: 1.35 },
    { name: "Managed Security", assetClass: "Multi-Asset", riskRating: 3, amc: 1.25 },
    { name: "North American", assetClass: "Equity", riskRating: 5, amc: 1.5 },
    { name: "Property", assetClass: "Property", riskRating: 4, amc: 1.5 },
  ],
  "aib-life": [
    { name: "AIB Life Fusion Fund 2", assetClass: "Multi-Asset", riskRating: 2, amc: 0.95, sfdrArticle: 8 },
    { name: "AIB Life Fusion Fund 3", assetClass: "Multi-Asset", riskRating: 3, amc: 1.0, sfdrArticle: 8 },
    { name: "AIB Life Fusion Fund 4", assetClass: "Multi-Asset", riskRating: 4, amc: 1.05, sfdrArticle: 8 },
    { name: "AIB Life Fusion Fund 5", assetClass: "Multi-Asset", riskRating: 5, amc: 1.1, sfdrArticle: 8 },
    { name: "AIB Life Fusion Fund 6", assetClass: "Multi-Asset", riskRating: 6, amc: 1.15, sfdrArticle: 8 },
    { name: "AIB Life Cash Fund", assetClass: "Cash", riskRating: 1, amc: 0.6 },
    { name: "AIB Life Euro Government Bond", assetClass: "Bond", riskRating: 3, amc: 0.85 },
    { name: "AIB Life Developed World Equity", assetClass: "Equity", riskRating: 6, amc: 1.2, sfdrArticle: 8 },
    { name: "AIB Life Emerging Markets Equity", assetClass: "Equity", riskRating: 7, amc: 1.35, sfdrArticle: 8 },
    { name: "AIB Life Climate Impact Equity", assetClass: "Equity", riskRating: 7, amc: 1.4, sfdrArticle: 9 },
  ],
  "acorn-life": [
    { name: "Deposit Fund", assetClass: "Cash", riskRating: 1, amc: 0.75, manager: "HSBC" },
    { name: "Cautiously Managed", assetClass: "Multi-Asset", riskRating: 3, amc: 1.0, manager: "HSBC" },
    { name: "Cautious Select", assetClass: "Multi-Asset", riskRating: 3, amc: 0.9, manager: "Mercer" },
    { name: "Moderate Select", assetClass: "Multi-Asset", riskRating: 4, amc: 0.95, manager: "Mercer" },
    { name: "Managed", assetClass: "Multi-Asset", riskRating: 4, amc: 1.05, manager: "HSBC" },
    { name: "Target Return", assetClass: "Multi-Asset", riskRating: 4, amc: 1.1, manager: "HSBC" },
    { name: "Diversified Select", assetClass: "Multi-Asset", riskRating: 4, amc: 0.95, manager: "Mercer" },
    { name: "Diversified Multi-Manager", assetClass: "Multi-Asset", riskRating: 4, amc: 1.1, manager: "Mercer" },
    { name: "Managed Growth", assetClass: "Multi-Asset", riskRating: 5, amc: 1.1, manager: "HSBC" },
    { name: "Dynamic Select", assetClass: "Multi-Asset", riskRating: 5, amc: 1.0, manager: "Mercer" },
    { name: "Dynamic Multi-Manager", assetClass: "Multi-Asset", riskRating: 5, amc: 1.15, manager: "Mercer" },
    { name: "Managed High Equity", assetClass: "Multi-Asset", riskRating: 6, amc: 1.15, manager: "HSBC" },
    { name: "Adventurous Select", assetClass: "Multi-Asset", riskRating: 6, amc: 1.05, manager: "Mercer" },
    { name: "Property", assetClass: "Property", riskRating: 5, amc: 1.3, manager: "HSBC" },
  ],
};

export const funds: Fund[] = providers.flatMap((provider) =>
  (fundSeeds[provider.slug] ?? []).map((seed) => {
    const slug = slugify(provider.slug, seed.name);
    const { oneYearReturn, threeYearReturn, fiveYearReturn } = generateReturns(
      slug,
      seed.riskRating,
    );
    const fund: Fund = {
      id: slug,
      slug,
      providerSlug: provider.slug,
      providerName: provider.name,
      name: seed.name,
      assetClass: seed.assetClass,
      riskRating: seed.riskRating,
      amc: seed.amc,
      sfdrArticle: seed.sfdrArticle,
      manager: seed.manager,
      description: categoryDescription(seed.assetClass, seed.riskRating),
      oneYearReturn,
      threeYearReturn,
      fiveYearReturn,
    };
    return fund;
  }),
);

export function getProvider(slug: string) {
  return providers.find((p) => p.slug === slug);
}

export function getFund(slug: string) {
  return funds.find((f) => f.slug === slug);
}

export const assetClasses: AssetClass[] = [
  "Multi-Asset",
  "Equity",
  "Bond",
  "Cash",
  "Property",
  "Lifecycle",
  "Alternative",
];
