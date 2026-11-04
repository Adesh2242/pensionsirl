import "server-only";
import { loadCatalog, type Catalog } from "@/lib/data/fund-repo";
import { funds as mockFunds, providers as mockProviders, getFund as getMockFund } from "@/lib/mock-data";
import type { Fund, Provider } from "@/lib/types";

/**
 * Database-first, bundled-dataset fallback fund data for Server Components
 * and API routes. The catalogue changes once a week (the Monday scrape), so
 * it's held in memory for five minutes rather than queried on every request.
 * When the database isn't configured, is unreachable or is still empty, the
 * curated dataset in lib/mock-data.ts stands in — and `live` says so.
 */
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; catalog: Catalog } | null = null;
let inflight: Promise<Catalog | null> | null = null;

async function catalog(): Promise<Catalog | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.catalog;
  inflight ??= loadCatalog()
    .then((loaded) => {
      if (loaded && loaded.funds.length > 0) cache = { at: Date.now(), catalog: loaded };
      return loaded && loaded.funds.length > 0 ? loaded : null;
    })
    .catch((error) => {
      console.warn("Fund catalogue query failed, using bundled data:", error);
      // Serve the last good copy rather than demo data during a blip.
      return cache?.catalog ?? null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function getCatalog(): Promise<Catalog & { live: boolean }> {
  const live = await catalog();
  return live
    ? { ...live, live: true }
    : { funds: mockFunds, providers: mockProviders, lastScrapeTime: null, live: false };
}

export async function getAllFunds(): Promise<Fund[]> {
  return (await getCatalog()).funds;
}

export async function getFundBySlug(slug: string): Promise<Fund | undefined> {
  const live = await catalog();
  return live ? live.funds.find((f) => f.slug === slug) : getMockFund(slug);
}

export async function getAllProviders(): Promise<Provider[]> {
  return (await getCatalog()).providers;
}

export async function getLastScrapeTime(): Promise<string | null> {
  return (await getCatalog()).lastScrapeTime;
}
