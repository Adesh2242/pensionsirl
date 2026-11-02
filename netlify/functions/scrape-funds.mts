/**
 * Weekly fund scrape, run by Netlify on a schedule (it replaces the GitHub
 * Actions workflow, which never ran). Netlify only runs scheduled functions
 * on published production deploys; they can't be called by URL, so this
 * isn't a public endpoint anyone can hit.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the site's
 * Netlify environment variables. Until both are set it logs why and does
 * nothing — the site keeps working on its fallback data.
 */
import { runScrape } from "../../lib/scraper/scrape-funds";

export default async function scrapeFunds() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn(
      "scrape-funds: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in Netlify — skipping.",
    );
    return;
  }

  try {
    const result = await runScrape({ supabaseUrl, serviceRoleKey });
    console.log(`scrape-funds: wrote ${result.funds} funds and ${result.priceRows} price rows.`);
  } catch (error) {
    // Rethrow so the run shows as failed in Netlify's function logs.
    console.error("scrape-funds: failed —", error);
    throw error;
  }
}

// 06:00 UTC every Monday — the same slot the GitHub workflow used. The source
// updates infrequently, and scrape_log.finished_at records the real run time.
export const config = {
  schedule: "0 6 * * 1",
};
