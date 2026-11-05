"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageIntro } from "@/components/editorial/page-intro";
import { SectionLabel } from "@/components/editorial/section-label";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { HoldingDialog } from "@/components/portfolio/holding-dialog";
import { PortfolioChart } from "@/components/portfolio/portfolio-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { useFunds } from "@/lib/hooks/use-funds";
import { useMarket } from "@/lib/hooks/use-market";
import { benchmarkFor, marketAsOf, type MarketData } from "@/lib/portfolio/market";
import {
  addTrackedFund,
  listTrackedFunds,
  markPortfolioSeen,
  removeTrackedFund,
  updateTrackedFund,
} from "@/lib/portfolio/store";
import {
  ASSUMED_AMC_PCT,
  INFLATION_PCT,
  RISK_SPREAD_PER_POINT,
  chargesFor,
  type HoldingCharges,
  daysSince,
  estimateHoldingValue,
  growthAssumption,
  type ChargesBreakdown,
  type GrowthAssumption,
  trackingFor,
  projectPortfolio,
  summarisePortfolio,
  totalMonthly,
} from "@/lib/portfolio/projection";
import { formatEuro, formatLastUpdated } from "@/lib/utils";
import { loginHref } from "@/lib/safe-next";
import { csvFileName, downloadCsv } from "@/lib/csv";
import { portfolioCsvRows } from "@/lib/portfolio/export";
import { Disclaimer } from "@/components/legal/disclaimer";
import { ExportButtons } from "@/components/legal/export-buttons";
import type { AssetClass, Fund, HoldingInput, TrackedFund } from "@/lib/types";

const HORIZONS = [10, 20, 30] as const;

// Matches the dot colours in AssetClassBadge, so the allocation bar and the
// badges read as one key.
const CLASS_FILL: Record<AssetClass, string> = {
  Equity: "bg-primary",
  Bond: "bg-slate",
  Cash: "bg-success",
  Property: "bg-sun",
  "Multi-Asset": "bg-warm",
  Lifecycle: "bg-[#9b8ad1]",
  Alternative: "bg-[#c77d9b]",
};

function formatDate(iso: string | Date, withDay = false) {
  return new Date(iso)
    .toLocaleDateString("en-IE", {
      day: withDay ? "numeric" : undefined,
      month: "short",
      year: "numeric",
    })
    .toLowerCase();
}

