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
 * a real 3-year return, which the old approach had to interpolate). This
 * means a plain `fetch()` is enough — no headless browser needed, unlike the
 * previous Playwright-based version, which had to drive a real page render
 * because the visible HTML table is populated by client-side JS. That also
 * means this can now run anywhere Node runs, including as a Supabase Edge
 * Function, if the GitHub Actions schedule ever needs replacing.
 *
 * This relies on the site's internal Next.js data format rather than a
 * published API, so it's inherently more fragile than a versioned contract —
 * if extractInitialFunds() below starts throwing, the site's build likely
 * changed shape and this needs re-checking against the live response.
 *
 * Usage:
 *   pnpm scrape:funds            # writes to Supabase (needs SUPABASE_SERVICE_ROLE_KEY)
 *   pnpm scrape:funds --dry-run  # scrapes and prints a summary, writes nothing
 *
 * Without SUPABASE_SERVICE_ROLE_KEY set, this automatically runs as if
 * --dry-run were passed — it will never silently write with the wrong
 * credentials.
 */
import { createClient } from "@supabase/supabase-js";
import { providers as researchedProviders, slugify, categoryDescription } from "../lib/mock-data";
import type { AssetClass } from "../lib/types";

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

interface ScrapedFund {
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

/**
 * Finds `"initialFunds":[...]` in the flight payload and bracket-matches to
 * the closing `]`, tracking string state so brackets inside fund/category
 * names (there aren't any today, but don't assume) can't throw off the
 * count. Returns null if the marker isn't present (page format changed).
 */
function extractInitialFunds(flightPayload: string): RawFund[] | null {
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

async function scrapeProvider(slug: string, name: string): Promise<ScrapedFund[]> {
  const res = await fetch(`${SITE_BASE}/${slug}.txt`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) {
    console.warn(`  [${slug}] HTTP ${res.status} — skipping`);
    return [];
  }

  const rawFunds = extractInitialFunds(await res.text());
  if (rawFunds === null) {
    console.warn(`  [${slug}] no fund data found in response (page format may have changed) — skipping`);
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

async function main() {
  const args = process.argv.slice(2);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dryRun = args.includes("--dry-run") || !url || !serviceRoleKey;

  if (dryRun && (!url || !serviceRoleKey)) {
    console.log(
      "No NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY set — running in --dry-run mode automatically (no writes).\n",
    );
  } else if (dryRun) {
    console.log("--dry-run passed — scraping only, no writes.\n");
  }

  const supabase = !dryRun && url && serviceRoleKey ? createClient(url, serviceRoleKey) : null;

  console.log(`Fetching ${researchedProviders.length} providers...\n`);

  const allFunds: ScrapedFund[] = [];
  for (const provider of researchedProviders) {
    process.stdout.write(`  ${provider.slug}... `);
    const funds = await scrapeProvider(provider.slug, provider.name);
    console.log(`${funds.length} funds`);
    allFunds.push(...funds);
  }

  console.log(`\nScraped ${allFunds.length} funds total across ${researchedProviders.length} providers.`);

  if (dryRun) {
    console.log("\nSample (first 5):");
    console.log(JSON.stringify(allFunds.slice(0, 5), null, 2));
    console.log("\nDry run complete — nothing written to Supabase.");
    return;
  }

  if (!supabase) return; // unreachable given the dryRun check above, satisfies TS

  const startedAt = new Date().toISOString();
  const { data: logRow, error: logError } = await supabase
    .from("scrape_log")
    .insert({ started_at: startedAt, status: "running" })
    .select("id")
    .single();
  if (logError) console.warn("Could not write scrape_log start row:", logError.message);

  try {
    console.log("\nUpserting providers...");
    const { error: providerError } = await supabase
      .from("providers")
      .upsert(
        researchedProviders.map((p) => ({ slug: p.slug, name: p.name })),
        { onConflict: "slug" },
      );
    if (providerError) throw providerError;

    console.log("Upserting funds...");
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

    const idBySlug = new Map((upsertedFunds as { id: string; slug: string }[]).map((f) => [f.slug, f.id]));
    const priceDate = new Date().toISOString().slice(0, 10);
    const priceRows = allFunds
      .map((f) => {
        const slug = slugify(f.providerSlug, f.name);
        const fundId = idBySlug.get(slug);
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

    console.log("Upserting fund_prices...");
    const { error: priceError } = await supabase
      .from("fund_prices")
      .upsert(priceRows, { onConflict: "fund_id,price_date" });
    if (priceError) throw priceError;

    if (logRow) {
      await supabase
        .from("scrape_log")
        .update({ finished_at: new Date().toISOString(), status: "success", funds_updated: allFunds.length })
        .eq("id", logRow.id);
    }

    console.log(`\nDone — ${allFunds.length} funds, ${priceRows.length} price rows written.`);
  } catch (error) {
    console.error("\nScrape failed:", error);
    if (logRow) {
      await supabase
        .from("scrape_log")
        .update({
          finished_at: new Date().toISOString(),
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        })
        .eq("id", logRow.id);
    }
    process.exitCode = 1;
  }
}

main();
