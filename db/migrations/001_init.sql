-- PensionIQ schema for a plain Postgres database (Railway).
--
-- Replaces the Supabase setup (supabase/migrations/001-006). Differences:
--   * users + sessions replace Supabase Auth (auth.users). Passwords migrated
--     from Supabase keep their bcrypt hash and are upgraded to scrypt the
--     next time that user logs in (see lib/auth/password.ts).
--   * No row-level security: browsers never talk to the database. Every
--     query runs on the server and is scoped to the signed-in user there
--     (lib/portfolio/repo.ts, app/api/**).
--   * profiles and saved_funds are dropped: neither was used.

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ── Accounts ────────────────────────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique check (char_length(email) <= 254),
  name text check (name is null or char_length(name) <= 100),
  -- scrypt$... for accounts created here, $2a$... (bcrypt) for ones migrated
  -- from Supabase until they next log in. Null for Google-only accounts.
  password_hash text,
  google_sub text unique,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- One row per signed-in browser. The cookie holds a random token; only its
-- SHA-256 is stored, so a leaked database can't be used to log in.
create table sessions (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_id_idx on sessions (user_id);
create index sessions_expires_at_idx on sessions (expires_at);

-- ── Fund catalogue (written by the weekly scrape) ─────────────────────
create table providers (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table funds (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  provider_slug text not null references providers (slug) on delete cascade,
  name text not null,
  asset_class text not null,
  risk_rating smallint not null check (risk_rating between 1 and 7),
  amc numeric(5, 2),
  subcategory text,
  sfdr_article smallint check (sfdr_article in (6, 8, 9)),
  manager text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funds_provider_slug_idx on funds (provider_slug);

-- Returns as published: 1 year is yearly, 3/5/10 years are cumulative
-- totals, annualised when read (lib/data/fund-repo.ts).
create table fund_prices (
  id bigint generated always as identity primary key,
  fund_id uuid not null references funds (id) on delete cascade,
  price_date date not null,
  nav numeric(12, 4),
  one_year_return numeric(6, 2),
  three_year_return numeric(6, 2),
  five_year_return numeric(6, 2),
  ten_year_return numeric(6, 2),
  unique (fund_id, price_date)
);
create index fund_prices_fund_id_date_idx on fund_prices (fund_id, price_date desc);

create view fund_prices_latest as
select distinct on (fund_id)
  fund_id, price_date, nav, one_year_return, three_year_return, five_year_return, ten_year_return
from fund_prices
order by fund_id, price_date desc;

create table scrape_log (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  funds_updated integer default 0,
  error text
);

-- ── Portfolio ─────────────────────────────────────────────────────────
create table tracked_funds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  fund_slug text not null references funds (slug) on delete cascade,
  label text check (label is null or char_length(label) <= 60),
  start_value numeric(12, 2) not null check (start_value >= 0),
  value_as_of date not null default current_date,
  monthly_contribution numeric(12, 2) not null default 0 check (monthly_contribution >= 0),
  employer_contribution numeric(12, 2) not null default 0 check (employer_contribution >= 0),
  amc_pct numeric(5, 2) check (amc_pct is null or (amc_pct >= 0 and amc_pct <= 10)),
  contribution_charge_pct numeric(5, 2) not null default 0
    check (contribution_charge_pct >= 0 and contribution_charge_pct <= 20),
  policy_fee numeric(10, 2) not null default 0 check (policy_fee >= 0 and policy_fee <= 10000),
  started_at date not null default current_date,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index tracked_funds_user_id_idx on tracked_funds (user_id);

-- ── Cookie-consent audit trail (salted IP hash, never the IP) ─────────
create table consent_log (
  id bigint generated always as identity primary key,
  user_id uuid references users (id) on delete set null,
  necessary boolean not null default true,
  analytics boolean not null default false,
  identifier_hash text not null,
  decided_at timestamptz not null default now()
);
create index consent_log_user_id_idx on consent_log (user_id);
