-- Emailed portfolio reports.
--
-- Reports go only to an address the user has proved they own: Google
-- sign-ins are verified by Google; password accounts click a link.
alter table users add column email_verified_at timestamptz;
update users set email_verified_at = coalesce(last_login_at, created_at) where google_sub is not null;

-- One-time email links (verification). Only the SHA-256 of the token is
-- stored, as with sessions.
create table email_tokens (
  token_hash text primary key,
  user_id uuid not null references users (id) on delete cascade,
  purpose text not null check (purpose in ('verify')),
  email citext not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index email_tokens_user_id_idx on email_tokens (user_id);

-- A user's report schedule. Deleted with the account; "off" deletes the row.
create table report_schedules (
  user_id uuid primary key references users (id) on delete cascade,
  frequency text not null check (frequency in ('monthly', 'quarterly', 'yearly')),
  -- The projection the report shows, as chosen on the portfolio page.
  horizon smallint not null default 20 check (horizon in (10, 20, 30)),
  real boolean not null default false,
  next_send_on date not null,
  -- Carried by the unsubscribe link in every email. Stored as-is: it can
  -- only turn these emails off, and old emails' links must keep working.
  unsubscribe_token text not null unique,
  last_sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index report_schedules_next_send_on_idx on report_schedules (next_send_on);
