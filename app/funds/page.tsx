"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FundCard } from "@/components/funds/fund-card";
import { assetClasses, funds, providers } from "@/lib/mock-data";

function FundsExplorer() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState(searchParams.get("provider") ?? "all");
  const [assetClass, setAssetClass] = useState("all");
  const [sort, setSort] = useState<"name" | "amc-asc" | "return-desc" | "risk-asc">("name");

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
        sorted.sort((a, b) => a.amc - b.amc);
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
  }, [provider, assetClass, query, sort]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Fund explorer</h1>
        <p className="mt-2 text-muted-foreground">
          {funds.length} funds across {providers.length} Irish providers. Performance figures
          are illustrative — see{" "}
          <a href="/how-it-works" className="underline underline-offset-2">
            data sources
          </a>
          .
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search funds or providers…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={provider} onValueChange={(v) => v && setProvider(v)}>
          <SelectTrigger>
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
        <Select value={assetClass} onValueChange={(v) => v && setAssetClass(v)}>
          <SelectTrigger>
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
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name (A–Z)</SelectItem>
            <SelectItem value="amc-asc">Lowest AMC</SelectItem>
            <SelectItem value="return-desc">Highest 1yr return</SelectItem>
            <SelectItem value="risk-asc">Lowest risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">{filtered.length} funds</p>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No funds match your filters. Try broadening your search.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((fund) => (
            <FundCard key={fund.id} fund={fund} />
          ))}
        </div>
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
