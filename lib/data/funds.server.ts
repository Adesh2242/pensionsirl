import "server-only";
import { createPublicClient as createClient } from "@/lib/supabase/public";
import {
  fetchFundFromSupabase,
  fetchFundsFromSupabase,
  fetchLastScrapeTime,
  fetchProvidersFromSupabase,
} from "@/lib/supabase/funds-queries";
import { funds as mockFunds, providers as mockProviders, getFund as getMockFund } from "@/lib/mock-data";
import type { Fund, Provider } from "@/lib/types";

/**
 * Supabase-first, mock-fallback data access for Server Components. Falls
 * back to lib/mock-data.ts whenever Supabase isn't configured, the schema
 * migration hasn't been applied yet (`relation does not exist`), or the
 * tables are empty — so these pages work today and upgrade automatically
 * once supabase/migrations/002_scraper_support.sql is applied and
 * scripts/scrape-funds.ts has run, with no further code changes.
 */
export async function getAllFunds(): Promise<Fund[]> {
  const supabase = await createClient();
  if (!supabase) return mockFunds;

  try {
    const funds = await fetchFundsFromSupabase(supabase);
    return funds.length > 0 ? funds : mockFunds;
  } catch (error) {
    console.warn("Supabase funds query failed, falling back to mock data:", error);
    return mockFunds;
  }
}

export async function getFundBySlug(slug: string): Promise<Fund | undefined> {
  const supabase = await createClient();
  if (!supabase) return getMockFund(slug);

  try {
    const fund = await fetchFundFromSupabase(supabase, slug);
    return fund ?? getMockFund(slug);
  } catch (error) {
    console.warn("Supabase fund query failed, falling back to mock data:", error);
    return getMockFund(slug);
  }
}

export async function getAllProviders(): Promise<Provider[]> {
  const supabase = await createClient();
  if (!supabase) return mockProviders;

  try {
    const providers = await fetchProvidersFromSupabase(supabase);
    return providers.length > 0 ? providers : mockProviders;
  } catch (error) {
    console.warn("Supabase providers query failed, falling back to mock data:", error);
    return mockProviders;
  }
}

/** null in mock mode, or if the scraper hasn't completed a run yet. */
export async function getLastScrapeTime(): Promise<string | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  try {
    return await fetchLastScrapeTime(supabase);
  } catch (error) {
    console.warn("Supabase scrape_log query failed:", error);
    return null;
  }
}
