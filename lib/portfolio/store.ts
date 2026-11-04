"use client";

import type { HoldingInput, TrackedFund } from "@/lib/types";

/**
 * Browser-side calls to the holdings API (app/api/holdings). The server
 * scopes every request to the signed-in user via the session cookie.
 */

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}

export async function listTrackedFunds(): Promise<TrackedFund[]> {
  return (await call<{ holdings: TrackedFund[] }>("/api/holdings")).holdings;
}

export async function addTrackedFund(input: HoldingInput): Promise<TrackedFund> {
  return (await call<{ holding: TrackedFund }>("/api/holdings", { method: "POST", body: JSON.stringify(input) })).holding;
}

/** Updates a holding's value, anchor date, contributions, charges or label — e.g. from a new statement. */
export async function updateTrackedFund(id: string, input: HoldingInput): Promise<TrackedFund> {
  return (
    await call<{ holding: TrackedFund }>(`/api/holdings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).holding;
}

export async function removeTrackedFund(id: string): Promise<void> {
  await call(`/api/holdings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Records that the user has seen their portfolio's latest estimate, resetting "since your last visit". */
export async function markPortfolioSeen(): Promise<string> {
  return (await call<{ seenAt: string }>("/api/holdings/seen", { method: "POST" })).seenAt;
}
