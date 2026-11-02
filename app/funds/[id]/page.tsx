import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Field } from "@/components/editorial/field";
import { HeroCorners } from "@/components/editorial/hero-corners";
import { Ragged } from "@/components/editorial/ragged";
import { Reveal } from "@/components/editorial/reveal";
import { SectionLabel } from "@/components/editorial/section-label";
import { RiskBadge, riskTextClass } from "@/components/funds/risk-badge";
import { RiskMeter } from "@/components/funds/risk-meter";
import { AssetClassBadge } from "@/components/funds/asset-class-badge";
import { ReturnValue } from "@/components/funds/return-value";
import { getAllFunds, getFundBySlug, getLastScrapeTime } from "@/lib/data/funds.server";
import { formatAmc, formatLastUpdated } from "@/lib/utils";
import { returnFor } from "@/lib/fund-returns";

type Params = Promise<{ id: string }>;

// Rebuilt at most hourly, so a Monday scrape reaches these pages the same
// morning instead of waiting for the next deploy.
export const revalidate = 3600;

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

  const isLiveData = fund.live === true;
  const lastScrapeTime = isLiveData ? await getLastScrapeTime() : null;

  // Every figure is an average yearly return; periods the fund is too young
  // for are left out rather than shown as 0%.
  const returns = [
    { label: "1 year", value: returnFor(fund, "1y") },
    { label: "3 years, avg / yr", value: returnFor(fund, "3y") },
    { label: "5 years, avg / yr", value: returnFor(fund, "5y") },
    { label: "10 years, avg / yr", value: fund.tenYearReturn ?? null },
  ].filter((r): r is { label: string; value: number } => r.value !== null);

  // Bars are scaled against the largest absolute return on this fund, so the
  // periods stay comparable to each other without implying a market-wide scale.
  const maxAbsReturn = Math.max(...returns.map((r) => Math.abs(r.value)), 1);

  const facts = [
    { label: "provider", value: fund.providerName },
    { label: "asset class", value: fund.assetClass },
    { label: "manager", value: fund.manager ?? "—" },
    { label: "sfdr", value: fund.sfdrArticle ? `article ${fund.sfdrArticle}` : "—" },
  ];

  return (
    <>
      <Field className="inset-frame flex flex-col justify-end" tone="slate">
        <HeroCorners
          left={fund.providerName}
          right={
            isLiveData
              ? lastScrapeTime
                ? `fund data updated ${formatLastUpdated(lastScrapeTime)} utc`
                : "live data"
              : "demo data"
          }
        />
        <div className="px-6 pb-12 pt-36 md:px-10 md:pb-16 md:pt-44">
          <SectionLabel>fund</SectionLabel>
          <Ragged
            as="h1"
            className="mt-8 max-w-5xl text-[9vw] leading-[0.95] md:text-[4.4vw]"
            lines={[fund.name.toLowerCase()]}
          />
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2">
            <AssetClassBadge assetClass={fund.assetClass} />
            <RiskBadge risk={fund.riskRating} />
            <span className="lower font-mono text-xs text-muted-foreground">
              amc {formatAmc(fund.amc)}
            </span>
          </div>
        </div>
      </Field>

      <section className="px-6 py-16 md:px-10 md:py-24">
        <div className="container-page px-0 md:px-0">
          <p className="lower max-w-2xl text-base text-muted-foreground md:text-lg">
            {fund.description}
          </p>

          {/* The three figures that decide anything */}
          <div className="mt-16 grid border-t border-border md:grid-cols-3">
            <Reveal className="border-border py-8 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l">
              <p className="lower font-mono text-xs text-muted-foreground">annual charge</p>
              <p className="tabular mt-4 font-heading text-5xl tracking-tight md:text-6xl">
                {formatAmc(fund.amc)}
              </p>
              <p className="lower mt-3 text-sm text-muted-foreground">
                {fund.amc === undefined
                  ? "not published by our data source"
                  : "taken from your pot every year"}
              </p>
            </Reveal>

            <Reveal delay={90} className="border-border py-8 md:border-l md:px-8">
              <p className="lower font-mono text-xs text-muted-foreground">risk rating</p>
              <p
                className={`tabular mt-4 font-heading text-5xl tracking-tight md:text-6xl ${riskTextClass(fund.riskRating)}`}
              >
                {fund.riskRating}
                <span className="text-2xl text-muted-foreground">/7</span>
              </p>
              <RiskMeter risk={fund.riskRating} className="mt-5 max-w-56" />
              <p className="lower mt-3 text-sm text-muted-foreground">
                sri scale, 1 lowest to 7 highest
              </p>
            </Reveal>

            <Reveal delay={180} className="border-border py-8 md:border-l md:px-8">
              <p className="lower font-mono text-xs text-muted-foreground">1 year return</p>
              <ReturnValue
                value={returnFor(fund, "1y")}
                className="mt-4 font-heading text-5xl tracking-tight md:text-6xl"
              />
              <p className="lower mt-3 text-sm text-muted-foreground">
                {isLiveData ? "live figure" : "illustrative figure"}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Performance */}
      <section className="px-6 pb-16 md:px-10 md:pb-24">
        <div className="container-page px-0 md:px-0">
          <SectionLabel>performance</SectionLabel>
          <div className="mt-8 border-t border-border">
            {returns.map((r, i) => (
              <Reveal
                key={r.label}
                delay={i * 70}
                className="grid grid-cols-[6rem_1fr_4.5rem] items-center gap-5 border-b border-border py-5 md:grid-cols-[11rem_1fr_6rem] md:gap-8"
              >
                <p className="lower font-mono text-xs text-muted-foreground">{r.label}</p>
                <div className="h-px w-full bg-border">
                  <div
                    className={`h-px ${r.value >= 0 ? "bg-success" : "bg-destructive"}`}
                    style={{ width: `${(Math.abs(r.value) / maxAbsReturn) * 100}%` }}
                  />
                </div>
                <ReturnValue value={r.value} className="justify-self-end font-heading text-lg" />
              </Reveal>
            ))}
          </div>

          <p className="lower mt-6 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
            {isLiveData
              ? "1yr/3yr/5yr/10yr sourced from the national pension helpline fund explorer — see how it works."
              : "these figures are illustrative, generated from the fund's real risk rating — not live nav or return data."}
            {isLiveData && lastScrapeTime && (
              <> fund data last updated {formatLastUpdated(lastScrapeTime)} utc.</>
            )}
          </p>

          {/* Fund facts */}
          <div className="mt-16 grid gap-px border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="py-6 lg:pr-8">
                <p className="lower font-mono text-xs text-muted-foreground">{fact.label}</p>
                <p className="lower mt-2 text-base">{fact.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="px-3 pb-3">
        <div className="paper rounded-[var(--radius)] px-6 py-16 md:px-16 md:py-20">
          <SectionLabel className="!text-[#6b7671]">next</SectionLabel>
          <h2 className="lower mt-6 max-w-2xl font-heading text-[8vw] leading-[1] md:text-[3.2vw]">
            track it, compare it, or see what it does to your pot.
          </h2>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href={`/portfolio?add=${fund.slug}`}
              className="lower inline-flex items-center gap-3 rounded-full bg-[#101514] px-6 py-3.5 text-sm text-[#f5f5f2] transition-opacity hover:opacity-90"
            >
              track this fund <span aria-hidden>↗</span>
            </Link>
            <Link
              href={`/compare?funds=${fund.slug}`}
              className="lower link-underline text-sm text-[#6b7671] transition-colors hover:text-[#101514]"
            >
              add to compare
            </Link>
            <Link
              href={`/funds?provider=${fund.providerSlug}`}
              className="lower link-underline text-sm text-[#6b7671] transition-colors hover:text-[#101514]"
            >
              more from {fund.providerName.toLowerCase()}
            </Link>
            <Link
              href="/funds"
              className="lower link-underline text-sm text-[#6b7671] transition-colors hover:text-[#101514]"
            >
              back to all funds
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
