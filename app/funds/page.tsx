"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageIntro } from "@/components/editorial/page-intro";
import { SectionLabel } from "@/components/editorial/section-label";
import { FundRow } from "@/components/funds/fund-row";
import { assetClasses } from "@/lib/mock-data";
import { useFunds } from "@/lib/hooks/use-funds";
import { formatLastUpdated } from "@/lib/utils";
import type { AssetClass } from "@/lib/types";
import { returnFor } from "@/lib/fund-returns";
import { Disclaimer } from "@/components/legal/disclaimer";

const PAGE_SIZE = 24;

const SORT_LABELS: Record<string, string> = {
  name: "name a–z",
  "amc-asc": "lowest charge",
  "return-desc": "highest 1yr return",
  "risk-asc": "lowest risk",
};

function FundsExplorer() {
  const { funds, providers, source, lastScrapeTime } = useFunds();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState(searchParams.get("provider") ?? "all");
  const [assetClass, setAssetClass] = useState("all");
  const [sort, setSort] = useState<"name" | "amc-asc" | "return-desc" | "risk-asc">("name");
  const [pagination, setPagination] = useState({ key: "", count: PAGE_SIZE });

  const filtered = useMemo(() => {
    let list = funds;
    if (provider !== "all") list = list.filter((f) => f.providerSlug === provider);
    if (assetClass !== "all") list = list.filter((f) => f.assetClass === assetClass);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (f) => f.name.toLowerCase().includes(q) || f.providerName.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "amc-asc":
        // Funds without a published AMC (live-scraped data) sort last.
        sorted.sort((a, b) => (a.amc ?? Infinity) - (b.amc ?? Infinity));
        break;
      case "return-desc":
        // Funds with no 1-year history yet sort last, not as if they returned 0%.
        sorted.sort((a, b) => {
          const ra = returnFor(a, "1y");
          const rb = returnFor(b, "1y");
          if (ra === null) return rb === null ? 0 : 1;
          if (rb === null) return -1;
          return rb - ra;
        });
        break;
      case "risk-asc":
        sorted.sort((a, b) => a.riskRating - b.riskRating);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [funds, provider, assetClass, query, sort]);

  // Any filter change resets how many rows are shown, so "load more" always
  // starts from a full first page of the new result set. Adjusting state during
  // render (rather than in an effect) avoids an extra render pass.
  const filterKey = `${provider}|${assetClass}|${query}|${sort}`;
  if (pagination.key !== filterKey) {
    setPagination({ key: filterKey, count: PAGE_SIZE });
  }
  const visibleCount = pagination.key === filterKey ? pagination.count : PAGE_SIZE;

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const loading = funds.length === 0;

  const providerLabel = (value: string) =>
    value === "all" ? "all providers" : (providers.find((p) => p.slug === value)?.name ?? value);

  function clearAll() {
    setProvider("all");
    setAssetClass("all");
    setQuery("");
  }

  return (
    <>
      <PageIntro
        label="fund explorer"
        lines={["every fund,", "one list."]}
        corners={{
          left: source === "supabase" ? "live data" : "demo data",
          right: lastScrapeTime ? `updated ${formatLastUpdated(lastScrapeTime)} utc` : "refreshed weekly",
        }}
        lead={
          <>
            {funds.length} funds across {providers.length} irish providers.{" "}
            {source === "supabase"
              ? "sourced from the national pension helpline fund explorer — see "
              : "performance figures are illustrative — see "}
            <Link href="/how-it-works" className="link-underline text-foreground">
              data sources
            </Link>
            .
          </>
        }
      />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page px-0 md:px-0">
          {/* Filters — a hairline toolbar, not a card */}
          <div className="grid gap-5 border-t border-border pt-8 md:grid-cols-[1.6fr_1fr_1fr_1fr] md:gap-8">
            <label className="block">
              <span className="lower mb-3 block font-mono text-xs text-muted-foreground">
                search
              </span>
              <Input
                placeholder="fund or provider…"
                className="lower h-11 rounded-none border-0 border-b border-border bg-transparent px-0 text-base placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-0"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>

            <label className="block">
              <span className="lower mb-3 block font-mono text-xs text-muted-foreground">
                provider
              </span>
              <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
                <SelectTrigger className="lower h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0">
                  <SelectValue>{(value: string) => providerLabel(value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all providers</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <span className="lower mb-3 block font-mono text-xs text-muted-foreground">
                asset class
              </span>
              <Select value={assetClass} onValueChange={(v) => v && setAssetClass(v)}>
                <SelectTrigger className="lower h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0">
                  <SelectValue>
                    {(value: string) => (value === "all" ? "all asset classes" : value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">all asset classes</SelectItem>
                  {assetClasses.map((ac) => (
                    <SelectItem key={ac} value={ac}>
                      {ac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="block">
              <span className="lower mb-3 block font-mono text-xs text-muted-foreground">
                sort by
              </span>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="lower h-11 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-base focus-visible:border-primary focus-visible:ring-0">
                  <SelectValue>{(value: string) => SORT_LABELS[value] ?? value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>

          {/* Asset-class chips: the filter people reach for most */}
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {(["all", ...assetClasses] as (AssetClass | "all")[]).map((ac) => (
              <button
                key={ac}
                onClick={() => setAssetClass(ac)}
                aria-pressed={assetClass === ac}
                className={`lower rounded-full border px-4 py-1.5 font-mono text-xs transition-colors ${
                  assetClass === ac
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {ac === "all" ? "all" : ac}
              </button>
            ))}
          </div>

          <div className="mt-12 flex items-end justify-between gap-4">
            <SectionLabel>
              {loading
                ? "loading funds"
                : `${visible.length} of ${filtered.length} funds`}
            </SectionLabel>
            {(provider !== "all" || assetClass !== "all" || query.trim()) && (
              <button
                onClick={clearAll}
                className="lower link-underline font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                clear filters
              </button>
            )}
          </div>

          <div className="mt-6">
            {loading ? (
              <div className="space-y-px">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="h-24 animate-pulse border-t border-border bg-card/40" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="border-t border-border py-24 text-center">
                <p className="lower font-heading text-2xl">nothing matches those filters.</p>
                <button
                  onClick={clearAll}
                  className="lower link-underline mt-4 font-mono text-xs text-primary"
                >
                  clear filters
                </button>
              </div>
            ) : (
              <>
                <div>
                  {visible.map((fund, i) => (
                    <FundRow key={fund.id} fund={fund} index={i} />
                  ))}
                </div>
                <div className="border-t border-border pt-10">
                  {hasMore ? (
                    <button
                      onClick={() => setPagination((p) => ({ ...p, count: p.count + PAGE_SIZE }))}
                      className="lower pill inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary"
                    >
                      load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
                      <span aria-hidden>↓</span>
                    </button>
                  ) : (
                    <p className="lower font-mono text-xs text-muted-foreground">
                      that&apos;s all {filtered.length} funds.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <section className="px-6 pb-16 md:px-10">
        <div className="container-page max-w-3xl px-0 md:px-0">
          <Disclaimer kind="returns" />
        </div>
      </section>
    </>
  );
}

export default function FundsPage() {
  return (
    <Suspense>
      <FundsExplorer />
    </Suspense>
  );
}
