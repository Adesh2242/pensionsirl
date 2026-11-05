/**
 * Daily: fetches the index-ETF prices that portfolio estimates track, then
 * re-fits every fund to the blend of them that best matches its own
 * returns (lib/portfolio/fit.ts). Runs on Railway as the `prices` cron
 * service (`node dist/update-benchmarks.mjs`, weekdays after the European
 * close); locally `pnpm prices`. The first run backfills ten years.
 */
import postgres from "postgres";
import { BENCHMARKS, type BenchmarkId, type MarketData } from "../lib/portfolio/market";
import { fitFund } from "../lib/portfolio/fit";
import { fetchDailyCloses } from "../lib/market/fetch-prices";
import { annualise } from "../lib/fund-returns";
import type { Fund, ReturnPeriod } from "../lib/types";

type Sql = ReturnType<typeof postgres>;

async function updatePrices(sql: Sql) {
  let failed = 0;
  for (const { symbol } of Object.values(BENCHMARKS)) {
    try {
      const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from benchmark_prices where symbol = ${symbol}`;
      const rows = await fetchDailyCloses(symbol, n > 200 ? "1mo" : "10y");
      if (rows.length === 0) throw new Error("no prices returned");
      const values = rows.map((r) => ({ symbol, price_date: r.date, close: r.close }));
      await sql`
        insert into benchmark_prices ${sql(values, "symbol", "price_date", "close")}
        on conflict (symbol, price_date) do update set close = excluded.close`;
      console.log(`prices: ${symbol} ${rows.length} days, latest ${rows[rows.length - 1].date} = ${rows[rows.length - 1].close}`);
    } catch (error) {
      failed++;
      console.error(`prices: ${symbol} failed —`, error instanceof Error ? error.message : error);
    }
  }
  return failed;
}

async function loadMarket(sql: Sql): Promise<MarketData> {
  const bySymbol = new Map<string, BenchmarkId>(
    (Object.entries(BENCHMARKS) as [BenchmarkId, { symbol: string }][]).map(([id, b]) => [b.symbol, id]),
  );
  const rows = await sql<{ symbol: string; price_date: Date; close: string }[]>`
    select symbol, price_date, close from benchmark_prices order by symbol, price_date`;
  const market: MarketData = {};
  for (const r of rows) {
    const id = bySymbol.get(r.symbol);
    if (!id) continue;
    const s = (market[id] ??= { dates: [], closes: [] });
    s.dates.push(r.price_date.toISOString().slice(0, 10));
    s.closes.push(Number(r.close));
  }
  return market;
}

/** Fits every fund with published returns and stores the result. */
async function fitFunds(sql: Sql, market: MarketData) {
  const rows = await sql<{
    slug: string; name: string; asset_class: string; risk_rating: number; subcategory: string | null;
    price_date: Date | null; one_year_return: string | null; three_year_return: string | null; five_year_return: string | null;
  }[]>`
    select f.slug, f.name, f.asset_class, f.risk_rating, f.subcategory,
           l.price_date, l.one_year_return, l.three_year_return, l.five_year_return
    from funds f left join fund_prices_latest l on l.fund_id = f.id`;
  const counts = { close: 0, fair: 0, rough: 0, none: 0 };
  const results = rows.map((r) => {
    const num = (v: string | null) => (v === null ? null : Number(v));
    const one = num(r.one_year_return);
    const three = num(r.three_year_return);
    const five = num(r.five_year_return);
    const missingReturns: ReturnPeriod[] = [];
    if (one === null) missingReturns.push("1y");
    if (three === null) missingReturns.push("3y");
    if (five === null) missingReturns.push("5y");
    const fund = {
      slug: r.slug, name: r.name, assetClass: r.asset_class, riskRating: r.risk_rating,
      subcategory: r.subcategory ?? undefined,
      oneYearReturn: one ?? 0,
      threeYearReturn: three === null ? 0 : annualise(three, 3),
      fiveYearReturn: five === null ? 0 : annualise(five, 5),
      missingReturns,
    } as Fund;
    const asOf = (r.price_date ?? new Date()).toISOString().slice(0, 10);
    const t = fitFund(fund, market, asOf);
    counts[t.quality ?? "none"]++;
    return { fund_slug: r.slug, weights: sql.json(t.weights as Record<string, number>), error_pp: t.errorPp, quality: t.quality, as_of: asOf };
  });
  if (results.length) {
    await sql`
      insert into fund_tracking ${sql(results, "fund_slug", "weights", "error_pp", "quality", "as_of")}
      on conflict (fund_slug) do update set
        weights = excluded.weights, error_pp = excluded.error_pp, quality = excluded.quality,
        as_of = excluded.as_of, fitted_at = now()`;
  }
  console.log(`fit: ${results.length} funds — close ${counts.close}, fair ${counts.fair}, rough ${counts.rough}, no history ${counts.none}`);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { max: 2, ssl: /sslmode=require/.test(url) ? "require" : false });
  try {
    const failed = await updatePrices(sql);
    if (failed === Object.keys(BENCHMARKS).length) throw new Error("every price download failed");
    await fitFunds(sql, await loadMarket(sql));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error("prices: failed —", error);
  process.exit(1);
});
