import "server-only";
import { requireSql } from "@/lib/db";
import type { HoldingInput, TrackedFund } from "@/lib/types";

/**
 * Portfolio holdings in Postgres. Every query is filtered by the signed-in
 * user's id — the job row-level security did on Supabase — so one account
 * can never read or change another's holdings.
 */

interface Row {
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

const isoDate = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10));

function toHolding(r: Row): TrackedFund {
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

const COLUMNS = ["id", "fund_slug", "label", "start_value", "value_as_of", "monthly_contribution", "employer_contribution", "amc_pct", "contribution_charge_pct", "policy_fee", "started_at", "last_seen_at"];

export async function listHoldings(userId: string): Promise<TrackedFund[]> {
  const sql = requireSql();
  const rows = await sql<Row[]>`select ${sql(COLUMNS)} from tracked_funds where user_id = ${userId} order by created_at`;
  return rows.map(toHolding);
}

function values(input: HoldingInput) {
  return {
    label: input.label?.trim() || null,
    start_value: input.startValue,
    value_as_of: input.valueAsOf,
    monthly_contribution: input.monthlyContribution,
    employer_contribution: input.employerContribution,
    amc_pct: input.amcPct ?? null,
    contribution_charge_pct: input.contributionChargePct ?? 0,
    policy_fee: input.policyFee ?? 0,
  };
}

export async function addHolding(userId: string, input: HoldingInput): Promise<TrackedFund> {
  const sql = requireSql();
  const row = { user_id: userId, fund_slug: input.fundSlug, ...values(input) };
  const [created] = await sql<Row[]>`insert into tracked_funds ${sql(row)} returning ${sql(COLUMNS)}`;
  return toHolding(created);
}

export async function updateHolding(userId: string, id: string, input: HoldingInput): Promise<TrackedFund | null> {
  const sql = requireSql();
  const [updated] = await sql<Row[]>`
    update tracked_funds set ${sql(values(input))}
    where id = ${id} and user_id = ${userId}
    returning ${sql(COLUMNS)}`;
  return updated ? toHolding(updated) : null;
}

export async function removeHolding(userId: string, id: string): Promise<boolean> {
  const sql = requireSql();
  const result = await sql`delete from tracked_funds where id = ${id} and user_id = ${userId}`;
  return result.count > 0;
}

export async function markSeen(userId: string): Promise<string> {
  const sql = requireSql();
  const now = new Date();
  await sql`update tracked_funds set last_seen_at = ${now} where user_id = ${userId}`;
  return now.toISOString();
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

/**
 * Checks a holding from the browser, field by field, against the same
 * limits as the database constraints. Returns the cleaned input or the
 * first problem.
 */
export function parseHoldingInput(body: unknown): { input: HoldingInput } | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid holding." };
  const b = body as Record<string, unknown>;
  const money = (v: unknown, max = 100_000_000) =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v * 100) / 100 : null;
  const fundSlug = typeof b.fundSlug === "string" && b.fundSlug.length <= 200 ? b.fundSlug : null;
  const valueAsOf = typeof b.valueAsOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.valueAsOf) ? b.valueAsOf : null;
  const startValue = money(b.startValue);
  const monthly = money(b.monthlyContribution, 1_000_000);
  const employer = money(b.employerContribution ?? 0, 1_000_000);
  const amc = b.amcPct === undefined || b.amcPct === null ? undefined : money(b.amcPct, 10);
  const cc = money(b.contributionChargePct ?? 0, 20);
  const fee = money(b.policyFee ?? 0, 10_000);
  const label = typeof b.label === "string" ? b.label.trim().slice(0, 60) : undefined;

  if (!fundSlug) return { error: "Choose a fund." };
  if (startValue === null) return { error: "Enter a valid value." };
  if (!valueAsOf || Number.isNaN(Date.parse(valueAsOf))) return { error: "Enter the date of that value." };
  if (valueAsOf > new Date().toISOString().slice(0, 10)) return { error: "The value date can't be in the future." };
  if (monthly === null || employer === null) return { error: "Enter valid contributions." };
  if (amc === null) return { error: "The annual charge should be between 0% and 10%." };
  if (cc === null) return { error: "The contribution charge should be between 0% and 20%." };
  if (fee === null) return { error: "Enter a valid policy fee." };
  return {
    input: {
      fundSlug,
      label: label || undefined,
      startValue,
      valueAsOf,
      monthlyContribution: monthly,
      employerContribution: employer,
      amcPct: amc,
      contributionChargePct: cc,
      policyFee: fee,
    },
  };
}
