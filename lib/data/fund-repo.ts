import "server-only";
import { sql } from "@/lib/db";
import { providers as researchedProviders } from "@/lib/mock-data";
import type { Fund, Provider } from "@/lib/types";
import { FUND_COLUMNS, mapFund, type FundRow } from "@/lib/data/fund-map";

export interface Catalog {
  funds: Fund[];
  providers: Provider[];
  lastScrapeTime: string | null;
}

/**
 * The whole live catalogue in three queries. Throws if the database is
 * unreachable; callers fall back to the bundled dataset.
 */
export async function loadCatalog(): Promise<Catalog | null> {
  if (!sql) return null;
  const [fundRows, providerRows, scrape] = await Promise.all([
    sql<FundRow[]>`
      select ${sql.unsafe(FUND_COLUMNS)}
      order by f.name`,
    sql<{ slug: string; name: string }[]>`select slug, name from providers order by name`,
    sql<{ finished_at: Date }[]>`
      select finished_at from scrape_log where status = 'success' order by finished_at desc limit 1`,
  ]);
  return {
    funds: fundRows.map(mapFund),
    providers: providerRows.map((p) => ({
      slug: p.slug,
      name: p.name,
      realFundCount: researchedProviders.find((r) => r.slug === p.slug)?.realFundCount ?? 0,
    })),
    lastScrapeTime: scrape[0]?.finished_at.toISOString() ?? null,
  };
}
