/**
 * Fetches real fund data (name, risk rating, category, 1yr/3yr/5yr/10yr
 * returns) from the National Pension Helpline fund explorer and upserts it
 * into Supabase's `funds` + `fund_prices` tables.
 *
 * How: each provider's page (e.g. /zurich-life) is a Next.js App Router
 * page. Requesting its `.txt` suffix returns the page's React Server
 * Component "flight" payload — the same data the browser uses to render the
 * table, just as plain text instead of executed JS/HTML. That payload
 * embeds a JSON `initialFunds` array with clean structured fields (including
 * a real 3-year return). A plain `fetch()` is enough — no headless browser —
 * so this runs anywhere Node runs.
 *
 * Two entry points share this module:
 *   - scripts/scrape-funds.ts — `pnpm scrape:funds [--dry-run]`, by hand
 *   - netlify/functions/scrape-funds.mts — the weekly schedule
 *
 * Imports are relative, not `@/`, so the Netlify function bundler resolves
 * them without the app's tsconfig path aliases.
 *
 * This relies on the site's internal Next.js data format rather than a
 * published API, so it's inherently more fragile than a versioned contract —
 * if extractInitialFunds() below starts returning null, the site's build
 * likely changed shape and this needs re-checking against the live response.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { providers as researchedProviders, slugify, categoryDescription } from "../mock-data";
import type { AssetClass } from "../types";

const SITE_BASE = "https://funds.nationalpensionhelpline.ie";
const USER_AGENT = "PensionIQ-Scraper/1.0 (+https://pensioniq.ie; contact: see TODO.md)";

const CATEGORY_TO_ASSET_CLASS: Record<string, AssetClass> = {
  equity: "Equity",
  bond: "Bond",
  bonds: "Bond",
  cash: "Cash",
  "money market": "Cash",
  property: "Property",
  managed: "Multi-Asset",
  "multi-asset": "Multi-Asset",
  lifecycle: "Lifecycle",
  alternative: "Alternative",
};

function mapAssetClass(category: string): AssetClass {
  return CATEGORY_TO_ASSET_CLASS[category.trim().toLowerCase()] ?? "Multi-Asset";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ScrapedFund {
  providerSlug: string;
  providerName: string;
  name: string;
  riskRating: number;
  category: string;
  subcategory: string;
  oneYearReturn: number | null;
  threeYearReturn: number | null;
  fiveYearReturn: number | null;
  tenYearReturn: number | null;
}

interface RawFund {
  fund_id: number;
  name: string;
  category_name: string;
  ytd_value: number | null;
  oneyear_value: number | null;
  threeyear_value: number | null;
  fiveyear_value: number | null;
  tenyear_value: number | null;
  risk_rating: number;
  closed_flag: boolean;
}

type Log = (message: string) => void;

/**
 * Supabase errors can arrive as plain `{ message, code, ... }` objects rather
 * than Error instances; String() on those records "[object Object]".
 */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error);
}

/**
 * Finds `"initialFunds":[...]` in the flight payload and bracket-matches to
 * the closing `]`, tracking string state so brackets inside fund/category
 * names (there aren't any today, but don't assume) can't throw off the
 * count. Returns null if the marker isn't present (page format changed).
 */
