-- Daily closing prices of the index ETFs that portfolio estimates track
-- (lib/portfolio/market.ts). Written by scripts/update-benchmarks.ts.
-- Adjusted closes, so distributing ETFs include their dividends.
create table benchmark_prices (
  symbol text not null,
  price_date date not null,
  close numeric(14, 6) not null check (close > 0),
  primary key (symbol, price_date)
);
