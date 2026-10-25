"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { FundCard } from "@/components/funds/fund-card";
import { assetClasses } from "@/lib/mock-data";
import { useFunds } from "@/lib/hooks/use-funds";
import { formatLastUpdated } from "@/lib/utils";
import type { AssetClass } from "@/lib/types";

const PAGE_SIZE = 24;

const SORT_LABELS: Record<string, string> = {
  name: "Name (A–Z)",
  "amc-asc": "Lowest AMC",
  "return-desc": "Highest 1yr return",
  "risk-asc": "Lowest risk",
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
        sorted.sort((a, b) => b.oneYearReturn - a.oneYearReturn);
        break;
      case "risk-asc":
        sorted.sort((a, b) => a.riskRating - b.riskRating);
        break;
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }, [funds, provider, assetClass, query, sort]);

  // Any filter change should reset how many cards are shown, so "Load more"
  // always starts from a full first page of the new result set. Adjusting
  // state during render (rather than in an effect) avoids an extra render pass.
  const filterKey = `${provider}|${assetClass}|${query}|${sort}`;
  if (pagination.key !== filterKey) {
    setPagination({ key: filterKey, count: PAGE_SIZE });
  }
  const visibleCount = pagination.key === filterKey ? pagination.count : PAGE_SIZE;

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  const loading = funds.length === 0;

  const providerName = providers.find((p) => p.slug === provider)?.name;
  const activeFilters = [
    provider !== "all" && {
      key: "provider",
      label: providerName ?? provider,
      clear: () => setProvider("all"),
    },
    assetClass !== "all" && {
      key: "assetClass",
      label: assetClass,
      clear: () => setAssetClass("all"),
    },
    query.trim() && { key: "query", label: `"${query.trim()}"`, clear: () => setQuery("") },
  ].filter((f): f is { key: string; label: string; clear: () => void } => Boolean(f));

  function clearAll() {
    setProvider("all");
    setAssetClass("all");
    setQuery("");
  }

  const providerLabel = (value: string) =>
    value === "all" ? "All providers" : (providers.find((p) => p.slug === value)?.name ?? value);

  return (
    <>
      <PageHeader
        eyebrow={
          <>
            <Badge
              variant="outline"
              className={
                source === "supabase"
                  ? "bg-success/12 text-success ring-1 ring-inset ring-success/20"
                  : undefined
              }
            >
              {source === "supabase" ? "Live data" : "Demo data"}
            </Badge>
            {source === "supabase" && lastScrapeTime && (
              <span>Updated {formatLastUpdated(lastScrapeTime)} UTC</span>
            )}
          </>
        }
        title="Fund explorer"
        description={
          <>
            {funds.length} funds across {providers.length} Irish providers.{" "}
            {source === "supabase"
              ? "Sourced from the National Pension Helpline fund explorer — see "
              : "Performance figures are illustrative — see "}
            <Link href="/how-it-works" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
              data sources
            </Link>
            .
          </>
        }
      />

      <div className="container-page py-8">
        {/* Filter bar — sticks under the navbar so refining never means scrolling back up. */}
        <div className="lg:sticky lg:top-16 z-30 -mx-5 mb-6 border-b bg-background/85 px-5 py-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor="fund-search" className="text-xs text-muted-foreground">
                Search
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fund-search"
                  placeholder="Fund or provider name…"
                  className="h-10 pl-9"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>{(value: string) => providerLabel(value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Asset class</Label>
              <Select value={assetClass} onValueChange={(v) => v && setAssetClass(v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue>
                    {(value: string) => (value === "all" ? "All asset classes" : value)}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All asset classes</SelectItem>
                  {assetClasses.map((ac) => (
                    <SelectItem key={ac} value={ac}>
                      {ac}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Sort by</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
                <SelectTrigger className="h-10 w-full">
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
            </div>
          </div>

          {/* Asset-class quick chips: the filter people reach for most, one tap away. */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal className="mr-0.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            {(["all", ...assetClasses] as (AssetClass | "all")[]).map((ac) => (
              <button
                key={ac}
                onClick={() => setAssetClass(ac)}
                aria-pressed={assetClass === ac}
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
                  assetClass === ac
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-muted-foreground ring-border hover:bg-muted hover:text-foreground"
                }`}
              >
                {ac === "all" ? "All" : ac}
              </button>
            ))}
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">Active:</span>
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={f.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70"
                >
                  {f.label}
                  <X className="h-3 w-3" aria-hidden />
                </button>
              ))}
              <Button variant="ghost" size="xs" onClick={clearAll}>
                Clear all
              </Button>
            </div>
          )}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {loading ? (
            "Loading funds…"
          ) : (
            <>
              Showing <span className="tabular font-medium text-foreground">{visible.length}</span>{" "}
              of <span className="tabular font-medium text-foreground">{filtered.length}</span>{" "}
              funds
            </>
          )}
        </p>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-60 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card/50 p-14 text-center">
            <div className="icon-tile size-12 text-muted-foreground">
              <Search className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-medium">No funds match your filters</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Try a broader search term, or clear a filter to widen the results.
            </p>
            <Button variant="outline" size="sm" onClick={clearAll} className="mt-1">
              Clear filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((fund) => (
                <FundCard key={fund.id} fund={fund} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setPagination((p) => ({ ...p, count: p.count + PAGE_SIZE }))}
                >
                  Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
                </Button>
                <p className="text-xs text-muted-foreground">
                  {filtered.length - visibleCount} funds remaining
                </p>
              </div>
            )}
          </>
        )}
      </div>
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
