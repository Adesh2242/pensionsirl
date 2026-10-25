import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ChevronRight, Coins, Info, ShieldAlert, TrendingUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge, riskTextClass } from "@/components/funds/risk-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { ReturnValue } from "@/components/funds/return-value";
import { getAllFunds, getFundBySlug, getLastScrapeTime } from "@/lib/data/funds.server";
import { hueForName } from "@/lib/color-hash";
import { formatAmc, formatLastUpdated } from "@/lib/utils";

type Params = Promise<{ id: string }>;

export async function generateStaticParams() {
  const funds = await getAllFunds();
  return funds.map((fund) => ({ id: fund.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const fund = await getFundBySlug(id);
  if (!fund) return {};
  return {
    title: `${fund.name} — ${fund.providerName}`,
    description: `${fund.name} from ${fund.providerName}: ${fund.assetClass}, risk ${fund.riskRating}/7, ${formatAmc(fund.amc)} AMC.`,
  };
}

export default async function FundDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const fund = await getFundBySlug(id);
  if (!fund) notFound();

  // tenYearReturn is only ever set by the live scraper (mock data never sets
  // it), so its presence is a reliable signal for which disclaimer to show.
  const isLiveData = fund.tenYearReturn !== undefined;
  const lastScrapeTime = isLiveData ? await getLastScrapeTime() : null;

  const returns = [
    { label: "1 year", value: fund.oneYearReturn },
    { label: "3 years (ann.)", value: fund.threeYearReturn },
    { label: "5 years (ann.)", value: fund.fiveYearReturn },
    ...(fund.tenYearReturn !== undefined
      ? [{ label: "10 years (ann.)", value: fund.tenYearReturn }]
      : []),
  ];

  // Bars are scaled against the largest absolute return on this fund, so the
  // periods stay comparable to each other without implying a market-wide scale.
  const maxAbsReturn = Math.max(...returns.map((r) => Math.abs(r.value)), 1);

  return (
    <>
      <header className="relative overflow-hidden border-b bg-gradient-to-b from-accent/40 to-background">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="container-page relative py-8 sm:py-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/funds" className="hover:text-foreground">
              Funds
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <Link href={`/funds?provider=${fund.providerSlug}`} className="hover:text-foreground">
              {fund.providerName}
            </Link>
            <ChevronRight className="h-3 w-3" aria-hidden />
            <span className="truncate text-foreground">{fund.name}</span>
          </nav>

          <div className="mt-5 flex items-start gap-4">
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold ${hueForName(fund.providerName)}`}
              aria-hidden
            >
              {fund.providerName[0]}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{fund.providerName}</p>
              <h1 className="mt-0.5 text-3xl font-semibold sm:text-4xl">{fund.name}</h1>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <AssetClassBadge assetClass={fund.assetClass} />
            <RiskBadge risk={fund.riskRating} />
            {fund.sfdrArticle && <Badge variant="outline">SFDR Article {fund.sfdrArticle}</Badge>}
            {fund.manager && <Badge variant="outline">Managed by {fund.manager}</Badge>}
          </div>

          <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
            {fund.description}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={`/portfolio?add=${fund.slug}`}
              className={buttonVariants({ size: "lg", className: "h-10" })}
            >
              Track this fund
            </Link>
            <Link
              href={`/compare?funds=${fund.slug}`}
              className={buttonVariants({ size: "lg", variant: "outline", className: "h-10" })}
            >
              Add to compare
            </Link>
            <Link
              href={`/funds?provider=${fund.providerSlug}`}
              className={buttonVariants({ size: "lg", variant: "ghost", className: "h-10" })}
            >
              More from {fund.providerName}
            </Link>
          </div>
        </div>
      </header>

      <div className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="shadow-soft">
            <CardHeader>
              <div className="icon-tile size-10 text-chart-1">
                <Coins className="h-4.5 w-4.5" aria-hidden />
              </div>
              <CardTitle className="mt-2 text-sm text-muted-foreground">Annual charge</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="tabular text-3xl font-semibold">{formatAmc(fund.amc)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fund.amc === undefined
                  ? "Not published by our data source"
                  : "Annual management charge (AMC)"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <div className={`icon-tile size-10 ${riskTextClass(fund.riskRating)}`}>
                <ShieldAlert className="h-4.5 w-4.5" aria-hidden />
              </div>
              <CardTitle className="mt-2 text-sm text-muted-foreground">Risk rating</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`tabular text-3xl font-semibold ${riskTextClass(fund.riskRating)}`}>
                {fund.riskRating}
                <span className="text-xl text-muted-foreground">/7</span>
              </p>
              <RiskMeter risk={fund.riskRating} className="mt-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                SRI scale, 1 (lowest) to 7 (highest)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader>
              <div className="icon-tile size-10 text-chart-4">
                <TrendingUp className="h-4.5 w-4.5" aria-hidden />
              </div>
              <CardTitle className="mt-2 text-sm text-muted-foreground">1 year return</CardTitle>
            </CardHeader>
            <CardContent>
              <ReturnValue value={fund.oneYearReturn} className="text-3xl font-semibold" />
              <p className="mt-1 text-sm text-muted-foreground">
                {fund.assetClass} fund, {isLiveData ? "live figure" : "illustrative figure"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-5 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Performance by period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {returns.map((r) => {
              const width = (Math.abs(r.value) / maxAbsReturn) * 100;
              return (
                <div key={r.label} className="grid grid-cols-[8.5rem_1fr_4rem] items-center gap-3">
                  <p className="text-sm text-muted-foreground">{r.label}</p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${r.value >= 0 ? "bg-success" : "bg-destructive"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <ReturnValue value={r.value} className="justify-self-end text-sm" />
                </div>
              );
            })}

            <p className="flex items-start gap-2 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {isLiveData
                  ? "1yr/3yr/5yr/10yr sourced from the National Pension Helpline fund explorer — see How it Works."
                  : "These figures are illustrative, generated from the fund's real risk rating — not live NAV or return data. Live performance requires the scraper integration described in TODO.md."}
                {isLiveData && lastScrapeTime && (
                  <> Fund data last updated {formatLastUpdated(lastScrapeTime)} UTC.</>
                )}
              </span>
            </p>
          </CardContent>
        </Card>

        <Link
          href="/funds"
          className={buttonVariants({ variant: "ghost", size: "sm", className: "mt-8 -ml-2" })}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to all funds
        </Link>
      </div>
    </>
  );
}
