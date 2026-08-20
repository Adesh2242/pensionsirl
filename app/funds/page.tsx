"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FundCard } from "@/components/funds/fund-card";
import { assetClasses } from "@/lib/mock-data";
import { useFunds } from "@/lib/hooks/use-funds";
import { formatLastUpdated } from "@/lib/utils";

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

  const providerName = providers.find((p) => p.slug === provider)?.name;
  const activeFilters = [
    provider !== "all" && { key: "provider", label: providerName ?? provider, clear: () => setProvider("all") },
    assetClass !== "all" && { key: "assetClass", label: assetClass, clear: () => setAssetClass("all") },
    query.trim() && { key: "query", label: `"${query.trim()}"`, clear: () => setQuery("") },
  ].filter((f): f is { key: string; label: string; clear: () => void } => Boolean(f));

  function clearAll() {
    setProvider("all");
    setAssetClass("all");
    setQuery("");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Fund explorer</h1>
          <Badge
            variant="outline"
            className={
              source === "supabase"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                : undefined
            }
          >
            {source === "supabase" ? "Live data" : "Demo data"}
          </Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          {funds.length} funds across {providers.length} Irish providers.{" "}
          {source === "supabase" ? (
            <>
              Sourced from the National Pension Helpline fund explorer — see{" "}
              <a href="/how-it-works" className="underline underline-offset-2">
                data sources
              </a>
              .
            </>
          ) : (
            <>
              Performance figures are illustrative — see{" "}
              <a href="/how-it-works" className="underline underline-offset-2">
                data sources
              </a>
              .
            </>
          )}
        </p>
        {source === "supabase" && lastScrapeTime && (
          <p className="mt-1 text-xs text-muted-foreground">
            Fund data last updated {formatLastUpdated(lastScrapeTime)} UTC
          </p>
        )}
      </div>

      <Card className="mb-6 gap-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          Filters
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="fund-search" className="text-xs text-muted-foreground">
              Search
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fund-search"
                placeholder="Fund or provider name…"
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Provider</Label>
            <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Provider" />
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Asset class" />
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
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
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

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            {activeFilters.map((f) => (
              <button
                key={f.key}
                onClick={f.clear}
                className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
              >
                {f.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearAll}>
              Clear all
            </Button>
          </div>
        )}
      </Card>

      <p className="mb-4 text-sm text-muted-foreground">
        Showing {visible.length} of {filtered.length} funds
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-muted-foreground">No funds match your filters.</p>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((fund) => (
              <FundCard key={fund.id} fund={fund} />
            ))}
          </div>
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPagination((p) => ({ ...p, count: p.count + PAGE_SIZE }))}
              >
                Load {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function FundsPage() {
  return (
    <Suspense>
      <FundsExplorer />
    </Suspense>
  );
}
