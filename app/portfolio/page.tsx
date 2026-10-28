"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bell, TrendingDown, TrendingUp, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { PageIntro } from "@/components/editorial/page-intro";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="border-t border-border py-8">
      <div>
        {hasAlert && (
          <div className="mb-6 flex items-start gap-3 border-l border-primary pl-4 text-sm">
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div className="flex-1">
              <p className="lower font-mono text-xs text-primary">monthly update</p>
              <p className="lower mt-1.5 text-sm text-muted-foreground">
                {fund.name} is now estimated at <strong>{formatEuro(currentValue)}</strong>{" "}
                ({growth >= 0 ? "+" : ""}
                {growthPct.toFixed(1)}% vs. what you&apos;ve put in).
              </p>
            </div>
            <button
              onClick={onMarkSeen}
              className="lower link-underline shrink-0 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              got it
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href={`/funds/${fund.slug}`}
              className="lower font-heading text-xl tracking-tight transition-colors hover:text-primary md:text-2xl"
            >
              {fund.name}
            </Link>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              <span className="lower font-mono text-xs text-muted-foreground">
                {fund.providerName}
              </span>
              <AssetClassBadge assetClass={fund.assetClass} />
            </div>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Stop tracking ${fund.name}`}
            className="p-1 text-muted-foreground transition-colors hover:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6 border-t border-border pt-5 text-sm">
          <div>
            <p className="lower font-mono text-xs text-muted-foreground">estimated value</p>
            <p className="tabular mt-2 font-heading text-xl">{formatEuro(currentValue)}</p>
          </div>
          <div>
            <p className="lower font-mono text-xs text-muted-foreground">since you started</p>
            <p
              className={`tabular mt-2 flex items-center gap-1 font-heading text-xl ${growth >= 0 ? "text-success" : "text-destructive"}`}
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
            <p className="lower font-mono text-xs text-muted-foreground">monthly contribution</p>
            <p className="tabular mt-2 font-heading text-xl">
              {formatEuro(tracked.monthlyContribution)}
            </p>
          </div>
        </div>
        <p className="lower mt-5 font-mono text-xs leading-relaxed text-muted-foreground">
          started {startedAt.toLocaleDateString("en-IE", { month: "short", year: "numeric" }).toLowerCase()} with{" "}
          {formatEuro(tracked.startValue)}. projected using this fund&apos;s 1yr return, compounded
          monthly — an estimate, not your real statement value.
        </p>
      </div>
    </div>
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
              <SelectTrigger id="tf-fund" className="h-10 w-full">
                {/* Render the fund's name, not its slug, for the selected value. */}
                <SelectValue placeholder="Choose a fund…">
                  {(value: string) => {
                    const selected = funds.find((f) => f.slug === value);
                    return selected ? `${selected.providerName} — ${selected.name}` : value;
                  }}
                </SelectValue>
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
              className="tabular h-10"
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
              className="tabular h-10"
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
    return (
      <div className="container-page max-w-4xl px-6 py-32 md:px-10">
        <p className="lower font-mono text-xs text-muted-foreground">loading your portfolio…</p>
        <Skeleton className="mt-8 h-40 rounded-none" />
        <Skeleton className="mt-px h-40 rounded-none" />
      </div>
    );
  }

  const alertCount = tracked.filter((t) => {
    const months = monthsBetween(new Date(t.startedAt), new Date());
    const sinceSeen = monthsBetween(new Date(t.lastSeenAt), new Date());
    return months >= 1 && sinceSeen >= 1;
  }).length;

  return (
    <>
      <PageIntro
        label="portfolio"
        lines={["what you hold,", "what it's worth."]}
        tone="slate"
        corners={{ left: "monthly estimates", right: "not a statement feed" }}
        lead="track the funds you hold and get a monthly estimate of their value from your contributions and each fund's return rate."
      >
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <button
            onClick={() => setDialogOpen(true)}
            disabled={!fundsReady}
            className="lower pill inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary disabled:opacity-50"
          >
            track a fund <span aria-hidden>↗</span>
          </button>
          {alertCount > 0 && (
            <span className="lower inline-flex items-center gap-2 font-mono text-xs text-primary">
              <Bell className="h-3.5 w-3.5" aria-hidden />
              {alertCount} {alertCount === 1 ? "holding has" : "holdings have"} a new update
            </span>
          )}
        </div>
      </PageIntro>

      <div className="container-page max-w-4xl px-6 py-14 md:px-10 md:py-20">
      {!fundsReady && (
        <p className="lower mb-6 font-mono text-xs text-muted-foreground">loading live fund data…</p>
      )}

      {loadError && (
        <p className="lower mb-6 font-mono text-xs text-destructive">{loadError}</p>
      )}

      {tracked.length === 0 ? (
        <div className="border-t border-border py-24 text-center">
          <Wallet className="mx-auto h-6 w-6 text-primary" aria-hidden />
          <p className="lower mt-6 font-heading text-3xl">nothing tracked yet.</p>
          <p className="lower mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
            add a fund to get a monthly estimate of what your contributions are worth.
          </p>
          <button
            onClick={() => setDialogOpen(true)}
            disabled={!fundsReady}
            className="lower link-underline mt-6 font-mono text-xs text-primary disabled:opacity-50"
          >
            track your first fund ↗
          </button>
        </div>
      ) : (
        <div>
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
    </>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense>
      <PortfolioContent />
    </Suspense>
  );
}
