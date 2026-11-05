/**
 * Builds one user's portfolio report on the server and emails it as a PDF.
 * The same figures and the same PDF as the portfolio page's download:
 * holdings kept current with daily market prices, the projection, charges.
 *
 * Takes the database connection as an argument and imports nothing
 * server-only, so both the site ("send me one now") and the daily job
 * (scripts/send-reports.ts) use it.
 */
import type postgres from "postgres";
import { FUND_COLUMNS, mapFund, type FundRow } from "@/lib/data/fund-map";
import { HOLDING_COLUMNS, toHolding, type HoldingRow } from "@/lib/portfolio/holding-map";
import { BENCHMARKS, benchmarkFor, type BenchmarkId, type MarketData } from "@/lib/portfolio/market";
import { estimateHoldingValue, projectPortfolio, summarisePortfolio, type PortfolioSummary } from "@/lib/portfolio/projection";
import { buildPortfolioReport } from "@/lib/pdf/portfolio-report";
import { sendEmail } from "@/lib/email/send";
import { reportEmail } from "@/lib/email/templates";
import type { Frequency } from "@/lib/reports/schedule";

type Sql = ReturnType<typeof postgres>;

export interface BuiltReport {
  pdf: Buffer;
  summary: PortfolioSummary;
  holdings: number;
}

async function loadMarket(sql: Sql, from: string, ids: BenchmarkId[]): Promise<MarketData> {
  if (ids.length === 0) return {};
  const symbols = ids.map((id) => BENCHMARKS[id].symbol);
  const bySymbol = new Map<string, BenchmarkId>(ids.map((id) => [BENCHMARKS[id].symbol, id]));
  const rows = await sql<{ symbol: string; price_date: Date; close: string }[]>`
    select symbol, price_date, close from benchmark_prices
    where price_date >= (${from}::date - interval '7 days') and symbol = any(${symbols})
    order by symbol, price_date`;
  const market: MarketData = {};
  for (const r of rows) {
    const id = bySymbol.get(r.symbol)!;
    const series = (market[id] ??= { dates: [], closes: [] });
    series.dates.push(r.price_date.toISOString().slice(0, 10));
    series.closes.push(Number(r.close));
  }
  return market;
}

/** The report PDF for one user, or null when they have no holdings. */
export async function buildReportFor(
  sql: Sql,
  user: { id: string; name: string | null },
  options: { horizon: number; real: boolean; now: Date },
): Promise<BuiltReport | null> {
  const holdings = (await sql<HoldingRow[]>`
    select ${sql(HOLDING_COLUMNS)} from tracked_funds where user_id = ${user.id} order by created_at`).map(toHolding);
  if (holdings.length === 0) return null;
  const slugs = [...new Set(holdings.map((h) => h.fundSlug))];
  const [fundRows, scrape] = await Promise.all([
    sql<FundRow[]>`select ${sql.unsafe(FUND_COLUMNS)} where f.slug = any(${slugs})`,
    sql<{ finished_at: Date }[]>`select finished_at from scrape_log where status = 'success' order by finished_at desc limit 1`,
  ]);
  const funds = new Map(fundRows.map((r) => [r.slug, mapFund(r)]));
  const known = holdings.filter((h) => funds.has(h.fundSlug));
  if (known.length === 0) return null;

  const ids = new Set<BenchmarkId>();
  for (const h of known) for (const id of Object.keys(benchmarkFor(funds.get(h.fundSlug)!))) ids.add(id as BenchmarkId);
  const from = known.flatMap((h) => [h.valueAsOf, h.lastSeenAt.slice(0, 10)]).sort()[0];
  const market = await loadMarket(sql, from, [...ids]);

  const { now, horizon, real } = options;
  const positions = known.map((holding) => {
    const fund = funds.get(holding.fundSlug)!;
    return { holding, fund, valueNow: estimateHoldingValue(holding, fund, now, market) };
  });
  const summary = summarisePortfolio(positions, now, market);
  const projection = projectPortfolio(positions, { years: horizon, now, real });
  const report = buildPortfolioReport({
    positions,
    summary,
    projection,
    horizon,
    real,
    now,
    lastScrapeTime: scrape[0]?.finished_at.toISOString() ?? null,
    name: user.name,
  });
  return { pdf: Buffer.from(report.output()), summary, holdings: positions.length };
}

export type SendResult = { sent: true; id: string } | { sent: false; reason: "no-holdings" };

/**
 * Builds and emails one user's report. `idempotencyKey` stops a retried
 * send (job restart, double click) going out twice.
 */
export async function sendReportTo(
  sql: Sql,
  input: {
    user: { id: string; email: string; name: string | null };
    horizon: number;
    real: boolean;
    now: Date;
    siteUrl: string;
    /** Absent for a one-off "send me one now". */
    frequency?: Frequency;
    unsubscribeToken?: string;
    idempotencyKey: string;
  },
): Promise<SendResult> {
  const built = await buildReportFor(sql, input.user, input);
  if (!built) return { sent: false, reason: "no-holdings" };
  const date = input.now.toISOString().slice(0, 10);
  // The footer link opens a page with a button; mail apps' one-click
  // unsubscribe (RFC 8058) POSTs straight to the API.
  const token = input.unsubscribeToken ? encodeURIComponent(input.unsubscribeToken) : null;
  const unsubscribeUrl = token ? `${input.siteUrl}/unsubscribe?token=${token}` : undefined;
  const oneClickUrl = token ? `${input.siteUrl}/api/reports/unsubscribe?token=${token}` : undefined;
  const message = reportEmail({
    name: input.user.name,
    summary: built.summary,
    holdings: built.holdings,
    now: input.now,
    siteUrl: input.siteUrl,
    frequency: input.frequency,
    unsubscribeUrl,
  });
  const { id } = await sendEmail({
    to: input.user.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    attachments: [{ filename: `pensioniq-portfolio-report-${date}.pdf`, content: built.pdf.toString("base64") }],
    headers: oneClickUrl
      ? { "List-Unsubscribe": `<${oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
      : undefined,
    idempotencyKey: input.idempotencyKey,
  });
  return { sent: true, id };
}
