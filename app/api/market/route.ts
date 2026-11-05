import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { BENCHMARKS, type BenchmarkId, type MarketData } from "@/lib/portfolio/market";

export const dynamic = "force-dynamic";

const SYMBOL_TO_ID = new Map<string, BenchmarkId>(
  (Object.entries(BENCHMARKS) as [BenchmarkId, { symbol: string }][]).map(([id, b]) => [b.symbol, id]),
);

/**
 * Daily closes of the tracked index ETFs from `from` (YYYY-MM-DD, at most
 * ten years back) to today. Public market data, cached at the edge.
 */
export async function GET(request: Request) {
  if (!sql) return NextResponse.json({ market: {} });
  const requested = new URL(request.url).searchParams.get("from") ?? "";
  const tenYearsAgo = new Date(Date.now() - 3653 * 86_400_000).toISOString().slice(0, 10);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested > tenYearsAgo ? requested : tenYearsAgo;
  // A day earlier, so the first day's move has a starting price.
  const rows = await sql<{ symbol: string; price_date: Date; close: string }[]>`
    select symbol, price_date, close from benchmark_prices
    where price_date >= (${from}::date - interval '7 days')
    order by symbol, price_date`;
  const market: MarketData = {};
  for (const r of rows) {
    const id = SYMBOL_TO_ID.get(r.symbol);
    if (!id) continue;
    const series = (market[id] ??= { dates: [], closes: [] });
    series.dates.push(r.price_date.toISOString().slice(0, 10));
    series.closes.push(Number(r.close));
  }
  return NextResponse.json(
    { market },
    { headers: { "Cache-Control": "public, max-age=900, stale-while-revalidate=3600" } },
  );
}
