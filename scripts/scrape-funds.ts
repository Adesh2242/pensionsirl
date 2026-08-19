/**
 * Scrapes real fund data (name, risk rating, category, 1yr/5yr/10yr returns)
 * from the National Pension Helpline fund explorer and upserts it into
 * Supabase's `funds` + `fund_prices` tables.
 *
 * Why Playwright, not a plain HTTP fetch + Cheerio: the fund tables on
 * funds.nationalpensionhelpline.ie are rendered client-side after the page
 * loads (confirmed by inspecting the raw HTML — the initial response has no
 * fund data in it, only after JS runs does the table populate). A plain
 * fetch would only see an empty shell. This also means it can't run as a
 * Supabase Edge Function (Deno, no headless browser) — see the scheduling
 * note in TODO.md; run this via GitHub Actions or any Node host instead.
 *
 * Usage:
 *   pnpm scrape:funds            # writes to Supabase (needs SUPABASE_SERVICE_ROLE_KEY)
 *   pnpm scrape:funds --dry-run  # scrapes and prints a summary, writes nothing
 *
 * Without SUPABASE_SERVICE_ROLE_KEY set, this automatically runs as if
 * --dry-run were passed — it will never silently write with the wrong
 * credentials.
 */
import { chromium } from "playwright";
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

function parsePercent(raw: string): number | null {
  const trimmed = raw.trim().replace(/^\+/, "");
  if (!trimmed || trimmed === "-" || trimmed === "—") return null;
  const value = Number.parseFloat(trimmed.replace("%", ""));
  return Number.isFinite(value) ? value : null;
}

interface ScrapedFund {
  providerSlug: string;
  providerName: string;
  name: string;
  riskRating: number;
  category: string;
  subcategory: string;
  oneYearReturn: number | null;
  fiveYearReturn: number | null;
  tenYearReturn: number | null;
}

async function scrapeProvider(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  slug: string,
  name: string,
): Promise<ScrapedFund[]> {
  const page = await browser.newPage({ userAgent: USER_AGENT });
  const results: ScrapedFund[] = [];

  try {
    await page.goto(`${SITE_BASE}/${slug}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(800);

    const tables = page.locator("table");
    const tableCount = await tables.count();
    let fundTableIndex = -1;
    for (let i = 0; i < tableCount; i++) {
      const header = await tables.nth(i).locator("tr").first().innerText();
      if (header.includes("Category") && header.includes("1Y")) {
        fundTableIndex = i;
        break;
      }
    }
    if (fundTableIndex === -1) {
      console.warn(`  [${slug}] no fund table found (page layout may have changed) — skipping`);
      return results;
    }

    const rows = await tables.nth(fundTableIndex).locator("tr").allInnerTexts();
    for (const rowText of rows.slice(1)) {
      const cells = rowText.split("\t").map((c) => c.trim()).filter(Boolean);
      if (cells.length < 7) continue;
      const [fundName, riskRaw, category, subcategory, oneY, fiveY, tenY] = cells;
      const riskRating = Number.parseInt(riskRaw, 10);
      if (!fundName || !Number.isFinite(riskRating)) continue;

      results.push({
        providerSlug: slug,
        providerName: name,
        name: fundName,
        riskRating,
        category,
        subcategory,
        oneYearReturn: parsePercent(oneY),
        fiveYearReturn: parsePercent(fiveY),
        tenYearReturn: parsePercent(tenY),
      });
    }
  } finally {
    await page.close();
  }

  return results;
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

  console.log(`Launching browser and scraping ${researchedProviders.length} providers...\n`);
  const browser = await chromium.launch();

  const allFunds: ScrapedFund[] = [];
  try {
    for (const provider of researchedProviders) {
      process.stdout.write(`  ${provider.slug}... `);
      const funds = await scrapeProvider(browser, provider.slug, provider.name);
      console.log(`${funds.length} funds`);
      allFunds.push(...funds);
    }
  } finally {
    await browser.close();
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
