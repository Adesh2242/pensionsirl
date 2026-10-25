"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, Scale, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { RiskBadge } from "@/components/funds/risk-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { ReturnValue } from "@/components/funds/return-value";
import { useFunds } from "@/lib/hooks/use-funds";
import { hueForName } from "@/lib/color-hash";
import { formatAmc } from "@/lib/utils";
import type { Fund } from "@/lib/types";

const MAX_COMPARE = 4;

function useSelectedSlugs() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const slugs = useMemo(() => {
    const raw = searchParams.get("funds");
    if (!raw) return [];
    return Array.from(new Set(raw.split(",").filter(Boolean))).slice(0, MAX_COMPARE);
  }, [searchParams]);

  function setSlugs(next: string[]) {
    const params = new URLSearchParams();
    if (next.length) params.set("funds", next.join(","));
    router.push(`/compare${params.toString() ? `?${params}` : ""}`);
  }

  return { slugs, setSlugs };
}

type Row = {
  label: string;
  render: (fund: Fund) => React.ReactNode;
  /** Which fund wins this row, if any — "lower" for charges and risk, "higher" for returns. */
  best?: { value: (fund: Fund) => number | undefined; direction: "lower" | "higher" };
};

const rows: Row[] = [
  { label: "Provider", render: (f) => f.providerName },
  { label: "Asset class", render: (f) => <AssetClassBadge assetClass={f.assetClass} /> },
  {
    label: "Risk rating",
    render: (f) => (
      <div className="space-y-2">
        <RiskBadge risk={f.riskRating} />
        <RiskMeter risk={f.riskRating} size="sm" className="w-28" />
      </div>
    ),
    best: { value: (f) => f.riskRating, direction: "lower" },
  },
  {
    label: "Annual charge",
    render: (f) => <span className="tabular font-medium">{formatAmc(f.amc)}</span>,
    best: { value: (f) => f.amc, direction: "lower" },
  },
  {
    label: "1yr return",
    render: (f) => <ReturnValue value={f.oneYearReturn} />,
    best: { value: (f) => f.oneYearReturn, direction: "higher" },
  },
  {
    label: "3yr return (ann.)",
    render: (f) => <ReturnValue value={f.threeYearReturn} />,
    best: { value: (f) => f.threeYearReturn, direction: "higher" },
  },
  {
    label: "5yr return (ann.)",
    render: (f) => <ReturnValue value={f.fiveYearReturn} />,
    best: { value: (f) => f.fiveYearReturn, direction: "higher" },
  },
  { label: "Manager", render: (f) => f.manager ?? "—" },
];

/**
 * The winning slug for a row, or null when nothing wins — no comparable
 * values, or a tie (highlighting every column would say nothing).
 */
function bestSlug(row: Row, funds: Fund[]): string | null {
  if (!row.best || funds.length < 2) return null;
  const scored = funds
    .map((f) => ({ slug: f.slug, value: row.best!.value(f) }))
    .filter((entry): entry is { slug: string; value: number } => entry.value !== undefined);
  if (scored.length < 2) return null;
  const sorted = [...scored].sort((a, b) =>
    row.best!.direction === "lower" ? a.value - b.value : b.value - a.value,
  );
  if (sorted[0].value === sorted[1].value) return null;
  return sorted[0].slug;
}

function ComparePage() {
  const { funds } = useFunds();
  const { slugs, setSlugs } = useSelectedSlugs();
  const selectedFunds = slugs
    .map((slug) => funds.find((f) => f.slug === slug))
    .filter((f): f is Fund => Boolean(f));

  const availableFunds = funds.filter((f) => !slugs.includes(f.slug));

  function addFund(slug: string) {
    if (slugs.includes(slug) || slugs.length >= MAX_COMPARE) return;
    setSlugs([...slugs, slug]);
  }

  function removeFund(slug: string) {
    setSlugs(slugs.filter((s) => s !== slug));
  }

  return (
    <>
      <PageHeader
        title="Compare funds"
        description={`Pick up to ${MAX_COMPARE} funds to compare side-by-side. Your selection lives in the URL, so you can share or bookmark the comparison.`}
        actions={
          selectedFunds.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setSlugs([])}>
              Clear all
            </Button>
          ) : undefined
        }
      >
        <div className="mt-8 max-w-md space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="add-fund" className="text-xs text-muted-foreground">
              Add a fund
            </Label>
            <span className="tabular text-xs text-muted-foreground">
              {slugs.length}/{MAX_COMPARE} selected
            </span>
          </div>
          <Select
            onValueChange={(v: string | null) => v && addFund(v)}
            disabled={slugs.length >= MAX_COMPARE}
          >
            <SelectTrigger id="add-fund" className="h-10 w-full bg-card">
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              <SelectValue
                placeholder={
                  slugs.length >= MAX_COMPARE ? `Maximum ${MAX_COMPARE} funds` : "Choose a fund…"
                }
              />
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
      </PageHeader>

      <div className="container-page py-10">
        {selectedFunds.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 p-14 text-center">
            <div className="icon-tile size-12 text-chart-2">
              <Scale className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-medium">Nothing to compare yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add up to {MAX_COMPARE} funds above, or pick them straight from the explorer.
            </p>
            <Link href="/funds" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Browse the fund explorer
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card shadow-soft">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-44 bg-card p-4 text-left align-bottom text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Metric
                    </th>
                    {selectedFunds.map((f) => (
                      <th
                        key={f.slug}
                        className="min-w-[14rem] border-l p-4 text-left align-bottom font-normal"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-semibold ${hueForName(f.providerName)}`}
                                aria-hidden
                              >
                                {f.providerName[0]}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {f.providerName}
                              </span>
                            </div>
                            <Link
                              href={`/funds/${f.slug}`}
                              className="mt-1 block font-semibold leading-snug hover:text-primary"
                            >
                              {f.name}
                            </Link>
                          </div>
                          <button
                            onClick={() => removeFund(f.slug)}
                            aria-label={`Remove ${f.name}`}
                            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const winner = bestSlug(row, selectedFunds);
                    return (
                      <tr key={row.label} className="border-t">
                        <td className="sticky left-0 z-10 bg-card p-4 align-middle font-medium text-muted-foreground">
                          {row.label}
                        </td>
                        {selectedFunds.map((f) => (
                          <td
                            key={f.slug}
                            className={`border-l p-4 align-middle ${
                              winner === f.slug ? "bg-success/8" : ""
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              {row.render(f)}
                              {winner === f.slug && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[0.7rem] font-medium text-success ring-1 ring-inset ring-success/20">
                                  <Check className="h-3 w-3" aria-hidden />
                                  Best
                                </span>
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              &ldquo;Best&rdquo; flags the lowest charge and risk, and the highest return, among
              the funds shown — not a recommendation, and not advice. Lower risk isn&apos;t
              automatically better for a long time horizon.
            </p>
          </>
        )}
      </div>
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ComparePage />
    </Suspense>
  );
}
