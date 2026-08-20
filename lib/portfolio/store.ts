"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/client";
import type { TrackedFund } from "@/lib/types";

type Client = ReturnType<typeof createClient>;

const STORAGE_KEY = "pensioniq_mock_tracked_funds";

function readAll(): Record<string, TrackedFund[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
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
  start_value: number;
  monthly_contribution: number;
  started_at: string;
  last_seen_at: string;
}

function rowToTrackedFund(row: TrackedFundRow): TrackedFund {
  return {
    id: row.id,
    fundSlug: row.fund_slug,
    startValue: row.start_value,
    monthlyContribution: row.monthly_contribution,
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
  };
}

const SELECT_COLUMNS = "id, fund_slug, start_value, monthly_contribution, started_at, last_seen_at";

export async function listTrackedFunds(supabase: Client, userId: string): Promise<TrackedFund[]> {
  if ("isMock" in supabase) {
    return readAll()[userId] ?? [];
  }
  const { data, error } = await (supabase as SupabaseClient)
    .from("tracked_funds")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as TrackedFundRow[]).map(rowToTrackedFund);
}

export async function addTrackedFund(
  supabase: Client,
  userId: string,
  input: { fundSlug: string; startValue: number; monthlyContribution: number },
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
      startValue: input.startValue,
      monthlyContribution: input.monthlyContribution,
      startedAt: now.slice(0, 10),
      lastSeenAt: now,
    };
    all[userId] = [...existing, record];
    writeAll(all);
    return record;
  }

  const { data, error } = await (supabase as SupabaseClient)
    .from("tracked_funds")
    .insert({
      user_id: userId,
      fund_slug: input.fundSlug,
      start_value: input.startValue,
      monthly_contribution: input.monthlyContribution,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) {
    throw new Error(error.code === "23505" ? "You're already tracking this fund." : error.message);
  }
  return rowToTrackedFund(data as TrackedFundRow);
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

/** Marks a holding's alert as acknowledged, so the monthly banner clears until the next month passes. */
export async function markTrackedFundSeen(supabase: Client, userId: string, id: string): Promise<void> {
  const now = new Date().toISOString();
  if ("isMock" in supabase) {
    const all = readAll();
    all[userId] = (all[userId] ?? []).map((t) => (t.id === id ? { ...t, lastSeenAt: now } : t));
    writeAll(all);
    return;
  }
  const { error } = await (supabase as SupabaseClient)
    .from("tracked_funds")
    .update({ last_seen_at: now })
    .eq("id", id);
  if (error) throw error;
}
