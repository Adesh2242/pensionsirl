/**
 * Fetches real fund data (name, risk rating, category, 1yr/3yr/5yr/10yr
 * returns) from the National Pension Helpline fund explorer and upserts it
 * into the `funds` + `fund_prices` tables.
 *
 * How: each provider's page (e.g. /zurich-life) is a Next.js App Router
 * page. Requesting its `.txt` suffix returns the page's React Server
 * Component "flight" payload — the same data the browser uses to render the
 * table, just as plain text instead of executed JS/HTML. That payload
 * embeds a JSON `initialFunds` array with clean structured fields (including
 * a real 3-year return). A plain `fetch()` is enough — no headless browser —
 * so this runs anywhere Node runs.
 *
 * Entry point: scripts/scrape-funds.ts — `pnpm scrape:funds [--dry-run]` by
 * hand, and `node dist/scrape-funds.mjs` as the weekly Railway cron job.
 *
 * Imports are relative, not `@/`, and nothing here imports "server-only"
 * modules, so the job bundles and runs as a plain Node script.
 *
 * This relies on the site's internal Next.js data format rather than a
 * published API, so it's inherently more fragile than a versioned contract —
 * if extractInitialFunds() below starts returning null, the site's build
 * likely changed shape and this needs re-checking against the live response.
 */
import type postgres from "postgres";
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
 * Errors can arrive as plain `{ message, code, ... }` objects rather
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

type Sql = ReturnType<typeof postgres>;

/**
 * Upserts providers, funds and today's fund_prices row for each fund, and
 * records the run in scrape_log (which the app shows as "fund data
 * updated"). Throws on failure, after marking the scrape_log row failed.
 */
export async function writeScrape(
  sql: Sql,
  allFunds: ScrapedFund[],
  log: Log = console.log,
): Promise<{ funds: number; priceRows: number }> {
  // Zero funds means the source was unreachable or changed shape, not that
  // the market emptied. Recording that as a success would move the site's
  // "fund data updated" date forward with nothing new behind it.
  if (allFunds.length === 0) {
    throw new Error("Scraped 0 funds — source unreachable or its format changed. Nothing written.");
  }

  const [logRow] = await sql<{ id: number }[]>`insert into scrape_log (status) values ('running') returning id`;

  try {
    const priceRows = await sql.begin(async (t) => {
      // postgres.js types drop the call signature from TransactionSql
      // under current TypeScript; at runtime it is the same tagged template.
      const tx = t as unknown as Sql;
      log("Upserting providers...");
      const providerRows = researchedProviders.map((p) => ({ slug: p.slug, name: p.name }));
      await tx`
        insert into providers ${tx(providerRows, "slug", "name")}
        on conflict (slug) do update set name = excluded.name`;

      log("Upserting funds...");
      // One row per slug: the source occasionally lists a fund twice.
      const bySlug = new Map<string, ScrapedFund>();
      for (const f of allFunds) bySlug.set(slugify(f.providerSlug, f.name), f);
      const fundRows = [...bySlug].map(([slug, f]) => ({
        slug,
        provider_slug: f.providerSlug,
        name: f.name,
        asset_class: mapAssetClass(f.category),
        risk_rating: f.riskRating,
        subcategory: f.subcategory || null,
        description: categoryDescription(mapAssetClass(f.category), f.riskRating),
      }));
      const upserted: { id: string; slug: string }[] = await tx`
        insert into funds ${tx(fundRows, "slug", "provider_slug", "name", "asset_class", "risk_rating", "subcategory", "description")}
        on conflict (slug) do update set
          provider_slug = excluded.provider_slug,
          name = excluded.name,
          asset_class = excluded.asset_class,
          risk_rating = excluded.risk_rating,
          subcategory = excluded.subcategory,
          description = excluded.description,
          updated_at = now()
        returning id, slug`;
      const idBySlug = new Map(upserted.map((f) => [f.slug, f.id]));

      const priceDate = new Date().toISOString().slice(0, 10);
      const rows = [...bySlug]
        .map(([slug, f]) => {
          const fundId = idBySlug.get(slug);
          if (!fundId) return null;
          return {
            fund_id: fundId as string,
            price_date: priceDate,
            one_year_return: f.oneYearReturn,
            three_year_return: f.threeYearReturn,
            five_year_return: f.fiveYearReturn,
            ten_year_return: f.tenYearReturn,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      log("Upserting fund_prices...");
      await tx`
        insert into fund_prices ${tx(rows, "fund_id", "price_date", "one_year_return", "three_year_return", "five_year_return", "ten_year_return")}
        on conflict (fund_id, price_date) do update set
          one_year_return = excluded.one_year_return,
          three_year_return = excluded.three_year_return,
          five_year_return = excluded.five_year_return,
          ten_year_return = excluded.ten_year_return`;
      return rows.length;
    });

    await sql`
      update scrape_log set finished_at = now(), status = 'success', funds_updated = ${allFunds.length}
      where id = ${logRow.id}`;
    log(`Done — ${allFunds.length} funds, ${priceRows} price rows written.`);
    return { funds: allFunds.length, priceRows };
  } catch (error) {
    await sql`
      update scrape_log set finished_at = now(), status = 'failed', error = ${errorMessage(error)}
      where id = ${logRow.id}`.catch(() => {});
    throw error;
  }
}

/** How long anonymous cookie-consent records are kept, as the privacy policy says. */
export const CONSENT_RETENTION_MONTHS = 24;

/**
 * Deletes consent records older than CONSENT_RETENTION_MONTHS and expired
 * sessions. Runs with the weekly scrape; a failure is logged, never fatal.
 */
export async function applyRetention(sql: Sql, log: Log = console.log) {
  try {
    const consent = await sql`
      delete from consent_log where decided_at < now() - make_interval(months => ${CONSENT_RETENTION_MONTHS})`;
    const sessions = await sql`delete from sessions where expires_at < now()`;
    log(`retention: removed ${consent.count} consent records older than ${CONSENT_RETENTION_MONTHS} months and ${sessions.count} expired sessions.`);
  } catch (error) {
    log(`retention: failed — ${errorMessage(error)}`);
  }
}
