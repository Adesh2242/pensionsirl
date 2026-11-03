"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageIntro } from "@/components/editorial/page-intro";
import { SectionLabel } from "@/components/editorial/section-label";
import { RiskBadge } from "@/components/funds/risk-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { ReturnValue } from "@/components/funds/return-value";
import { useFunds } from "@/lib/hooks/use-funds";
import { formatAmc } from "@/lib/utils";
import type { Fund } from "@/lib/types";
import { returnFor } from "@/lib/fund-returns";
import { Disclaimer } from "@/components/legal/disclaimer";

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
  { label: "provider", render: (f) => <span className="lower">{f.providerName}</span> },
  { label: "asset class", render: (f) => <AssetClassBadge assetClass={f.assetClass} /> },
  {
    label: "risk rating",
    render: (f) => (
      <div className="space-y-2.5">
        <RiskBadge risk={f.riskRating} />
        <RiskMeter risk={f.riskRating} size="sm" className="w-28" />
      </div>
    ),
    best: { value: (f) => f.riskRating, direction: "lower" },
  },
  {
    label: "annual charge",
    render: (f) => <span className="tabular font-heading text-lg">{formatAmc(f.amc)}</span>,
    best: { value: (f) => f.amc, direction: "lower" },
  },
  {
    label: "1yr return",
    render: (f) => <ReturnValue value={returnFor(f, "1y")} className="font-heading text-lg" />,
    best: { value: (f) => returnFor(f, "1y") ?? undefined, direction: "higher" },
  },
  {
    label: "3yr average / yr",
    render: (f) => <ReturnValue value={returnFor(f, "3y")} className="font-heading text-lg" />,
    best: { value: (f) => returnFor(f, "3y") ?? undefined, direction: "higher" },
  },
  {
    label: "5yr average / yr",
    render: (f) => <ReturnValue value={returnFor(f, "5y")} className="font-heading text-lg" />,
    best: { value: (f) => returnFor(f, "5y") ?? undefined, direction: "higher" },
  },
  { label: "manager", render: (f) => <span className="lower">{f.manager ?? "—"}</span> },
];

/**
 * The winning slug for a row, or null when nothing wins — no comparable
 * values, or a tie (flagging every column would say nothing).
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

  return (
    <>
      <PageIntro
        label="compare"
        lines={["four funds,", "side by side."]}
        tone="sun"
        corners={{ left: `${slugs.length}/${MAX_COMPARE} selected`, right: "shareable by url" }}
        lead="pick up to four funds. the lowest charge and the highest return are flagged — the rest is yours to weigh."
      />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page px-0 md:px-0">
          <div className="grid gap-5 border-t border-border pt-8 md:grid-cols-[1fr_auto] md:items-end">
            <label className="block max-w-md">
              <span className="lower mb-3 block font-mono text-xs text-muted-foreground">
                add a fund
              </span>
              <Select
                onValueChange={(v: string | null) => v && addFund(v)}
                disabled={slugs.length >= MAX_COMPARE}
              >
                <SelectTrigger className="lower h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0">
                  <SelectValue
                    placeholder={
                      slugs.length >= MAX_COMPARE ? `maximum ${MAX_COMPARE} funds` : "choose a fund…"
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
            </label>

            {selectedFunds.length > 0 && (
              <button
                onClick={() => setSlugs([])}
                className="lower link-underline justify-self-start font-mono text-xs text-muted-foreground hover:text-foreground md:justify-self-end"
              >
                clear all
              </button>
            )}
          </div>

          {selectedFunds.length === 0 ? (
            <div className="mt-16 border-t border-border py-24 text-center">
              <p className="lower font-heading text-3xl">nothing to compare yet.</p>
              <Link
                href="/funds"
                className="lower link-underline mt-5 inline-block font-mono text-xs text-primary"
              >
                browse the fund explorer ↗
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-16 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-t border-border">
                      <th className="lower w-40 py-6 pr-6 align-bottom font-mono text-xs font-normal text-muted-foreground">
                        metric
                      </th>
                      {selectedFunds.map((f, i) => (
                        <th
                          key={f.slug}
                          className="min-w-[13rem] border-l border-border px-6 py-6 align-bottom font-normal"
                        >
                          <span className="lower tabular block font-mono text-xs text-primary">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <Link
                            href={`/funds/${f.slug}`}
                            className="lower mt-3 block font-heading text-xl leading-tight tracking-tight transition-colors hover:text-primary"
                          >
                            {f.name}
                          </Link>
                          <span className="lower mt-2 block font-mono text-xs text-muted-foreground">
                            {f.providerName}
                          </span>
                          <button
                            onClick={() => setSlugs(slugs.filter((s) => s !== f.slug))}
                            className="lower link-underline mt-3 font-mono text-xs text-muted-foreground hover:text-destructive"
                          >
                            remove
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const winner = bestSlug(row, selectedFunds);
                      return (
                        <tr key={row.label} className="border-t border-border">
                          <td className="lower py-6 pr-6 align-middle font-mono text-xs text-muted-foreground">
                            {row.label}
                          </td>
                          {selectedFunds.map((f) => (
                            <td
                              key={f.slug}
                              className="border-l border-border px-6 py-6 align-middle"
                            >
                              <div className="flex items-center justify-between gap-3">
                                {row.render(f)}
                                {winner === f.slug && (
                                  <span className="lower shrink-0 font-mono text-[0.65rem] text-primary">
                                    best
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

              <p className="lower mt-8 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
                &ldquo;best&rdquo; flags the lowest charge and risk, and the highest return, among
                the funds shown — not a recommendation, and not advice. lower risk isn&apos;t
                automatically better over a long horizon.
              </p>
              <Disclaimer kind="returns" className="mt-8 max-w-3xl" />
            </>
          )}

          <SectionLabel className="mt-20">still deciding?</SectionLabel>
          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            <Link
              href="/calculator"
              className="lower link-underline text-sm text-muted-foreground hover:text-foreground"
            >
              model the charges over 30 years ↗
            </Link>
            <Link
              href="/ai-suggestions"
              className="lower link-underline text-sm text-muted-foreground hover:text-foreground"
            >
              ask for a shortlist ↗
            </Link>
          </div>
        </div>
      </section>
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