function signed(value: number) {
  return `${value >= 0 ? "+" : "−"}${formatEuro(Math.abs(value))}`;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`lower rounded-full border px-4 py-1.5 font-mono text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

type Position = { holding: TrackedFund; fund: Fund; valueNow: number };

/** "projected at its 5-year average, +5.4% a year" — and says so when it had to fall back. */
function describeGrowth(a: GrowthAssumption): string {
  const rate = `${a.averagePct >= 0 ? "+" : ""}${a.averagePct.toFixed(1)}% a year`;
  if (a.basis === "5yr") return `projected at its 5-year average, ${rate}`;
  if (a.basis === "none") return "no return history yet, so no growth is projected";
  const years = a.basis === "3yr" ? "3" : "1";
  return `under 5 years old, so projected at its ${years}-year average, ${rate}`;
}

/** "1.00% a year (assumed) · 3% of contributions · €50 a year policy fee" */
function describeCharges(c: HoldingCharges): string {
  const parts = [
    `${c.amcPct.toFixed(2)}% a year${c.amcSource === "assumed" ? " (assumed)" : c.amcSource === "fund" ? " (fund's published charge)" : ""}`,
  ];
  if (c.contributionChargePct > 0) parts.push(`${c.contributionChargePct}% of contributions`);
  if (c.policyFee > 0) parts.push(`${formatEuro(c.policyFee)} a year policy fee`);
  return parts.join(" · ");
}

function HoldingRow({
  position,
  index,
  onUpdate,
  onRemove,
  market,
}: {
  position: Position;
  index: number;
  onUpdate: () => void;
  onRemove: () => void;
  market?: MarketData;
}) {
  const { holding, fund, valueNow } = position;
  const [confirming, setConfirming] = useState(false);
  const charges = chargesFor(holding, fund);
  const tracking = trackingFor(holding, fund, market);

  // Growth since the anchor = what it's worth now, less the anchored value and
  // every contribution paid in since (spread daily, as in the estimate).
  const days = daysSince(holding.valueAsOf, new Date());
  const paidInSince = ((totalMonthly(holding) * 12) / 365) * days;
  const growthSince = valueNow - holding.startValue - paidInSince;
  const stale = days >= 365;

  return (
    <div className="border-t border-border py-8">
      <div className="grid gap-6 md:grid-cols-[3.5rem_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-start md:gap-8">
        <span className="tabular font-mono text-xs text-primary">
          {String(index + 1).padStart(2, "0")}
        </span>

        <div className="min-w-0">
          {holding.label && (
            <p className="lower mb-1.5 font-mono text-xs text-primary">{holding.label}</p>
          )}
          <Link
            href={`/funds/${fund.slug}`}
            className="lower font-heading text-xl tracking-tight transition-colors hover:text-primary md:text-2xl"
          >
            {fund.name}
          </Link>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="lower font-mono text-xs text-muted-foreground">{fund.providerName}</span>
            <AssetClassBadge assetClass={fund.assetClass} />
          </div>
        </div>

        <div>
          <p className="lower font-mono text-xs text-muted-foreground">worth now (est.)</p>
          <p className="tabular mt-2 font-heading text-2xl">{formatEuro(valueNow)}</p>
          {days > 0 && (
            <p
              className={`tabular lower mt-1 font-mono text-xs ${growthSince >= 0 ? "text-success" : "text-destructive"}`}
            >
              {signed(growthSince)} market change since {formatDate(holding.valueAsOf)}
            </p>
          )}
        </div>

        <div>
          <p className="lower font-mono text-xs text-muted-foreground">going in monthly</p>
          <p className="tabular mt-2 font-heading text-2xl">{formatEuro(totalMonthly(holding))}</p>
          {holding.employerContribution > 0 && (
            <p className="tabular lower mt-1 font-mono text-xs text-muted-foreground">
              you {formatEuro(holding.monthlyContribution)} · employer{" "}
              {formatEuro(holding.employerContribution)}
            </p>
          )}
        </div>

        <div className="lower flex gap-5 font-mono text-xs md:flex-col md:items-end md:gap-2.5">
          {confirming ? (
            <>
              <button onClick={onRemove} className="link-underline text-destructive">
                yes, remove
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="link-underline text-muted-foreground hover:text-foreground"
              >
                keep it
              </button>
            </>
          ) : (
            <>
              <button onClick={onUpdate} className="link-underline text-foreground hover:text-primary">
                update ↗
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="link-underline text-muted-foreground hover:text-destructive"
              >
                remove
              </button>
            </>
          )}
        </div>
      </div>

      <p className="lower mt-5 font-mono text-xs leading-relaxed text-muted-foreground md:pl-[calc(3.5rem+2rem)]">
        {holding.startValue === 0
          ? `started from nothing on ${formatDate(holding.valueAsOf, true)}, built up from contributions`
          : `${formatEuro(holding.startValue)} on ${formatDate(holding.valueAsOf, true)}`}
        , kept current daily{" "}
        {tracking.covered ? (
          <>
            with <span className="text-foreground">{tracking.label}</span>, less charges
            {tracking.quality && (
              <>
                {" "}
                (
                <span
                  className={
                    tracking.quality === "close"
                      ? "text-success"
                      : tracking.quality === "fair"
                        ? "text-foreground"
                        : "text-warning"
                  }
                  title="How closely this blend of markets matched the fund's own returns over the last 1, 3 and 5 years"
                >
                  {tracking.quality} match to this fund&apos;s past returns
                </span>
                )
              </>
            )}
            .
          </>
        ) : (
          <>at this fund&apos;s 1-year return, less charges.</>
        )}{" "}
        <span className="text-foreground">{describeGrowth(growthAssumption(fund, charges.amcPct))}</span>.
        <br />
        charges: <span className="text-foreground">{describeCharges(charges)}</span>
        {charges.amcSource === "assumed" && (
          <>
            {" "}
            —{" "}
            <button onClick={onUpdate} className="link-underline text-primary">
              add yours from your statement
            </button>
          </>
        )}
        {stale && (
          <span className="text-warning">
            {" "}
            that&apos;s over a year old — update it from your latest statement to keep this accurate.
          </span>
        )}
      </p>
    </div>
  );
}

function ChargesSection({
  positions,
  charges,
  horizon,
  moneyLabel,
  amcAssumed,
  onEdit,
}: {
  positions: Position[];
  charges: ChargesBreakdown;
  horizon: number;
  moneyLabel: string;
  amcAssumed: boolean;
  onEdit: (holding: TrackedFund) => void;
}) {
  const parts = [
    { label: "management charges", value: charges.amc, note: "a % of your pot, every year" },
    {
      label: "contribution charges",
      value: charges.contribution,
      note: "taken off what you pay in",
    },
    { label: "policy fees", value: charges.policy, note: "flat yearly fees" },
    {
      label: "growth lost",
      value: charges.lostGrowth,
      note: "what the charges would have earned",
    },
  ];
  return (
    <div id="charges" className="mt-24 scroll-mt-28">
      <SectionLabel>{`charges over ${horizon} years`}</SectionLabel>
      <div className="mt-8 border-t border-border pt-10">
        <p className="lower font-mono text-xs text-muted-foreground">
          over the next {horizon} years you&apos;d pay about
        </p>
        <p className="tabular mt-3 font-heading text-[12vw] leading-none tracking-tight text-destructive md:text-[5.5vw]">
          {formatEuro(charges.paid)}
        </p>
        <p className="tabular lower mt-4 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
          in charges, starting at {formatEuro(charges.firstYear)} this year and rising as your pot
          grows. with the growth that money would have earned, your pot ends up{" "}
          <span className="text-foreground">{formatEuro(charges.impact)}</span> smaller than with no
          charges · {moneyLabel}
        </p>
        {amcAssumed && (
          <p className="lower mt-5 max-w-2xl border-l-2 border-warning py-1 pl-4 font-mono text-xs leading-relaxed text-warning">
            fund data doesn&apos;t include charges, so a typical {ASSUMED_AMC_PCT.toFixed(2)}% a year
            is assumed where you haven&apos;t entered yours. your statement or policy document lists
            the real ones — add them below to make this exact.
          </p>
        )}
      </div>

      <div className="mt-12 grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((part, i) => (
          <div
            key={part.label}
            className={`border-border py-7 ${i > 0 ? "sm:px-8" : "sm:pr-8"} ${i % 2 === 1 ? "sm:border-l" : ""} ${i === 2 ? "lg:border-l" : ""}`}
          >
            <p className="lower font-mono text-xs text-muted-foreground">{part.label}</p>
            <p className="tabular mt-3 font-heading text-3xl">{formatEuro(part.value)}</p>
            <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">{part.note}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-6">
        <p className="lower font-mono text-xs text-muted-foreground">by holding</p>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[44rem] text-left">
            <thead>
              <tr className="lower font-mono text-xs text-muted-foreground">
                <th className="pb-3 font-normal">fund</th>
                <th className="pb-3 text-right font-normal">annual charge</th>
                <th className="pb-3 text-right font-normal">on contributions</th>
                <th className="pb-3 text-right font-normal">policy fee / yr</th>
                <th className="pb-3 text-right font-normal">this year</th>
                <th className="pb-3 text-right font-normal">over {horizon} years</th>
                <th className="pb-3 text-right font-normal">pot smaller by</th>
                <th className="pb-3 font-normal" />
              </tr>
            </thead>
            <tbody>
              {positions.map(({ holding, fund }, i) => {
                const c = chargesFor(holding, fund);
                const row = charges.perHolding[i];
                return (
                  <tr key={holding.id} className="border-t border-border text-sm">
                    <td className="lower py-3 pr-4">{holding.label ?? fund.name}</td>
                    <td className="tabular py-3 text-right">
                      {c.amcPct.toFixed(2)}%
                      {c.amcSource === "assumed" && (
                        <span className="lower ml-1.5 font-mono text-xs text-warning">assumed</span>
                      )}
                    </td>
                    <td className="tabular py-3 text-right">{c.contributionChargePct}%</td>
                    <td className="tabular py-3 text-right">{formatEuro(c.policyFee)}</td>
                    <td className="tabular py-3 text-right">{formatEuro(row.firstYear)}</td>
                    <td className="tabular py-3 text-right">{formatEuro(row.paid)}</td>
                    <td className="tabular py-3 text-right text-destructive">
                      {formatEuro(row.impact)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        onClick={() => onEdit(holding)}
                        className="lower link-underline font-mono text-xs text-primary"
                      >
                        {c.amcSource === "yours" ? "edit" : "add yours"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className="lower mt-6 space-y-2 font-mono text-xs leading-relaxed text-muted-foreground">
          <li>
            ▸ annual management charge (amc): a % of the whole pot taken every year — on your
            statement as &ldquo;amc&rdquo;, &ldquo;fund management charge&rdquo; or &ldquo;annual
            charge&rdquo;.
          </li>
          <li>
            ▸ contribution charge: a % taken off each payment before it&apos;s invested. an
            &ldquo;allocation rate&rdquo; of 95% means a 5% charge; 100% or more means none.
          </li>
          <li>
            ▸ policy fee: a flat yearly or monthly fee some policies charge (enter it per year).
          </li>
          <li>
            ▸ figures follow the expected case above, with contributions as they are today. a
            standard prsa caps charges at 1% a year and 5% of contributions.
          </li>
        </ul>
      </div>
    </div>
  );
}

function EmptyState({ onAdd, disabled }: { onAdd: () => void; disabled: boolean }) {
  const steps = [
    {
      no: "01",
      title: "add what you hold",
      body: "each pension fund you're in, its value from your latest statement, and what goes in each month — yours and your employer's.",
    },
    {
      no: "02",
      title: "we keep it current",
      body: "every time you come back, each holding is estimated forward from its statement date using the fund's returns.",
    },
    {
      no: "03",
      title: "see where it's going",
      body: "a 10, 20 or 30-year projection on each fund's long-run trend, with a cautious-to-optimistic range and the cost of charges.",
    },
  ];
  return (
    <div>
      <div className="grid border-t border-border md:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.no}
            className="border-border py-8 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l"
          >
            <span className="font-mono text-sm text-primary">{step.no}</span>
            <h3 className="lower mt-5 font-heading text-2xl tracking-tight">{step.title}</h3>
            <p className="lower mt-4 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-border pt-10">
        <button
          onClick={onAdd}
          disabled={disabled}
          className="lower pill inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary disabled:opacity-50"
        >
          add your first holding <span aria-hidden>↗</span>
        </button>
      </div>
    </div>
  );
}

function PortfolioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { funds, status: fundsStatus, lastScrapeTime } = useFunds();
  const [tracked, setTracked] = useState<TrackedFund[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TrackedFund | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(20);
  const [real, setReal] = useState(false);
  // Captured once per page load, so every figure on the page agrees on "now".
  const [now] = useState(() => new Date());

  // useFunds() seeds with bundled data before the live catalogue arrives.
  // Holdings reference funds by slug (a foreign key to the funds table), and a
  // bundled slug may not exist in the live catalogue, so adding waits for it.
  const fundsReady = fundsStatus === "live";

  const prefillSlug = searchParams.get("add");
  const prefillFund =
    prefillSlug && fundsReady ? funds.find((f) => f.slug === prefillSlug) : undefined;

  // Logged out: log in, then come straight back — keeping any ?add= fund.
  useEffect(() => {
    if (authLoading || user) return;
    const query = searchParams.toString();
    router.replace(loginHref(`/portfolio${query ? `?${query}` : ""}`));
  }, [authLoading, user, router, searchParams]);

  useEffect(() => {
    if (!user) return;
    listTrackedFunds()
      .then(setTracked)
      .catch((err) =>
        setLoadError(err instanceof Error ? err.message : "Failed to load your portfolio."),
      );
  }, [user]);

  // Open the add dialog once for a ?add= fund (render-time, not an effect).
  const [autoOpenedFor, setAutoOpenedFor] = useState<string | undefined>(undefined);
  if (prefillFund && autoOpenedFor !== prefillFund.slug) {
    setAutoOpenedFor(prefillFund.slug);
    setEditing(undefined);
    setDialogOpen(true);
  }

  const fundsBySlug = useMemo(() => new Map(funds.map((f) => [f.slug, f])), [funds]);

  // Daily index prices back to the earliest date any holding needs: its
  // statement date, or the last visit if that's earlier.
  const marketFrom = useMemo(() => {
    const dates = (tracked ?? []).flatMap((t) => [t.valueAsOf, t.lastSeenAt.slice(0, 10)]);
    return dates.length ? dates.sort()[0] : null;
  }, [tracked]);
  // Only the markets these holdings follow.
  const marketIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of tracked ?? []) {
      const fund = fundsBySlug.get(t.fundSlug);
      if (fund) for (const id of Object.keys(benchmarkFor(fund))) ids.add(id);
    }
    return [...ids].sort().join(",");
  }, [tracked, fundsBySlug]);
  const { market, ready: marketReady } = useMarket(marketFrom, marketIds);
  const pricesAsOf = market ? marketAsOf(market) : null;

  const positions = useMemo<Position[]>(
    () =>
      (tracked ?? []).flatMap((holding) => {
        const fund = fundsBySlug.get(holding.fundSlug);
        return fund ? [{ holding, fund, valueNow: estimateHoldingValue(holding, fund, now, market) }] : [];
      }),
    [tracked, fundsBySlug, now, market],
  );

  const summary = useMemo(() => summarisePortfolio(positions, now, market), [positions, now, market]);
  const projection = useMemo(
    () => projectPortfolio(positions, { years: horizon, now, real }),
    [positions, horizon, now, real],
  );

  function openAdd() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openUpdate(holding: TrackedFund) {
    setEditing(holding);
    setDialogOpen(true);
  }

  async function handleSave(input: HoldingInput) {
    if (!user) return;
    if (editing) {
      const record = await updateTrackedFund(editing.id, input);
      setTracked((prev) => (prev ?? []).map((t) => (t.id === record.id ? record : t)));
    } else {
      const record = await addTrackedFund(input);
      setTracked((prev) => [...(prev ?? []), record]);
      if (prefillSlug) router.replace("/portfolio");
    }
  }

  async function handleRemove(id: string) {
    if (!user) return;
    setTracked((prev) => (prev ?? []).filter((t) => t.id !== id));
    await removeTrackedFund(id).catch(() => {});
  }

  async function handleSeen() {
    if (!user) return;
    const seenAt = await markPortfolioSeen().catch(() => null);
    if (seenAt) setTracked((prev) => (prev ?? []).map((t) => ({ ...t, lastSeenAt: seenAt })));
  }

  // Wait for prices too, so values don't jump once they arrive.
  if (authLoading || !user || tracked === null || (marketIds !== "" && !marketReady && !loadError)) {
    return (
      <div className="container-page max-w-4xl px-6 py-32 md:px-10">
        {loadError ? (
          <div className="border-l-2 border-warning py-1 pl-4">
            <p className="lower font-heading text-2xl tracking-tight">
              we couldn&apos;t reach your portfolio.
            </p>
            <p className="lower mt-3 max-w-md text-sm text-muted-foreground">
              the database didn&apos;t answer. nothing has been lost — try again in a moment.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="lower link-underline mt-5 font-mono text-xs text-primary"
            >
              try again ↗
            </button>
            <p className="lower mt-6 font-mono text-[0.7rem] text-muted-foreground/70">{loadError}</p>
          </div>
        ) : (
          <p className="lower font-mono text-xs text-muted-foreground">loading your portfolio…</p>
        )}
        {!loadError && (
          <>
            <Skeleton className="mt-8 h-40 rounded-none" />
            <Skeleton className="mt-px h-40 rounded-none" />
          </>
        )}
      </div>
    );
  }

  const end = projection.points[projection.points.length - 1];
  // Weighted by what's in each holding today; equal weights while every
  // holding is still at zero (contribution-only).
  const weights = positions.map((p) => (summary.valueNow > 0 ? p.valueNow : 1));
  const weightTotal = weights.reduce((sum, w) => sum + w, 0);
  const blendedGrowth =
    weightTotal > 0
      ? positions.reduce(
          (sum, p, i) =>
            sum + growthAssumption(p.fund, chargesFor(p.holding, p.fund).amcPct).expectedPct * weights[i],
          0,
        ) /
        weightTotal
      : 0;
  const sinceLastVisit = summary.valueNow - summary.valueAtLastVisit;
  const showSinceLastVisit =
    summary.lastVisit !== null && Math.abs(sinceLastVisit) >= 1 && positions.length > 0;
  const monthlyTotal = summary.monthlyPersonal + summary.monthlyEmployer;
  const moneyLabel = real ? "in today's money" : "in future euros";

  return (
    <>
      <PageIntro
        label="portfolio"
        lines={["what you hold,", "what it's worth."]}
        tone="slate"
        corners={{
          left: `${positions.length} ${positions.length === 1 ? "holding" : "holdings"}`,
          right: lastScrapeTime
            ? `fund data updated ${formatDate(lastScrapeTime, true)}`
            : "estimates, not statements",
        }}
        lead="your pensions in one place — valued from your statements, kept current from each fund's returns, and projected forward on their long-run trend."
      >
        {positions.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <button
              onClick={openAdd}
              disabled={!fundsReady}
              className="lower pill inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary disabled:opacity-50"
            >
              add a holding <span aria-hidden>↗</span>
            </button>
            <a href="#export" className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground">
              download pdf report or csv ↓
            </a>
          </div>
        )}
      </PageIntro>

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page px-0 md:px-0">
          {!fundsReady &&
            (fundsStatus === "unavailable" ? (
              // Say so rather than leave "add" disabled behind a spinner that
              // never resolves.
              <p className="lower mb-8 border-l-2 border-warning py-1 pl-4 font-mono text-xs leading-relaxed text-warning">
                live fund data can&apos;t be reached right now, so new holdings can&apos;t be saved.
                your existing holdings are safe — try again shortly.
              </p>
            ) : (
              <p className="lower mb-6 font-mono text-xs text-muted-foreground">
                loading live fund data…
              </p>
            ))}
          {loadError && <p className="lower mb-6 font-mono text-xs text-destructive">{loadError}</p>}

          {positions.length === 0 ? (
            <>
              <SectionLabel>how it works</SectionLabel>
              <div className="mt-8">
                <EmptyState onAdd={openAdd} disabled={!fundsReady} />
              </div>
            </>
          ) : (
            <>
              {/* ── Today ─────────────────────────────────────────────── */}
              <SectionLabel>today</SectionLabel>
              <div className="mt-8 border-t border-border pt-10">
                <p className="lower font-mono text-xs text-muted-foreground">
                  your portfolio is worth about
                </p>
                <p className="tabular mt-3 font-heading text-[14vw] leading-none tracking-tight md:text-[7vw]">
                  {formatEuro(summary.valueNow)}
                </p>
                <p className="lower mt-4 font-mono text-xs text-muted-foreground">
                  {pricesAsOf ? (
                    <>
                      estimated daily from market prices to{" "}
                      <span className="text-foreground">{formatDate(pricesAsOf, true)}</span> ·{" "}
                    </>
                  ) : (
                    <>estimated from each fund&apos;s latest returns · </>
                  )}
                  {lastScrapeTime ? (
                    <span className="text-foreground">
                      fund data updated {formatLastUpdated(lastScrapeTime)} utc
                    </span>
                  ) : (
                    "demo fund data"
                  )}
                </p>
                {showSinceLastVisit && summary.lastVisit && (
                  <p className="lower mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs">
                    <span className={sinceLastVisit >= 0 ? "text-success" : "text-destructive"}>
                      {signed(sinceLastVisit)} since your last visit on{" "}
                      {formatDate(summary.lastVisit, true)}
                    </span>
                    <button
                      onClick={handleSeen}
                      className="link-underline text-muted-foreground hover:text-foreground"
                    >
                      got it
                    </button>
                  </p>
                )}
              </div>

              <div className="mt-12 grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
                <div className="border-border py-7 sm:pr-8 lg:pl-0">
                  <p className="lower font-mono text-xs text-muted-foreground">going in monthly</p>
                  <p className="tabular mt-3 font-heading text-3xl">{formatEuro(monthlyTotal)}</p>
                  <p className="tabular lower mt-1.5 font-mono text-xs text-muted-foreground">
                    you {formatEuro(summary.monthlyPersonal)} · employer{" "}
                    {formatEuro(summary.monthlyEmployer)}
                  </p>
                </div>
                <div className="border-border py-7 sm:border-l sm:px-8">
                  <p className="lower font-mono text-xs text-muted-foreground">yearly</p>
                  <p className="tabular mt-3 font-heading text-3xl">{formatEuro(monthlyTotal * 12)}</p>
                  <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">
                    across {positions.length} {positions.length === 1 ? "holding" : "holdings"}
                  </p>
                </div>
                <div className="border-border py-7 lg:border-l lg:px-8">
                  <p className="lower font-mono text-xs text-muted-foreground">charges</p>
                  <p className="tabular mt-3 font-heading text-3xl">
                    {formatEuro(summary.yearlyChargesNow)}
                    <span className="text-lg text-muted-foreground"> /yr</span>
                  </p>
                  <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">
                    {summary.blendedAmc.toFixed(2)}% a year blended
                    {summary.amcAssumed && <span className="text-warning"> · partly assumed</span>}
                  </p>
                </div>
                <div className="border-border py-7 sm:border-l sm:px-8">
                  <p className="lower font-mono text-xs text-muted-foreground">blended risk</p>
                  <p className="tabular mt-3 font-heading text-3xl">
                    {summary.blendedRisk.toFixed(1)}
                    <span className="text-lg text-muted-foreground">/7</span>
                  </p>
                  <RiskMeter risk={Math.round(summary.blendedRisk)} size="sm" className="mt-3 max-w-40" />
                </div>
              </div>

              {/* Asset-class mix */}
              <div className="border-t border-border pt-7">
                <p className="lower font-mono text-xs text-muted-foreground">mix</p>
                <div className="mt-4 flex h-1.5 w-full overflow-hidden rounded-full bg-border">
                  {summary.allocation.map((slice) => (
                    <div
                      key={slice.assetClass}
                      className={CLASS_FILL[slice.assetClass]}
                      style={{ width: `${slice.share * 100}%` }}
                      title={`${slice.assetClass} ${(slice.share * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                  {summary.allocation.map((slice) => (
                    <span key={slice.assetClass} className="inline-flex items-center gap-2">
                      <AssetClassBadge assetClass={slice.assetClass} />
                      <span className="tabular font-mono text-xs text-muted-foreground">
                        {(slice.share * 100).toFixed(0)}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Projection ────────────────────────────────────────── */}
              <div className="mt-24">
                <div className="flex flex-wrap items-end justify-between gap-6">
                  <SectionLabel>{`the next ${horizon} years`}</SectionLabel>
                  <div className="flex flex-wrap items-center gap-2">
                    {HORIZONS.map((years) => (
                      <Chip key={years} active={horizon === years} onClick={() => setHorizon(years)}>
                        {years} years
                      </Chip>
                    ))}
                    <span className="mx-2 hidden h-4 w-px bg-border sm:block" aria-hidden />
                    <Chip active={!real} onClick={() => setReal(false)}>
                      future €
                    </Chip>
                    <Chip active={real} onClick={() => setReal(true)}>
                      today&apos;s money
                    </Chip>
                  </div>
                </div>

                <div className="mt-8 border-t border-border pt-10">
                  <p className="lower font-mono text-xs text-muted-foreground">
                    by {end.year}, growing at your funds&apos; 5-year averages, you could have
                  </p>
                  <p className="tabular mt-3 font-heading text-[12vw] leading-none tracking-tight text-primary md:text-[5.5vw]">
                    {formatEuro(end.expected)}
                  </p>
                  <p className="tabular lower mt-4 font-mono text-xs text-muted-foreground">
                    somewhere between {formatEuro(end.cautious)} and {formatEuro(end.optimistic)} ·{" "}
                    {moneyLabel}
                  </p>
                  <p className="tabular lower mt-2 font-mono text-xs text-muted-foreground">
                    your funds&apos; 5-year average, weighted by what&apos;s in each:{" "}
                    <span className="text-foreground">
                      {blendedGrowth >= 0 ? "+" : ""}
                      {blendedGrowth.toFixed(1)}% a year
                    </span>{" "}
                    after charges
                  </p>
                </div>

                <div className="mt-12 grid border-t border-border md:grid-cols-3">
                  <div className="border-border py-7 md:pr-8">
                    <p className="lower font-mono text-xs text-muted-foreground">you&apos;ll pay in</p>
                    <p className="tabular mt-3 font-heading text-3xl">
                      {formatEuro(projection.contributionsOverPeriod)}
                    </p>
                    <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">
                      {formatEuro(monthlyTotal)} a month for {horizon} years
                    </p>
                  </div>
                  <div className="border-border py-7 md:border-l md:px-8">
                    <p className="lower font-mono text-xs text-muted-foreground">growth does the rest</p>
                    <p className="tabular mt-3 font-heading text-3xl text-success">
                      {formatEuro(Math.max(end.expected - end.paidIn, 0))}
                    </p>
                    <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">
                      expected, above everything paid in
                    </p>
                  </div>
                  <div className="border-border py-7 md:border-l md:px-8">
                    <p className="lower font-mono text-xs text-muted-foreground">charges will cost</p>
                    <p className="tabular mt-3 font-heading text-3xl text-destructive">
                      {formatEuro(projection.charges.impact)}
                    </p>
                    <p className="lower mt-1.5 font-mono text-xs text-muted-foreground">
                      vs no charges ·{" "}
                      <a href="#charges" className="link-underline hover:text-foreground">
                        see the breakdown ↓
                      </a>
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-border pt-8">
                  <PortfolioChart points={projection.points} />
                </div>

                {/* What each fund is projected at, always on show */}
                <div className="mt-10 border-t border-border pt-6">
                  <p className="lower font-mono text-xs text-muted-foreground">
                    how each fund is projected
                    {lastScrapeTime && <> · returns as of {formatLastUpdated(lastScrapeTime)} utc</>}
                  </p>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[36rem] text-left">
                      <thead>
                        <tr className="lower font-mono text-xs text-muted-foreground">
                          <th className="pb-3 font-normal">fund</th>
                          <th className="pb-3 text-right font-normal">5-year average / yr</th>
                          <th className="pb-3 text-right font-normal">after charge</th>
                          <th className="pb-3 text-right font-normal">cautious – optimistic</th>
                        </tr>
                      </thead>
                      <tbody>
                        {positions.map(({ holding, fund }) => {
                          const a = growthAssumption(fund, chargesFor(holding, fund).amcPct);
                          return (
                            <tr key={holding.id} className="border-t border-border text-sm">
                              <td className="lower py-3 pr-4">{holding.label ?? fund.name}</td>
                              <td className="tabular py-3 text-right">
                                {a.basis === "none" ? (
                                  <span className="lower font-mono text-xs text-muted-foreground">
                                    no history
                                  </span>
                                ) : (
                                  <>
                                    {a.averagePct >= 0 ? "+" : ""}
                                    {a.averagePct.toFixed(1)}%
                                    {a.basis !== "5yr" && (
                                      <span className="lower ml-1.5 font-mono text-xs text-warning">
                                        ({a.basis === "3yr" ? "3" : "1"}-yr — fund under 5 years old)
                                      </span>
                                    )}
                                  </>
                                )}
                              </td>
                              <td className="tabular py-3 text-right">
                                {a.expectedPct >= 0 ? "+" : ""}
                                {a.expectedPct.toFixed(1)}%
                              </td>
                              <td className="tabular py-3 text-right font-mono text-xs text-muted-foreground">
                                {a.cautiousPct.toFixed(1)}% to {a.optimisticPct.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <ul className="lower mt-6 space-y-2 font-mono text-xs leading-relaxed text-muted-foreground">
                    <li>
                      ▸ each fund grows at its average yearly return over the last 5 years — long
                      enough to include good and bad markets. last year alone is too noisy to compound
                      for decades.
                    </li>
                    <li>
                      ▸ a fund under 5 years old uses its longest history instead, and is marked.
                      the fund&apos;s annual charge is taken off.
                    </li>
                    <li>
                      ▸ the range is ±{RISK_SPREAD_PER_POINT}% a year per point of risk rating: wider
                      for equity, narrow for cash.
                    </li>
                    <li>
                      ▸ contributions stay as they are today. &ldquo;today&apos;s money&rdquo; deflates
                      by {INFLATION_PCT}% a year inflation.
                    </li>
                    <li>
                      ▸ an illustration, not a forecast and not financial advice. past performance
                      doesn&apos;t guarantee future returns.
                    </li>
                  </ul>
                </div>
              </div>

              {/* ── Charges ───────────────────────────────────────────── */}
              <ChargesSection
                positions={positions}
                charges={projection.charges}
                horizon={horizon}
                moneyLabel={moneyLabel}
                amcAssumed={summary.amcAssumed}
                onEdit={openUpdate}
              />

              {/* ── Export + warnings ─────────────────────────────────── */}
              <div id="export" className="mt-24 scroll-mt-28 border-t border-border pt-8">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div>
                    <p className="lower font-mono text-xs text-muted-foreground">take it with you</p>
                    <p className="lower mt-2 max-w-md text-sm text-muted-foreground">
                      a pdf report with the charts — holdings, the {horizon}-year projection (
                      {moneyLabel}), what charges cost and year-by-year figures — or the same numbers
                      as a csv spreadsheet. both include these warnings.
                    </p>
                  </div>
                  <ExportButtons
                    onPdf={async () => {
                      const { downloadPortfolioReport } = await import("@/lib/pdf/portfolio-report");
                      downloadPortfolioReport({
                        positions,
                        summary,
                        projection,
                        horizon,
                        real,
                        now,
                        lastScrapeTime,
                        name: user.name,
                      });
                    }}
                    onCsv={() =>
                      downloadCsv(
                        csvFileName("portfolio", now),
                        portfolioCsvRows({ positions, summary, projection, horizon, real, now, lastScrapeTime }),
                      )
                    }
                  />
                </div>
                <Disclaimer kind="projection" className="mt-8 max-w-3xl" />
              </div>

              {/* ── Holdings ──────────────────────────────────────────── */}
              <div className="mt-24">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <SectionLabel>holdings</SectionLabel>
                  <button
                    onClick={openAdd}
                    disabled={!fundsReady}
                    className="lower link-underline font-mono text-xs text-primary disabled:opacity-50"
                  >
                    add a holding ↗
                  </button>
                </div>
                <div className="mt-8">
                  {positions.map((position, i) => (
                    <HoldingRow
                      key={position.holding.id}
                      position={position}
                      index={i}
                      onUpdate={() => openUpdate(position.holding)}
                      onRemove={() => handleRemove(position.holding.id)}
                      market={market}
                    />
                  ))}
                  <div className="border-t border-border" />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <HoldingDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && prefillSlug) router.replace("/portfolio");
        }}
        funds={funds}
        heldFundSlugs={new Set((tracked ?? []).map((t) => t.fundSlug))}
        defaultFundSlug={prefillFund?.slug}
        editing={editing}
        onSave={handleSave}
      />
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
