-- Adjustments needed to land real scraped data (see scripts/scrape-funds.ts):
-- the National Pension Helpline fund tables expose 1yr/5yr/10yr returns and a
-- risk/category/subcategory breakdown, but no published AMC — so `amc`
-- becomes nullable rather than assuming every fund has a disclosed charge.

alter table funds alter column amc drop not null;
alter table funds add column if not exists subcategory text;

alter table fund_prices add column if not exists ten_year_return numeric(6, 2);
alter table fund_prices alter column three_year_return set default null;
comment on column fund_prices.three_year_return is
  'Not published by the scrape source (National Pension Helpline shows 1Y/5Y/10Y only); when set, treat as interpolated, not observed.';

-- NAV isn't published by the scrape source either — only returns are.
alter table fund_prices alter column nav drop not null;

-- Exposes each fund's most recent fund_prices row, so the app can query
-- "current" figures with a simple join instead of a per-fund subquery.
create or replace view fund_prices_latest
with (security_invoker = true) as
select distinct on (fund_id)
  fund_id,
  price_date,
  nav,
  one_year_return,
  three_year_return,
  five_year_return,
  ten_year_return
from fund_prices
order by fund_id, price_date desc;
