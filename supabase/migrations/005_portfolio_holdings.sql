-- Turns a tracked fund into a proper portfolio holding.
--
-- start_value keeps its name but changes meaning slightly: it is now "the
-- holding's value on value_as_of", not "the value when tracking began". A
-- user re-anchors a holding by entering the figure from a new statement,
-- which resets start_value + value_as_of; the app then estimates the value
-- forward from that anchor using the fund's return rate. started_at still
-- records when tracking first began.
--
-- employer_contribution is split out from monthly_contribution (which stays
-- the member's own payment) because they behave differently in Irish
-- pensions: only personal contributions attract income-tax relief, and
-- people want to see what their employer is putting in.
--
-- label lets a user name a holding ("work pension", "prsa", "avc"), since
-- most people hold more than one scheme — and the same fund can sit in
-- several of them (a provider's default fund in both a work pension and an
-- AVC), so one-holding-per-fund is dropped too.
--
-- The app tolerates this migration not having been applied yet: if these
-- columns are missing, lib/portfolio/store.ts falls back to the 004 columns
-- (folding employer into monthly_contribution and anchoring on started_at).

alter table tracked_funds
  add column if not exists label text check (label is null or char_length(label) <= 60),
  add column if not exists value_as_of date,
  add column if not exists employer_contribution numeric(12, 2) not null default 0
    check (employer_contribution >= 0);

-- Existing holdings were anchored on the day tracking began.
update tracked_funds set value_as_of = started_at where value_as_of is null;

alter table tracked_funds alter column value_as_of set default current_date;
alter table tracked_funds alter column value_as_of set not null;

-- 004 declared unique (user_id, fund_slug) inline, which Postgres names
-- <table>_<columns>_key.
alter table tracked_funds drop constraint if exists tracked_funds_user_id_fund_slug_key;
