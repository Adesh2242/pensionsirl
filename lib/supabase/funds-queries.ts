import type { SupabaseClient } from "@supabase/supabase-js";
import type { AssetClass, Fund, Provider, SfdrArticle } from "@/lib/types";
import { providers as researchedProviders } from "@/lib/mock-data";

interface FundRow {
  slug: string;
  provider_slug: string;
  name: string;
  asset_class: string;
  risk_rating: number;
  amc: number | null;
  subcategory: string | null;
  sfdr_article: number | null;
  manager: string | null;
  description: string | null;
  providers: { name: string } | { name: string }[] | null;
}

interface PriceRow {
  fund_id: string;
  one_year_return: number | null;
  three_year_return: number | null;
  five_year_return: number | null;
  ten_year_return: number | null;
}

interface FundRowWithId extends FundRow {
  id: string;
}

/**
 * Fallback only: scripts/scrape-funds.ts now writes a real 3yr return for
 * every fund, sourced directly from the scrape source. This just covers rows
 * written before that (or any future fund missing one) so existing UI
 * (compare table, fund detail page, calculator) doesn't need a separate
 * "no data" state — treat the result as an estimate, not an observed figure.
 */
function interpolateThreeYear(oneYear: number | null, fiveYear: number | null): number {
  if (oneYear === null && fiveYear === null) return 0;
  if (oneYear === null) return fiveYear!;
  if (fiveYear === null) return oneYear;
  return oneYear + (fiveYear - oneYear) * 0.5;
}

function providerName(providers: FundRow["providers"], fallback: string): string {
  if (!providers) return fallback;
  return Array.isArray(providers) ? (providers[0]?.name ?? fallback) : providers.name;
}

function mapFund(row: FundRowWithId, price: PriceRow | undefined): Fund {
  return {
    id: row.slug,
    slug: row.slug,
    providerSlug: row.provider_slug,
    providerName: providerName(row.providers, row.provider_slug),
    name: row.name,
    assetClass: row.asset_class as AssetClass,
    riskRating: row.risk_rating,
    amc: row.amc ?? undefined,
    subcategory: row.subcategory ?? undefined,
    sfdrArticle: (row.sfdr_article as SfdrArticle | null) ?? undefined,
    manager: row.manager ?? undefined,
    description: row.description ?? "",
    oneYearReturn: price?.one_year_return ?? 0,
    threeYearReturn: price?.three_year_return ?? interpolateThreeYear(
      price?.one_year_return ?? null,
      price?.five_year_return ?? null,
    ),
    fiveYearReturn: price?.five_year_return ?? 0,
    tenYearReturn: price?.ten_year_return ?? undefined,
  };
}

const FUND_SELECT = "id, slug, provider_slug, name, asset_class, risk_rating, amc, subcategory, sfdr_article, manager, description, providers ( name )";

async function attachLatestPrices(client: SupabaseClient, rows: FundRowWithId[]) {
  if (rows.length === 0) return new Map<string, PriceRow>();
  const { data, error } = await client
    .from("fund_prices_latest")
    .select("fund_id, one_year_return, three_year_return, five_year_return, ten_year_return")
    .in("fund_id", rows.map((r) => r.id));
  if (error) throw error;
  return new Map((data as PriceRow[]).map((p) => [p.fund_id, p]));
}

/** Throws on any Supabase error (including "relation does not exist" when the migration hasn't been applied yet) — callers should catch and fall back to mock data. */
export async function fetchFundsFromSupabase(client: SupabaseClient): Promise<Fund[]> {
  const { data, error } = await client.from("funds").select(FUND_SELECT).order("name");
  if (error) throw error;
  const rows = data as FundRowWithId[];
  const prices = await attachLatestPrices(client, rows);
  return rows.map((row) => mapFund(row, prices.get(row.id)));
}

export async function fetchFundFromSupabase(
  client: SupabaseClient,
  slug: string,
): Promise<Fund | null> {
  const { data, error } = await client.from("funds").select(FUND_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as FundRowWithId;
  const prices = await attachLatestPrices(client, [row]);
  return mapFund(row, prices.get(row.id));
}

/**
 * `realFundCount` (each provider's total real fund count, per public fund
 * centres) is research metadata, not something the scraper derives — it's
 * merged in from the same curated list the mock dataset uses, keyed by slug.
 */
export async function fetchProvidersFromSupabase(client: SupabaseClient): Promise<Provider[]> {
  const { data, error } = await client.from("providers").select("slug, name").order("name");
  if (error) throw error;
  return (data as { slug: string; name: string }[]).map((p) => ({
    slug: p.slug,
    name: p.name,
    realFundCount: researchedProviders.find((r) => r.slug === p.slug)?.realFundCount ?? 0,
  }));
}

/** Timestamp of the most recent successful scripts/scrape-funds.ts run, or null if there isn't one (mock mode, migration not applied, or the scraper hasn't run yet). */
export async function fetchLastScrapeTime(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client
    .from("scrape_log")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as { finished_at: string } | null)?.finished_at ?? null;
}