export function extractInitialFunds(flightPayload: string): RawFund[] | null {
  const marker = '"initialFunds":';
  const markerIndex = flightPayload.indexOf(marker);
  if (markerIndex === -1) return null;

  const start = markerIndex + marker.length;
  if (flightPayload[start] !== "[") return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;
  for (let i = start; i < flightPayload.length; i++) {
    const char = flightPayload[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) return null;

  return JSON.parse(flightPayload.slice(start, end)) as RawFund[];
}

async function scrapeProvider(slug: string, name: string, log: Log): Promise<ScrapedFund[]> {
  const res = await fetch(`${SITE_BASE}/${slug}.txt`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    log(`  [${slug}] HTTP ${res.status} — skipping`);
    return [];
  }

  const rawFunds = extractInitialFunds(await res.text());
  if (rawFunds === null) {
    log(`  [${slug}] no fund data found in response (page format may have changed) — skipping`);
    return [];
  }

  return rawFunds
    .filter((f) => !f.closed_flag && f.name && Number.isFinite(f.risk_rating))
    .map((f) => {
      const [category] = f.category_name.split(" ");
      return {
        providerSlug: slug,
        providerName: name,
        name: f.name,
        riskRating: f.risk_rating,
        category,
        subcategory: f.category_name,
        oneYearReturn: f.oneyear_value === null ? null : round2(f.oneyear_value * 100),
        threeYearReturn: f.threeyear_value === null ? null : round2(f.threeyear_value * 100),
        fiveYearReturn: f.fiveyear_value === null ? null : round2(f.fiveyear_value * 100),
        tenYearReturn: f.tenyear_value === null ? null : round2(f.tenyear_value * 100),
      };
    });
}

/** Scrapes every researched provider, one at a time, to be polite to the source. */
export async function scrapeAllProviders(log: Log = console.log): Promise<ScrapedFund[]> {
  log(`Fetching ${researchedProviders.length} providers...`);
  const allFunds: ScrapedFund[] = [];
  for (const provider of researchedProviders) {
    const funds = await scrapeProvider(provider.slug, provider.name, log);
    log(`  ${provider.slug}... ${funds.length} funds`);
    allFunds.push(...funds);
  }
  log(`Scraped ${allFunds.length} funds total across ${researchedProviders.length} providers.`);
  return allFunds;
}

/**
 * Upserts providers, funds and today's fund_prices row for each fund, and
 * records the run in scrape_log (which the app shows as "Fund data last
 * updated"). Throws on failure, after marking the scrape_log row failed.
 */
export async function writeScrapeToSupabase(
  supabase: SupabaseClient,
  allFunds: ScrapedFund[],
  log: Log = console.log,
): Promise<{ funds: number; priceRows: number }> {
  // Zero funds means the source was unreachable or changed shape, not that
  // the market emptied. Recording that as a success would move the site's
  // "fund data last updated" date forward with nothing new behind it.
  if (allFunds.length === 0) {
    throw new Error("Scraped 0 funds — source unreachable or its format changed. Nothing written.");
  }

  const startedAt = new Date().toISOString();
  const { data: logRow, error: logError } = await supabase
    .from("scrape_log")
    .insert({ started_at: startedAt, status: "running" })
    .select("id")
    .single();
  if (logError) log(`Could not write scrape_log start row: ${logError.message}`);

  try {
    log("Upserting providers...");
    const { error: providerError } = await supabase
      .from("providers")
      .upsert(
        researchedProviders.map((p) => ({ slug: p.slug, name: p.name })),
        { onConflict: "slug" },
      );
    if (providerError) throw providerError;

    log("Upserting funds...");
    const fundRows = allFunds.map((f) => ({
      slug: slugify(f.providerSlug, f.name),
      provider_slug: f.providerSlug,
      name: f.name,
      asset_class: mapAssetClass(f.category),
      risk_rating: f.riskRating,
      subcategory: f.subcategory || null,
      description: categoryDescription(mapAssetClass(f.category), f.riskRating),
      updated_at: new Date().toISOString(),
    }));
    const { data: upsertedFunds, error: fundError } = await supabase
      .from("funds")
      .upsert(fundRows, { onConflict: "slug" })
      .select("id, slug");
    if (fundError) throw fundError;

    const idBySlug = new Map(
      (upsertedFunds as { id: string; slug: string }[]).map((f) => [f.slug, f.id]),
    );
    const priceDate = new Date().toISOString().slice(0, 10);
    const priceRows = allFunds
      .map((f) => {
        const fundId = idBySlug.get(slugify(f.providerSlug, f.name));
        if (!fundId) return null;
        return {
          fund_id: fundId,
          price_date: priceDate,
          nav: null, // not published by this source, only returns are
          one_year_return: f.oneYearReturn,
          three_year_return: f.threeYearReturn,
          five_year_return: f.fiveYearReturn,
          ten_year_return: f.tenYearReturn,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    log("Upserting fund_prices...");
    const { error: priceError } = await supabase
      .from("fund_prices")
      .upsert(priceRows, { onConflict: "fund_id,price_date" });
    if (priceError) throw priceError;

    if (logRow) {
      await supabase
        .from("scrape_log")
        .update({
          finished_at: new Date().toISOString(),
          status: "success",
          funds_updated: allFunds.length,
        })
        .eq("id", logRow.id);
    }

    log(`Done — ${allFunds.length} funds, ${priceRows.length} price rows written.`);
    return { funds: allFunds.length, priceRows: priceRows.length };
  } catch (error) {
    if (logRow) {
      await supabase
        .from("scrape_log")
        .update({
          finished_at: new Date().toISOString(),
          status: "failed",
          error: errorMessage(error),
        })
        .eq("id", logRow.id);
    }
    throw error;
  }
}

/** Scrapes and writes in one go, with a service-role client built from the given credentials. */
export async function runScrape({
  supabaseUrl,
  serviceRoleKey,
  log = console.log,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  log?: Log;
}) {
  const funds = await scrapeAllProviders(log);
  const client: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);
  const result = await writeScrapeToSupabase(client, funds, log);
  await applyRetention(client, log);
  return result;
}

/** How long anonymous cookie-consent records are kept, as the privacy policy says. */
export const CONSENT_RETENTION_MONTHS = 24;

/**
 * Deletes consent records older than CONSENT_RETENTION_MONTHS. Runs with the
 * weekly scrape; a failure is logged, never fatal to the scrape.
 */
async function applyRetention(client: SupabaseClient, log: Log) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - CONSENT_RETENTION_MONTHS);
  const { error, count } = await client
    .from("consent_log")
    .delete({ count: "exact" })
    .lt("decided_at", cutoff.toISOString());
  if (error) log(`retention: couldn't prune consent_log — ${error.message}`);
  else log(`retention: removed ${count ?? 0} consent records older than ${CONSENT_RETENTION_MONTHS} months.`);
}
