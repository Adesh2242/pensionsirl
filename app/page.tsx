import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calculator,
  CalendarClock,
  Landmark,
  Lock,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAllFunds, getAllProviders, getLastScrapeTime } from "@/lib/data/funds.server";
import { hueForName } from "@/lib/color-hash";
import { formatLastUpdated } from "@/lib/utils";

const trustSignals = [
  { icon: Lock, label: "Free, no account needed to browse" },
  { icon: Landmark, label: "Sourced from official provider fund centres" },
  { icon: ShieldCheck, label: "Not regulated financial advice — for research only" },
];

const features = [
  {
    href: "/funds",
    icon: Search,
    title: "Explore funds",
    description: "Search and filter pension funds by provider, asset class, risk rating and AMC.",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    href: "/compare",
    icon: Scale,
    title: "Compare side-by-side",
    description: "Pick funds from any provider and compare charges, risk and illustrative performance.",
    color: "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
  },
  {
    href: "/calculator",
    icon: Calculator,
    title: "Project your pot",
    description: "Model your retirement pot using real Irish Revenue age-related tax relief rules.",
    color: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    href: "/ai-suggestions",
    icon: Sparkles,
    title: "Get AI suggestions",
    description: "Describe your risk appetite and get a shortlist of funds worth researching further.",
    color: "bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  },
];

export default async function Home() {
  const [funds, providers, lastScrapeTime] = await Promise.all([
    getAllFunds(),
    getAllProviders(),
    getLastScrapeTime(),
  ]);

  const stats = [
    {
      icon: Wallet,
      value: String(funds.length),
      label: "Funds tracked",
      color: "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    },
    {
      icon: Building2,
      value: String(providers.length),
      label: "Irish providers",
      color: "bg-teal-100 text-teal-600 dark:bg-teal-950 dark:text-teal-400",
    },
    {
      icon: CalendarClock,
      value: lastScrapeTime ? formatLastUpdated(lastScrapeTime)!.split(",")[0] : "Weekly",
      label: "Fund data refreshed",
      color: "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    },
  ];

  return (
    <div className="flex flex-col">
      <section className="border-b bg-gradient-to-b from-blue-50 via-muted/30 to-background dark:from-blue-950/20 dark:via-muted/30 dark:to-background">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Make sense of your Irish pension
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
            Compare pension funds from {providers.length} Irish providers, project your
            retirement pot with real tax relief rules, and get AI-powered suggestions — all in
            one place.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/funds" className={buttonVariants({ size: "lg" })}>
              Explore funds
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/calculator" className={buttonVariants({ size: "lg", variant: "outline" })}>
              Try the calculator
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {trustSignals.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <t.icon className="h-3.5 w-3.5" aria-hidden />
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="mx-auto grid max-w-3xl grid-cols-3 gap-4 px-4 py-10">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5" aria-hidden />
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${feature.color}`}>
                    <feature.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="mt-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Providers covered</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {providers.map((provider) => (
              <Link
                key={provider.slug}
                href={`/funds?provider=${provider.slug}`}
                className="flex items-center gap-3 rounded-lg border bg-background p-4 text-sm transition-colors hover:border-primary/50"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${hueForName(provider.name)}`}
                  aria-hidden
                >
                  {provider.name[0]}
                </div>
                <div>
                  <p className="font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">{provider.realFundCount} funds</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
