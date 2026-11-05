/**
 * Fund rows from Postgres to the app's Fund shape. No server-only imports,
 * so the scheduled jobs (scripts/) can use it as well as the site.
 */
import { annualise } from "@/lib/fund-returns";
import type { AssetClass, Fund, ReturnPeriod, SfdrArticle } from "@/lib/types";

/** The select list and joins that produce a FundRow; append where/order. */
export const FUND_COLUMNS = `f.slug, f.provider_slug, p.name as provider_name, f.name, f.asset_class, f.risk_rating,
             f.amc, f.subcategory, f.sfdr_article, f.manager, f.description,
             l.one_year_return, l.three_year_return, l.five_year_return, l.ten_year_return,
             t.weights as tracking_weights, t.error_pp as tracking_error, t.quality as tracking_quality
      from funds f
      left join providers p on p.slug = f.provider_slug
      left join fund_prices_latest l on l.fund_id = f.id
      left join fund_tracking t on t.fund_slug = f.slug`;

export interface FundRow {
  slug: string;
  provider_slug: string;
  provider_name: string | null;
  name: string;
  asset_class: string;
  risk_rating: number;
  amc: string | null;
  subcategory: string | null;
  sfdr_article: number | null;
  manager: string | null;
  description: string | null;
  one_year_return: string | null;
  three_year_return: string | null;
  five_year_return: string | null;
  ten_year_return: string | null;
  tracking_weights: Record<string, number> | null;
  tracking_error: string | null;
  tracking_quality: "close" | "fair" | "rough" | null;
}

const num = (v: string | null) => (v === null ? null : Number(v));

/**
 * The source publishes 1 year as a yearly figure but 3, 5 and 10 years as
 * cumulative totals. Everything downstream reads returns as average yearly
 * percentages, so the multi-year totals are annualised here, once. A period
 * the fund is too young for is recorded in missingReturns, not shown as 0%.
 */
export function mapFund(row: FundRow): Fund {
  const one = num(row.one_year_return);
  const three = num(row.three_year_return);
  const five = num(row.five_year_return);
  const ten = num(row.ten_year_return);
  const missingReturns: ReturnPeriod[] = [];
  if (one === null) missingReturns.push("1y");
  if (three === null) missingReturns.push("3y");
  if (five === null) missingReturns.push("5y");
  return {
    id: row.slug,
    slug: row.slug,
    providerSlug: row.provider_slug,
    providerName: row.provider_name ?? row.provider_slug,
    name: row.name,
    assetClass: row.asset_class as AssetClass,
    riskRating: row.risk_rating,
    amc: row.amc === null ? undefined : Number(row.amc),
    subcategory: row.subcategory ?? undefined,
    sfdrArticle: (row.sfdr_article as SfdrArticle | null) ?? undefined,
    manager: row.manager ?? undefined,
    description: row.description ?? "",
    oneYearReturn: one ?? 0,
    threeYearReturn: three === null ? 0 : annualise(three, 3),
    fiveYearReturn: five === null ? 0 : annualise(five, 5),
    tenYearReturn: ten === null ? undefined : annualise(ten, 10),
    missingReturns,
    live: true,
    tracking: row.tracking_weights
      ? {
          weights: row.tracking_weights,
          errorPp: row.tracking_error === null ? null : Number(row.tracking_error),
          quality: row.tracking_quality,
        }
      : undefined,
  };
}
