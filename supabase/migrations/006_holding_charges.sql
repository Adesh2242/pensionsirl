-- What each holding costs, as the user's statement shows it.
--
-- The live fund source (National Pension Helpline) publishes no charges, and
-- charges are set per policy rather than per fund anyway: the same fund can
-- cost 0.75% a year in one scheme and 1.5% in another. So they live on the
-- holding.
--
-- amc_pct                  annual management charge, % of the pot a year.
--                          null = not entered; the app falls back to the
--                          fund's published charge, then a typical 1%.
-- contribution_charge_pct  % taken off each contribution before it is
--                          invested (an "allocation rate" of 95% is a 5%
--                          contribution charge).
-- policy_fee               flat yearly fee in euros, if the policy has one.
--
-- The app tolerates this migration not having been applied yet: without
-- these columns lib/portfolio/store.ts saves holdings without charges.

alter table tracked_funds
  add column if not exists amc_pct numeric(5, 2)
    check (amc_pct is null or (amc_pct >= 0 and amc_pct <= 10)),
  add column if not exists contribution_charge_pct numeric(5, 2) not null default 0
    check (contribution_charge_pct >= 0 and contribution_charge_pct <= 20),
  add column if not exists policy_fee numeric(10, 2) not null default 0
    check (policy_fee >= 0 and policy_fee <= 10000);
