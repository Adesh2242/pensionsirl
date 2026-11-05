/** Holding rows from Postgres to TrackedFund. No server-only imports (used by scheduled jobs too). */
import type { TrackedFund } from "@/lib/types";

export interface HoldingRow {
  id: string;
  fund_slug: string;
  label: string | null;
  start_value: string;
  value_as_of: Date | string;
  monthly_contribution: string;
  employer_contribution: string;
  amc_pct: string | null;
  contribution_charge_pct: string;
  policy_fee: string;
  started_at: Date | string;
  last_seen_at: Date;
}

export const isoDate = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

export function toHolding(r: HoldingRow): TrackedFund {
  return {
    id: r.id,
    fundSlug: r.fund_slug,
    label: r.label ?? undefined,
    startValue: Number(r.start_value),
    valueAsOf: isoDate(r.value_as_of),
    monthlyContribution: Number(r.monthly_contribution),
    employerContribution: Number(r.employer_contribution),
    amcPct: r.amc_pct === null ? undefined : Number(r.amc_pct),
    contributionChargePct: Number(r.contribution_charge_pct),
    policyFee: Number(r.policy_fee),
    startedAt: isoDate(r.started_at),
    lastSeenAt: r.last_seen_at.toISOString(),
  };
}

export const HOLDING_COLUMNS = ["id", "fund_slug", "label", "start_value", "value_as_of", "monthly_contribution", "employer_contribution", "amc_pct", "contribution_charge_pct", "policy_fee", "started_at", "last_seen_at"];
