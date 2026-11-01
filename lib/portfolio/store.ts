"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/client";
import type { HoldingInput, TrackedFund } from "@/lib/types";

type Client = ReturnType<typeof createClient>;

const STORAGE_KEY = "pensioniq_mock_tracked_funds";

function readAll(): Record<string, TrackedFund[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<
      string,
      Partial<TrackedFund>[]
    >;
    // Records saved before holdings had an anchor date or an employer
    // contribution are upgraded on read, the same way migration 005 does.
    const upgraded: Record<string, TrackedFund[]> = {};
    for (const [userId, list] of Object.entries(raw)) {
      upgraded[userId] = list.map((t) => ({
        ...(t as TrackedFund),
        valueAsOf: t.valueAsOf ?? t.startedAt ?? new Date().toISOString().slice(0, 10),
        employerContribution: t.employerContribution ?? 0,
      }));
    }
    return upgraded;
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, TrackedFund[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface TrackedFundRow {
  id: string;
  fund_slug: string;
  label?: string | null;
  start_value: number;
  value_as_of?: string | null;
  monthly_contribution: number;
  employer_contribution?: number | null;
  started_at: string;
  last_seen_at: string;
}

function rowToTrackedFund(row: TrackedFundRow): TrackedFund {
  return {
    id: row.id,
    fundSlug: row.fund_slug,
    label: row.label ?? undefined,
    startValue: Number(row.start_value),
    valueAsOf: row.value_as_of ?? row.started_at,
    monthlyContribution: Number(row.monthly_contribution),
    employerContribution: Number(row.employer_contribution ?? 0),
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
  };
}

// Typed as plain strings so supabase-js returns untyped rows: the column set
// is chosen at runtime (see legacySchema), which its select parser can't follow.
const COLUMNS: string =
  "id, fund_slug, label, start_value, value_as_of, monthly_contribution, employer_contribution, started_at, last_seen_at";

/**
 * The 004 column set. Used until migration 005 has been applied to the
 * project, so deploying this code ahead of the migration never breaks the
 * portfolio page.
 */
const LEGACY_COLUMNS: string =
  "id, fund_slug, start_value, monthly_contribution, started_at, last_seen_at";

/** Set once a query reports the 005 columns missing; every later write then uses the 004 shape. */
let legacySchema = false;

/** Postgres 42703 is undefined_column; PostgREST reports a missing column as PGRST204. */
function isMissingColumn(error: { code?: string; message?: string }) {
  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /column .* does not exist|could not find the .* column/i.test(error.message ?? "")
  );
}

/**
 * Shapes a holding for the database. Without the 005 columns the employer
 * contribution is folded into monthly_contribution and the anchor date is
 * stored as started_at — the field 004's projection already anchors on — so
 * the estimate stays right even though the split and the label are lost.
 */
function toRow(input: HoldingInput) {
  if (legacySchema) {
    return {
      start_value: input.startValue,
      monthly_contribution: input.monthlyContribution + input.employerContribution,
      started_at: input.valueAsOf,
    };
  }
  return {
    label: input.label?.trim() || null,
    start_value: input.startValue,
    value_as_of: input.valueAsOf,
    monthly_contribution: input.monthlyContribution,
    employer_contribution: input.employerContribution,
  };
}

export async function listTrackedFunds(supabase: Client, userId: string): Promise<TrackedFund[]> {
  if ("isMock" in supabase) {
    return readAll()[userId] ?? [];
  }
  const client = supabase as SupabaseClient;
  let result = await client
    .from("tracked_funds")
    .select(legacySchema ? LEGACY_COLUMNS : COLUMNS)
    .order("created_at", { ascending: true });

  if (result.error && !legacySchema && isMissingColumn(result.error)) {
    legacySchema = true;
    result = await client
      .from("tracked_funds")
      .select(LEGACY_COLUMNS)
      .order("created_at", { ascending: true });
  }
  if (result.error) throw result.error;
  return ((result.data ?? []) as unknown as TrackedFundRow[]).map(rowToTrackedFund);
}

export async function addTrackedFund(
  supabase: Client,
  userId: string,
  input: HoldingInput,
): Promise<TrackedFund> {
  const now = new Date().toISOString();

  if ("isMock" in supabase) {
    const all = readAll();
    const existing = all[userId] ?? [];
    if (existing.some((t) => t.fundSlug === input.fundSlug)) {
      throw new Error("You're already tracking this fund.");
    }
    const record: TrackedFund = {
      id: newId(),
      fundSlug: input.fundSlug,
      label: input.label?.trim() || undefined,
      startValue: input.startValue,
      valueAsOf: input.valueAsOf,
      monthlyContribution: input.monthlyContribution,
      employerContribution: input.employerContribution,
      startedAt: now.slice(0, 10),
      lastSeenAt: now,
    };
    all[userId] = [...existing, record];
    writeAll(all);
    return record;
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from("tracked_funds")
    .insert({ user_id: userId, fund_slug: input.fundSlug, ...toRow(input) })
    .select(legacySchema ? LEGACY_COLUMNS : COLUMNS)
    .single();
  if (error) {
    throw new Error(error.code === "23505" ? "You're already tracking this fund." : error.message);
  }
  return rowToTrackedFund(data as unknown as TrackedFundRow);
}

/** Updates a holding's value, anchor date, contributions or label — e.g. from a new statement. */
export async function updateTrackedFund(
  supabase: Client,
  userId: string,
  id: string,
  input: HoldingInput,
): Promise<TrackedFund> {
  if ("isMock" in supabase) {
    const all = readAll();
    let updated: TrackedFund | undefined;
    all[userId] = (all[userId] ?? []).map((t) => {
      if (t.id !== id) return t;
      updated = {
        ...t,
        label: input.label?.trim() || undefined,
        startValue: input.startValue,
        valueAsOf: input.valueAsOf,
        monthlyContribution: input.monthlyContribution,
        employerContribution: input.employerContribution,
      };
      return updated;
    });
    if (!updated) throw new Error("That holding no longer exists.");
    writeAll(all);
    return updated;
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from("tracked_funds")
    .update(toRow(input))
    .eq("id", id)
    .select(legacySchema ? LEGACY_COLUMNS : COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return rowToTrackedFund(data as unknown as TrackedFundRow);
}

export async function removeTrackedFund(supabase: Client, userId: string, id: string): Promise<void> {
  if ("isMock" in supabase) {
    const all = readAll();
    all[userId] = (all[userId] ?? []).filter((t) => t.id !== id);
    writeAll(all);
    return;
  }
  const { error } = await (supabase as SupabaseClient).from("tracked_funds").delete().eq("id", id);
  if (error) throw error;
}

/** Records that the user has seen their portfolio's latest estimate, resetting "since your last visit". */
export async function markPortfolioSeen(supabase: Client, userId: string): Promise<string> {
  const now = new Date().toISOString();
  if ("isMock" in supabase) {
    const all = readAll();
    all[userId] = (all[userId] ?? []).map((t) => ({ ...t, lastSeenAt: now }));
    writeAll(all);
    return now;
  }
  // RLS scopes this to the signed-in user's own rows.
  const { error } = await (supabase as SupabaseClient)
    .from("tracked_funds")
    .update({ last_seen_at: now })
    .eq("user_id", userId);
  if (error) throw error;
  return now;
}
