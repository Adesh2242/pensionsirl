/**
 * Runs the fund scrape by hand. The scraping itself lives in
 * lib/scraper/scrape-funds.ts, shared with the weekly Netlify scheduled
 * function (netlify/functions/scrape-funds.mts).
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
import { scrapeAllProviders, writeScrapeToSupabase } from "../lib/scraper/scrape-funds";

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

  const funds = await scrapeAllProviders();

  if (dryRun || !url || !serviceRoleKey) {
    console.log("\nSample (first 5):");
    console.log(JSON.stringify(funds.slice(0, 5), null, 2));
    console.log("\nDry run complete — nothing written to Supabase.");
    return;
  }

  try {
    await writeScrapeToSupabase(createClient(url, serviceRoleKey), funds);
  } catch (error) {
    console.error("\nScrape failed:", error);
    process.exitCode = 1;
  }
}

main();
