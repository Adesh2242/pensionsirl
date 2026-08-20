-- Lets a signed-in user track a fund holding (a starting value + monthly
-- contribution) so the app can project its current value and surface a
-- monthly "your pot is now worth ~X" alert. Current value is computed
-- client-side from the fund's return rate rather than stored, so all this
-- table holds is the inputs plus when the user last saw an update.
--
-- Keyed by fund_slug, not a fund uuid: lib/types.ts's Fund.id is always the
-- fund's slug (see mapFund() in lib/supabase/funds-queries.ts and the mock
-- dataset), never the funds table's internal id column — the client never
-- has that uuid to hand. Slug is already the app's canonical fund
-- identifier everywhere else (routing, /compare?funds=slug1,slug2), so this
-- follows the same convention instead of introducing a second identifier.
--
-- References auth.users directly, not profiles(id) — profiles is defined
-- above but nothing in the app ever inserts into it (no signup trigger), so
-- an FK to profiles would reject every real user.

create table if not exists tracked_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  fund_slug text not null references funds (slug) on delete cascade,
  start_value numeric(12, 2) not null check (start_value >= 0),
  monthly_contribution numeric(12, 2) not null default 0 check (monthly_contribution >= 0),
  started_at date not null default current_date,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, fund_slug)
);

create index if not exists tracked_funds_user_id_idx on tracked_funds (user_id);

alter table tracked_funds enable row level security;

create policy "Users can view their own tracked funds" on tracked_funds
  for select using (auth.uid() = user_id);

create policy "Users can insert their own tracked funds" on tracked_funds
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own tracked funds" on tracked_funds
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own tracked funds" on tracked_funds
  for delete using (auth.uid() = user_id);
