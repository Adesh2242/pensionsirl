-- PensionIQ target production schema.
-- Not yet applied to any project — the app currently runs entirely on
-- lib/mock-data.ts and a localStorage-backed auth mock (see README.md).
-- Run this once a real Supabase project exists: `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Providers & funds (populated by the future scrape-funds edge function)
-- ---------------------------------------------------------------------------

create table if not exists providers (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists funds (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  provider_slug text not null references providers (slug) on delete cascade,
  name text not null,
  asset_class text not null,
  risk_rating smallint not null check (risk_rating between 1 and 7),
  amc numeric(5, 2) not null,
  sfdr_article smallint check (sfdr_article in (6, 8, 9)),
  manager text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists funds_provider_slug_idx on funds (provider_slug);
create index if not exists funds_asset_class_idx on funds (asset_class);

create table if not exists fund_prices (
  id bigint generated always as identity primary key,
  fund_id uuid not null references funds (id) on delete cascade,
  price_date date not null,
  nav numeric(12, 4) not null,
  one_year_return numeric(6, 2),
  three_year_return numeric(6, 2),
  five_year_return numeric(6, 2),
  unique (fund_id, price_date)
);

create index if not exists fund_prices_fund_id_date_idx on fund_prices (fund_id, price_date desc);

create table if not exists scrape_log (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  funds_updated integer default 0,
  error text
);

-- ---------------------------------------------------------------------------
-- User data
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text,
  date_of_birth date,
  created_at timestamptz not null default now()
);

create table if not exists saved_funds (
  user_id uuid not null references profiles (id) on delete cascade,
  fund_id uuid not null references funds (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, fund_id)
);

-- Consent changes are logged with a hashed identifier, never a raw IP, per
-- the GDPR approach described in README.md.
create table if not exists consent_log (
  id bigint generated always as identity primary key,
  user_id uuid references profiles (id) on delete set null,
  necessary boolean not null default true,
  analytics boolean not null default false,
  identifier_hash text not null,
  decided_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table providers enable row level security;
alter table funds enable row level security;
alter table fund_prices enable row level security;
alter table profiles enable row level security;
alter table saved_funds enable row level security;
alter table consent_log enable row level security;

create policy "Providers are publicly readable" on providers
  for select using (true);

create policy "Funds are publicly readable" on funds
  for select using (true);

create policy "Fund prices are publicly readable" on fund_prices
  for select using (true);

create policy "Users can view their own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid() = id);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can manage their own saved funds" on saved_funds
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can view their own consent history" on consent_log
  for select using (auth.uid() = user_id);

create policy "Users can insert their own consent record" on consent_log
  for insert with check (auth.uid() = user_id or user_id is null);

-- ---------------------------------------------------------------------------
-- Scheduled scrape (disabled by default — enable once pg_cron is available)
-- ---------------------------------------------------------------------------

-- select cron.schedule(
--   'scrape-funds-daily',
--   '0 6 * * *',
--   $$select net.http_post(
--     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/scrape-funds',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
--   )$$
-- );
