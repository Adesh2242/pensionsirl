-- 001_initial_schema.sql created scrape_log but never enabled RLS on it —
-- caught while wiring up the "fund data last updated" display, which reads
-- this table with the public anon key. Without RLS, an unauthenticated
-- client could also have inserted/updated/deleted rows (fake success
-- entries, wiped history). Only SELECT is opened up; writes stay
-- service_role-only (which bypasses RLS entirely, as scripts/scrape-funds.ts
-- already relies on).

alter table scrape_log enable row level security;

create policy "Scrape log is publicly readable" on scrape_log
  for select using (true);
