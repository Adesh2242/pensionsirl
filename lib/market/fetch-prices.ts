/**
 * Fetches daily adjusted closes for one ETF from Yahoo Finance's public
 * chart endpoint (no key needed; unofficial, so the job tolerates it being
 * slow, changed or down — estimates then fall back to yearly returns).
 * Plain Node, no "server-only": bundled into the price job.
 */
export interface DailyClose {
  date: string;
  close: number;
}

export async function fetchDailyCloses(symbol: string, range: "1mo" | "1y" | "5y" | "10y"): Promise<DailyClose[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=1d&events=div`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PensionIQ price job)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = (await res.json()) as {
    chart?: {
      result?: {
        meta?: { currency?: string };
        timestamp?: number[];
        indicators?: { quote?: { close?: (number | null)[] }[]; adjclose?: { adjclose?: (number | null)[] }[] };
      }[];
    };
  };
  const result = json.chart?.result?.[0];
  if (!result?.timestamp) throw new Error(`${symbol}: no data`);
  if (result.meta?.currency && result.meta.currency !== "EUR") throw new Error(`${symbol}: priced in ${result.meta.currency}, not EUR`);
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose;
  const raw = result.indicators?.quote?.[0]?.close;
  const closes = adjusted ?? raw ?? [];
  const out: DailyClose[] = [];
  result.timestamp.forEach((t, i) => {
    const close = closes[i];
    if (typeof close === "number" && Number.isFinite(close) && close > 0) {
      out.push({ date: new Date(t * 1000).toISOString().slice(0, 10), close: Math.round(close * 1e6) / 1e6 });
    }
  });
  // One row per day (the live session can repeat the last date).
  return [...new Map(out.map((d) => [d.date, d])).values()];
}
