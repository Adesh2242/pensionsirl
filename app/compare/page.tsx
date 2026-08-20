"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiskBadge } from "@/components/funds/risk-badge";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { useFunds } from "@/lib/hooks/use-funds";
import { formatAmc } from "@/lib/utils";

const MAX_COMPARE = 4;

function ReturnValue({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
      {value >= 0 ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

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

function ComparePage() {
  const { funds } = useFunds();
  const { slugs, setSlugs } = useSelectedSlugs();
  const selectedFunds = slugs
    .map((slug) => funds.find((f) => f.slug === slug))
    .filter((f): f is (typeof funds)[number] => Boolean(f));

  const availableFunds = funds.filter((f) => !slugs.includes(f.slug));

  function addFund(slug: string) {
    if (slugs.includes(slug) || slugs.length >= MAX_COMPARE) return;
    setSlugs([...slugs, slug]);
  }

  function removeFund(slug: string) {
    setSlugs(slugs.filter((s) => s !== slug));
  }

  const rows: { label: string; render: (f: (typeof funds)[number]) => React.ReactNode }[] = [
    { label: "Provider", render: (f) => f.providerName },
    { label: "Asset class", render: (f) => <AssetClassBadge assetClass={f.assetClass} /> },
    { label: "Risk rating", render: (f) => <RiskBadge risk={f.riskRating} /> },
    { label: "AMC", render: (f) => formatAmc(f.amc) },
    { label: "1yr return", render: (f) => <ReturnValue value={f.oneYearReturn} /> },
    { label: "3yr return (ann.)", render: (f) => <ReturnValue value={f.threeYearReturn} /> },
    { label: "5yr return (ann.)", render: (f) => <ReturnValue value={f.fiveYearReturn} /> },
    { label: "Manager", render: (f) => f.manager ?? "—" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Compare funds</h1>
      <p className="mt-2 text-muted-foreground">
        Pick up to {MAX_COMPARE} funds to compare side-by-side. Your selection is saved in the
        URL, so you can share this comparison.
      </p>

      <div className="mt-6 max-w-sm space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="add-fund" className="text-xs text-muted-foreground">
            Add a fund
          </Label>
          <span className="text-xs text-muted-foreground">
            {slugs.length}/{MAX_COMPARE} selected
          </span>
        </div>
        <Select
          onValueChange={(v: string | null) => v && addFund(v)}
          disabled={slugs.length >= MAX_COMPARE}
        >
          <SelectTrigger id="add-fund" className="w-full">
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

      {selectedFunds.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400">
            <Scale className="h-5 w-5" aria-hidden />
          </div>
          <p className="text-muted-foreground">No funds selected yet. Add up to {MAX_COMPARE} above to compare them side-by-side.</p>
          <Link href="/funds" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Browse the fund explorer
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-40 border-b p-3 text-left align-bottom text-muted-foreground">
                  &nbsp;
                </th>
                {selectedFunds.map((f) => (
                  <th key={f.slug} className="min-w-[200px] border-b p-3 text-left align-bottom">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{f.providerName}</p>
                        <Link href={`/funds/${f.slug}`} className="font-semibold hover:underline">
                          {f.name}
                        </Link>
                      </div>
                      <button
                        onClick={() => removeFund(f.slug)}
                        aria-label={`Remove ${f.name}`}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="odd:bg-muted/30">
                  <td className="border-b p-3 font-medium text-muted-foreground">{row.label}</td>
                  {selectedFunds.map((f) => (
                    <td key={f.slug} className="border-b p-3">
                      {row.render(f)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFunds.length > 0 && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSlugs([])}>
          Clear all
        </Button>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ComparePage />
    </Suspense>
  );
}
