-- Each fund's fitted market blend (lib/portfolio/fit.ts): which index ETFs
-- its portfolio estimates follow, and how closely that blend matched the
-- fund's own 1/3/5-year returns. Rewritten daily by the price job.
create table fund_tracking (
  fund_slug text primary key references funds (slug) on delete cascade,
  weights jsonb not null,
  error_pp numeric(6, 2),
  quality text check (quality in ('close', 'fair', 'rough')),
  as_of date not null,
  fitted_at timestamptz not null default now()
);
