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
    description:
      "Search and filter pension funds by provider, asset class, risk rating and annual charge.",
    tone: "text-chart-1",
  },
  {
    href: "/compare",
    icon: Scale,
    title: "Compare side-by-side",
    description:
      "Pick funds from any provider and compare charges, risk and illustrative performance.",
    tone: "text-chart-2",
  },
  {
    href: "/calculator",
    icon: Calculator,
    title: "Project your pot",
    description:
      "Model your retirement pot using real Irish Revenue age-related tax relief rules.",
    tone: "text-chart-3",
  },
  {
    href: "/ai-suggestions",
    icon: Sparkles,
    title: "Get AI suggestions",
    description:
      "Describe your risk appetite and get a shortlist of funds worth researching further.",
    tone: "text-chart-5",
  },
];

const steps = [
  {
    title: "Find funds that fit",
    body: "Filter the whole Irish market by provider, asset class, risk band and charge — no account, no sales call.",
  },
  {
    title: "Compare what matters",
    body: "Put up to four funds side-by-side. Charges and returns are highlighted so the better number is obvious.",
  },
  {
    title: "See what it means for you",
    body: "Project your pot to retirement with Revenue's age-related relief limits, then track what you actually hold.",
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
      tone: "text-chart-1",
    },
    {
      icon: Building2,
      value: String(providers.length),
      label: "Irish providers",
      tone: "text-chart-2",
    },
    {
      icon: CalendarClock,
      value: lastScrapeTime ? formatLastUpdated(lastScrapeTime)!.split(",")[0] : "Weekly",
      label: "Fund data refreshed",
      tone: "text-chart-3",
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-glow relative isolate overflow-hidden border-b">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="container-page relative py-20 text-center sm:py-28">
          <p className="animate-fade-in inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            {funds.length} funds · {providers.length} Irish providers · refreshed weekly
          </p>

          <h1 className="animate-fade-up mt-6 text-4xl font-semibold leading-[1.08] sm:text-6xl">
            Make sense of
            <br className="hidden sm:block" />{" "}
            <span className="text-gradient">your Irish pension</span>
          </h1>

          <p
            className="animate-fade-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground"
            style={{ animationDelay: "80ms" }}
          >
            Compare pension funds from {providers.length} Irish providers, project your
            retirement pot with real tax relief rules, and get AI-powered suggestions — all in
            one place.
          </p>

          <div
            className="animate-fade-up mt-9 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "160ms" }}
          >
            <Link href="/funds" className={buttonVariants({ size: "lg", className: "h-11 px-5 text-sm" })}>
              Explore funds
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/calculator"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "h-11 px-5 text-sm",
              })}
            >
              Try the calculator
            </Link>
          </div>

          <ul
            className="animate-fade-up mt-10 flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5"
            style={{ animationDelay: "240ms" }}
          >
            {trustSignals.map((signal) => (
              <li
                key={signal.label}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <signal.icon className="h-3.5 w-3.5 text-primary/70" aria-hidden />
                {signal.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats band — the numbers that justify the claims above. */}
      <section className="border-b bg-card/60">
        <div className="container-page grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-center gap-4 py-7 sm:justify-start sm:px-8 sm:first:pl-0 sm:last:pr-0"
            >
              <div className={`icon-tile size-11 ${stat.tone}`}>
                <stat.icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="tabular text-2xl font-semibold leading-tight">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature cards */}
      <section className="container-page py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Everything in one place
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Four tools, no spreadsheets</h2>
          <p className="mt-3 text-muted-foreground">
            Pension information in Ireland is scattered across provider PDFs. This pulls it
            into one place you can actually search.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Link key={feature.href} href={feature.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="card-interactive h-full">
                <CardHeader>
                  <div className={`icon-tile size-11 ${feature.tone}`}>
                    <feature.icon className="h-5 w-5" aria-hidden />
                  </div>
                  <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex h-full flex-col">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Open
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/40">
        <div className="container-page py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-semibold">From 400 funds to a shortlist</h2>
          </div>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative rounded-xl border bg-card p-6 shadow-soft">
                <span className="tabular flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <p className="mt-4 font-medium">{step.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Providers */}
      <section className="container-page py-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold">Providers covered</h2>
            <p className="mt-2 text-muted-foreground">
              Every major Irish pension provider, with fund counts from their public fund
              centres.
            </p>
          </div>
          <Link
            href="/funds"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Browse all funds
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                <span className="block text-xs text-muted-foreground">
                  {provider.realFundCount} funds
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t bg-card/60">
        <div className="container-page py-16">
          <div className="bg-glow relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/60 to-card px-6 py-14 text-center shadow-soft sm:px-12">
            <div className="bg-grid absolute inset-0" aria-hidden />
            <div className="relative">
              <h2 className="text-3xl font-semibold">See what your pension could be worth</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Use the calculator to project your pot to retirement — including the tax relief
                you&apos;re entitled to and the drag your fund&apos;s charges apply.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/calculator"
                  className={buttonVariants({ size: "lg", className: "h-11 px-5 text-sm" })}
                >
                  Open the calculator
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className={buttonVariants({
                    size: "lg",
                    variant: "outline",
                    className: "h-11 px-5 text-sm",
                  })}
                >
                  How the numbers work
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
