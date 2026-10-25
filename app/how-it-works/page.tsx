import Link from "next/link";
import { Database, LineChart, ScrollText, ShieldCheck } from "lucide-react";
import { providers } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { hueForName } from "@/lib/color-hash";

export const metadata = {
  title: "How it Works",
  description: "How PensionIQ sources its data and calculates retirement projections.",
};

const faqs = [
  {
    icon: Database,
    tone: "text-chart-1",
    q: "Where does the fund data come from?",
    a: "Provider names, fund names, asset classes, risk ratings, and 1/3/5/10-year return figures are sourced weekly from each provider's public fund centre and the National Pension Helpline fund explorer (funds.nationalpensionhelpline.ie) via scripts/scrape-funds.ts. NAV isn't published by this source — only returns are.",
  },
  {
    icon: LineChart,
    tone: "text-chart-3",
    q: "How is the tax relief calculated?",
    a: "The calculator uses Revenue.ie's age-related percentage limits on net relevant earnings (15% under 30, rising to 40% at 60+) and the €115,000 earnings cap for relief purposes, applied to your marginal tax rate.",
  },
  {
    icon: ScrollText,
    tone: "text-chart-5",
    q: "Is this financial advice?",
    a: "No. PensionIQ is an information and comparison tool. Figures are illustrative and you should speak to a qualified financial advisor before making pension decisions.",
  },
  {
    icon: ShieldCheck,
    tone: "text-chart-4",
    q: "What happens to my data?",
    a: "In demo mode, accounts and saved preferences live only in your browser's local storage — nothing is sent to a server. See Settings for data export and deletion.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHeader
        title="How PensionIQ works"
        description="A quick guide to where our data comes from and how the numbers are calculated."
      />

      <div className="container-page py-10">
        <div className="grid gap-5 md:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.q} className="shadow-soft">
              <CardHeader>
                <div className={`icon-tile size-10 ${faq.tone}`}>
                  <faq.icon className="h-4.5 w-4.5" aria-hidden />
                </div>
                <CardTitle className="mt-3 text-base">{faq.q}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Providers covered</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fund counts are the real totals each provider lists publicly.
              </p>
            </div>
            <Link href="/funds" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Browse the fund explorer
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <Link
                key={provider.slug}
                href={`/funds?provider=${provider.slug}`}
                className="card-interactive flex items-center gap-3 rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${hueForName(provider.name)}`}
                  aria-hidden
                >
                  {provider.name[0]}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{provider.name}</span>
                  <span className="tabular block text-xs text-muted-foreground">
                    {provider.realFundCount} funds
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
