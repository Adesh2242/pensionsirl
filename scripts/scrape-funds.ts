/**
 * The weekly fund scrape. On Railway it runs as its own cron service from
 * the same image (`node dist/scrape-funds.mjs`, Mondays 06:00 UTC); locally,
 * `pnpm scrape:funds`.
 *
 *   pnpm scrape:funds            # writes to DATABASE_URL
 *   pnpm scrape:funds --dry-run  # scrapes and prints a sample, writes nothing
 *
 * Without DATABASE_URL it runs as --dry-run, so it never writes by accident.
 * It also applies data retention (old consent records, expired sessions).
 */
import postgres from "postgres";
import { applyRetention, scrapeAllProviders, writeScrape } from "../lib/scraper/scrape-funds";

async function main() {
  const url = process.env.DATABASE_URL;
  const dryRun = process.argv.includes("--dry-run") || !url;
  if (!url) console.log("No DATABASE_URL set — running as --dry-run (no writes).\n");

  const funds = await scrapeAllProviders();
  if (dryRun || !url) {
    console.log("\nSample (first 3):");
    console.log(JSON.stringify(funds.slice(0, 3), null, 2));
    console.log(`\nDry run complete — ${funds.length} funds scraped, nothing written.`);
    return;
  }

  const sql = postgres(url, { max: 2, ssl: /sslmode=require/.test(url) ? "require" : false });
  try {
    await writeScrape(sql, funds);
    await applyRetention(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("\nScrape failed:", error);
  process.exit(1);
});
