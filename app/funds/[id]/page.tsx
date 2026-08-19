import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskBadge } from "@/components/funds/risk-badge";
import { funds, getFund } from "@/lib/mock-data";

type Params = Promise<{ id: string }>;

export async function generateStaticParams() {
  return funds.map((fund) => ({ id: fund.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const fund = getFund(id);
  if (!fund) return {};
  return {
    title: `${fund.name} — ${fund.providerName}`,
    description: `${fund.name} from ${fund.providerName}: ${fund.assetClass}, risk ${fund.riskRating}/7, ${fund.amc.toFixed(2)}% AMC.`,
  };
}

export default async function FundDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const fund = getFund(id);
  if (!fund) notFound();

  const returns = [
    { label: "1 year", value: fund.oneYearReturn },
    { label: "3 years (annualised)", value: fund.threeYearReturn },
    { label: "5 years (annualised)", value: fund.fiveYearReturn },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/funds"
        className={buttonVariants({ variant: "ghost", size: "sm", className: "mb-6 -ml-2" })}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to funds
      </Link>

      <p className="text-sm text-muted-foreground">{fund.providerName}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{fund.name}</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">{fund.assetClass}</Badge>
        <RiskBadge risk={fund.riskRating} />
        {fund.sfdrArticle && <Badge variant="outline">SFDR Article {fund.sfdrArticle}</Badge>}
        {fund.manager && <Badge variant="outline">Managed by {fund.manager}</Badge>}
      </div>

      <p className="mt-6 max-w-2xl text-muted-foreground">{fund.description}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{fund.amc.toFixed(2)}%</p>
            <p className="text-sm text-muted-foreground">Annual management charge (AMC)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Risk rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{fund.riskRating}/7</p>
            <p className="text-sm text-muted-foreground">
              Industry-standard SRI scale, 1 (lowest) to 7 (highest)
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Illustrative performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {returns.map((r) => (
              <div key={r.label}>
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p
                  className={`text-xl font-semibold ${r.value >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {r.value >= 0 ? "+" : ""}
                  {r.value.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            These figures are illustrative, generated from the fund&apos;s real risk rating —
            not live NAV or return data. Live performance requires the scraper integration
            described in TODO.md.
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 flex gap-3">
        <Link href={`/compare?funds=${fund.slug}`} className={buttonVariants()}>
          Add to compare
        </Link>
        <Link
          href={`/funds?provider=${fund.providerSlug}`}
          className={buttonVariants({ variant: "outline" })}
        >
          More from {fund.providerName}
        </Link>
      </div>
    </div>
  );
}
