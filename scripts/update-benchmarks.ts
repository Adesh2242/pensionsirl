/**
 * Daily: fetches the index-ETF prices that portfolio estimates track and
 * stores them in benchmark_prices. Runs on Railway as the `prices` cron
 * service (`node dist/update-benchmarks.mjs`, weekdays after the European
 * close); locally `pnpm prices`. The first run backfills ten years.
 */
import postgres from "postgres";
import { BENCHMARKS } from "../lib/portfolio/market";
import { fetchDailyCloses } from "../lib/market/fetch-prices";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const sql = postgres(url, { max: 2, ssl: /sslmode=require/.test(url) ? "require" : false });
  let failed = 0;
  try {
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
  } finally {
    await sql.end({ timeout: 5 });
  }
  // Partial failures still store what they can; all failing is an error.
  if (failed === Object.keys(BENCHMARKS).length) process.exit(1);
}

main().catch((error) => {
  console.error("prices: failed —", error);
  process.exit(1);
});
