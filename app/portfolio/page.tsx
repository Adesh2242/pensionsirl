"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bell, Plus, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { useFunds } from "@/lib/hooks/use-funds";
import { listTrackedFunds, addTrackedFund, removeTrackedFund, markTrackedFundSeen } from "@/lib/portfolio/store";
import { monthsBetween, projectValue } from "@/lib/portfolio/projection";
import { formatEuro } from "@/lib/utils";
import type { Fund, TrackedFund } from "@/lib/types";

function Holding({
  tracked,
  fund,
  onRemove,
  onMarkSeen,
}: {
  tracked: TrackedFund;
  fund: Fund;
  onRemove: () => void;
  onMarkSeen: () => void;
}) {
  const now = new Date();
  const startedAt = new Date(tracked.startedAt);
  const monthsElapsed = monthsBetween(startedAt, now);
  const currentValue = projectValue({
    startValue: tracked.startValue,
    monthlyContribution: tracked.monthlyContribution,
    annualReturnPct: fund.oneYearReturn,
    amcPct: fund.amc,
    months: monthsElapsed,
  });
  const totalContributed = tracked.startValue + tracked.monthlyContribution * monthsElapsed;
  const growth = currentValue - totalContributed;
  const growthPct = totalContributed > 0 ? (growth / totalContributed) * 100 : 0;

  const monthsSinceSeen = monthsBetween(new Date(tracked.lastSeenAt), now);
  const hasAlert = monthsSinceSeen >= 1 && monthsElapsed >= 1;

  return (
    <Card>
      <CardContent className="pt-6">
        {hasAlert && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
            <div className="flex-1">
              <p className="font-medium text-blue-900 dark:text-blue-200">Monthly update</p>
              <p className="text-blue-800 dark:text-blue-300">
                {fund.name} is now estimated at <strong>{formatEuro(currentValue)}</strong>{" "}
                ({growth >= 0 ? "+" : ""}
                {growthPct.toFixed(1)}% vs. what you&apos;ve put in).
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-xs" onClick={onMarkSeen}>
              Got it
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{fund.providerName}</p>
            <Link href={`/funds/${fund.slug}`} className="font-semibold hover:underline">
              {fund.name}
            </Link>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <AssetClassBadge assetClass={fund.assetClass} />
            </div>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Stop tracking ${fund.name}`}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Estimated value</p>
            <p className="text-xl font-semibold">{formatEuro(currentValue)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Since you started</p>
            <p
              className={`flex items-center gap-1 text-xl font-semibold ${growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {growth >= 0 ? (
                <TrendingUp className="h-4 w-4" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4" aria-hidden />
              )}
              {growth >= 0 ? "+" : ""}
              {growthPct.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly contribution</p>
            <p className="text-xl font-semibold">{formatEuro(tracked.monthlyContribution)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Started {startedAt.toLocaleDateString("en-IE", { month: "short", year: "numeric" })} with{" "}
          {formatEuro(tracked.startValue)}. Projected using this fund&apos;s 1yr return, compounded
          monthly — an estimate, not your real statement value.
        </p>
      </CardContent>
    </Card>
  );
}

function AddHoldingDialog({
  open,
  onOpenChange,
  funds,
  excludeFundSlugs,
  defaultFundSlug,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funds: Fund[];
  excludeFundSlugs: Set<string>;
  defaultFundSlug?: string;
  onAdd: (input: { fundSlug: string; startValue: number; monthlyContribution: number }) => Promise<void>;
}) {
  const [fundSlug, setFundSlug] = useState(defaultFundSlug ?? "");
  const [startValue, setStartValue] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever the dialog transitions to open. Adjusting state
  // during render (rather than in an effect) avoids an extra render pass.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFundSlug(defaultFundSlug ?? "");
      setStartValue("");
      setMonthlyContribution("");
      setError(null);
    }
  }

  const availableFunds = funds.filter((f) => !excludeFundSlugs.has(f.slug) || f.slug === fundSlug);

  async function handleSubmit() {
    setError(null);
    const start = Number(startValue);
    const monthly = Number(monthlyContribution);
    if (!fundSlug) {
      setError("Choose a fund.");
      return;
    }
    if (!Number.isFinite(start) || start < 0) {
      setError("Enter a valid current value.");
      return;
    }
    if (!Number.isFinite(monthly) || monthly < 0) {
      setError("Enter a valid monthly contribution.");
      return;
    }
    setSaving(true);
    try {
      await onAdd({ fundSlug, startValue: start, monthlyContribution: monthly });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Track a fund</DialogTitle>
          <DialogDescription>
            We&apos;ll estimate its value each month from your contributions and the fund&apos;s
            return rate — not a live statement feed.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tf-fund">Fund</Label>
            <Select value={fundSlug} onValueChange={(v) => v && setFundSlug(v)}>
              <SelectTrigger id="tf-fund" className="w-full">
                <SelectValue placeholder="Choose a fund…" />
              </SelectTrigger>
              <SelectContent>
                {availableFunds.map((f) => (
                  <SelectItem key={f.slug} value={f.slug}>
                    {f.providerName} — {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-start">Current value (€)</Label>
            <Input
              id="tf-start"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="e.g. 15000"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tf-monthly">Monthly contribution (€)</Label>
            <Input
              id="tf-monthly"
              type="number"
              min="0"
              inputMode="decimal"
              placeholder="e.g. 300"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Adding…" : "Start tracking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, isMockMode } = useAuth();
  const { funds, source } = useFunds();
  const [tracked, setTracked] = useState<TrackedFund[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // useFunds() seeds with mock data before the live Supabase fetch resolves.
  // Tracking references funds by slug (see supabase/migrations/004_tracked_funds.sql),
  // and a slug picked from the mock catalog may not exist in the live one, so
  // tracking waits for live data. In permanent mock mode (no Supabase
  // configured) mock slugs are the only ones that will ever exist, so that
  // case is always ready.
  const fundsReady = isMockMode || source === "supabase";

  const prefillSlug = searchParams.get("add");
  const prefillFund =
    prefillSlug && fundsReady ? funds.find((f) => f.slug === prefillSlug) : undefined;

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    listTrackedFunds(supabase, user.id)
      .then(setTracked)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load your portfolio."));
  }, [user]);

  // Auto-open the add dialog once for a given prefill fund (render-time
  // adjustment, not an effect, so it doesn't cause an extra render pass).
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | undefined>(undefined);
  if (prefillFund && autoOpenedFor !== prefillFund.slug) {
    setAutoOpenedFor(prefillFund.slug);
    setDialogOpen(true);
  }

  const fundsBySlug = useMemo(() => new Map(funds.map((f) => [f.slug, f])), [funds]);

  async function handleAdd(input: { fundSlug: string; startValue: number; monthlyContribution: number }) {
    if (!user) return;
    const supabase = createClient();
    const record = await addTrackedFund(supabase, user.id, input);
    setTracked((prev) => [...(prev ?? []), record]);
    if (prefillSlug) router.replace("/portfolio");
  }

  async function handleRemove(id: string) {
    if (!user) return;
    const supabase = createClient();
    setTracked((prev) => (prev ?? []).filter((t) => t.id !== id));
    await removeTrackedFund(supabase, user.id, id).catch(() => {});
  }

  async function handleMarkSeen(id: string) {
    if (!user) return;
    const supabase = createClient();
    setTracked((prev) => (prev ?? []).map((t) => (t.id === id ? { ...t, lastSeenAt: new Date().toISOString() } : t)));
    await markTrackedFundSeen(supabase, user.id, id).catch(() => {});
  }

  if (authLoading || !user || tracked === null) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-muted-foreground">Loading…</div>;
  }

  const alertCount = tracked.filter((t) => {
    const months = monthsBetween(new Date(t.startedAt), new Date());
    const sinceSeen = monthsBetween(new Date(t.lastSeenAt), new Date());
    return months >= 1 && sinceSeen >= 1;
  }).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My portfolio</h1>
          <p className="mt-2 text-muted-foreground">
            Track funds you hold and get a monthly estimate of their value based on your
            contributions and each fund&apos;s return rate.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!fundsReady}>
          <Plus className="h-4 w-4" />
          Track a fund
        </Button>
      </div>

      {!fundsReady && (
        <p className="mt-2 text-xs text-muted-foreground">Loading live fund data…</p>
      )}

      {alertCount > 0 && (
        <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
          <Bell className="h-4 w-4" aria-hidden />
          {alertCount} {alertCount === 1 ? "holding has" : "holdings have"} a new monthly update
        </p>
      )}

      {loadError && <p className="mt-6 text-sm text-red-600">{loadError}</p>}

      {tracked.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Wallet className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-muted-foreground">
            You&apos;re not tracking any funds yet. Add one to get monthly value estimates.
          </p>
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)} disabled={!fundsReady}>
            Track your first fund
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {tracked.map((t) => {
            const fund = fundsBySlug.get(t.fundSlug);
            if (!fund) return null;
            return (
              <Holding
                key={t.id}
                tracked={t}
                fund={fund}
                onRemove={() => handleRemove(t.id)}
                onMarkSeen={() => handleMarkSeen(t.id)}
              />
            );
          })}
        </div>
      )}

      <AddHoldingDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && prefillSlug) router.replace("/portfolio");
        }}
        funds={funds}
        excludeFundSlugs={new Set(tracked.map((t) => t.fundSlug))}
        defaultFundSlug={prefillFund?.slug}
        onAdd={handleAdd}
      />
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioContent />
    </Suspense>
  );
}
