import Link from "next/link";
import { Counter } from "@/components/editorial/counter";
import { Field } from "@/components/editorial/field";
import { HeroCorners } from "@/components/editorial/hero-corners";
import { Magnetic } from "@/components/editorial/magnetic";
import { Marquee } from "@/components/editorial/marquee";
import { Ragged } from "@/components/editorial/ragged";
import { Reveal } from "@/components/editorial/reveal";
import { SectionLabel } from "@/components/editorial/section-label";
import { AnimatedText } from "@/components/editorial/animated-text";
import { getAllFunds, getAllProviders, getLastScrapeTime } from "@/lib/data/funds.server";
import { formatLastUpdated } from "@/lib/utils";

const tools = [
  {
    no: "01",
    href: "/funds",
    title: "explore funds",
    items: ["every provider, one list", "filter by asset class", "risk 1–7 at a glance", "charges side by side"],
  },
  {
    no: "02",
    href: "/compare",
    title: "compare funds",
    items: ["up to four at once", "lowest charge flagged", "highest return flagged", "shareable by url"],
  },
  {
    no: "03",
    href: "/calculator",
    title: "project your pot",
    items: ["revenue age-related limits", "€115,000 earnings cap", "charge drag over time", "growth vs contributions"],
  },
  {
    no: "04",
    href: "/ai-suggestions",
    title: "ask for a shortlist",
    items: ["describe your risk appetite", "grounded in the catalog", "plain-text answers", "not advice, a starting point"],
  },
];

export default async function Home() {
  const [funds, providers, lastScrapeTime] = await Promise.all([
    getAllFunds(),
    getAllProviders(),
    getLastScrapeTime(),
  ]);

  const lowestAmc = funds.reduce<number | undefined>(
    (lowest, fund) =>
      fund.amc === undefined ? lowest : lowest === undefined ? fund.amc : Math.min(lowest, fund.amc),
    undefined,
  );

  const metrics = [
    { value: funds.length, label: "funds tracked", suffix: "" },
    { value: providers.length, label: "irish providers", suffix: "" },
    { value: lowestAmc ?? 0, label: "lowest annual charge", suffix: "%", decimals: 2 },
    { value: 40, label: "max tax relief at 60+", suffix: "%" },
  ];

  return (
    <>
      {/* Hero */}
      <Field className="inset-frame flex min-h-[94svh] flex-col justify-between" tone="teal">
        <HeroCorners left="irish pension fund explorer" right="free · no account needed" />

        <div className="flex flex-1 items-center px-6 pt-40 md:px-10">
          <Ragged
            as="h1"
            className="w-full text-[12vw] leading-[0.92] md:text-[7vw]"
            lines={["every irish pension", "fund — compared,", "projected, explained."]}
          />
        </div>

        <div className="px-6 pb-10 md:px-10">
          <Magnetic>
            <Link
              href="/funds"
              className="lower pill group inline-flex items-center gap-3 rounded-full px-6 py-3.5 text-sm transition-colors hover:text-primary"
            >
              explore the funds
              <span className="animate-nudge inline-block" aria-hidden="true">
                ↗
              </span>
            </Link>
          </Magnetic>

          <div className="mt-12 grid gap-6 border-t border-border pt-8 sm:grid-cols-3">
            {[
              [`${funds.length} funds,`, `${providers.length} irish providers`],
              ["sourced from public", "provider fund centres"],
              ["research tool,", "not financial advice"],
            ].map(([top, bottom], i) => (
              <Reveal key={top} delay={i * 90}>
                <p className="lower text-sm">{top}</p>
                <p className="lower text-sm text-muted-foreground">{bottom}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Field>

      {/* Statement + figures */}
      <section className="px-6 py-28 md:px-10 md:py-40">
        <div className="container-page px-0 md:px-0">
          <SectionLabel>the problem</SectionLabel>
          <Ragged
            as="h2"
            className="mt-10 max-w-5xl text-[8vw] leading-[1] md:text-[4.2vw]"
            lines={["your pension is a fund", "you have never seen."]}
          />
          <div className="mt-14 grid gap-10 border-t border-border pt-10 md:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <p className="lower max-w-md text-base text-muted-foreground md:text-lg">
                irish pension information lives in provider pdfs, one fund at a time. we pull the
                whole market into one list you can search — then show what the charges and the tax
                relief actually do to your pot.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="grid grid-cols-2 gap-x-10 gap-y-8">
                {metrics.map((metric) => (
                  <div key={metric.label} className="border-t border-border pt-5">
                    <div className="tabular font-heading text-4xl tracking-tight md:text-6xl">
                      <Counter
                        to={metric.value}
                        suffix={metric.suffix}
                        decimals={metric.decimals}
                      />
                    </div>
                    <div className="lower mt-2 font-mono text-xs text-muted-foreground">
                      {metric.label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Tools — numbered columns divided by hairlines */}
      <section className="px-6 pb-28 md:px-10 md:pb-40">
        <div className="container-page px-0 md:px-0">
          <SectionLabel>the tools</SectionLabel>
          <AnimatedText
            as="h2"
            className="lower mt-10 block max-w-3xl text-[7vw] leading-[1] md:text-[3.4vw]"
            text="four tools, one catalog."
          />

          <div className="mt-16 grid border-t border-border md:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool, i) => (
              // The rule sits on the grid item itself, and is dropped on the
              // first column of each row so rows don't open with a stray line.
              <Reveal
                key={tool.title}
                delay={i * 90}
                className="border-border md:border-l md:[&:nth-child(2n+1)]:border-l-0 lg:[&:nth-child(2n+1)]:border-l lg:[&:nth-child(4n+1)]:border-l-0"
              >
                <Link
                  href={tool.href}
                  className="group flex h-full min-h-[22rem] flex-col justify-between py-8 transition-colors md:px-8"
                >
                  <div>
                    <span className="font-mono text-sm text-primary">{tool.no}</span>
                    <h3 className="lower mt-5 font-heading text-2xl tracking-tight transition-colors group-hover:text-primary md:text-3xl">
                      {tool.title}
                    </h3>
                  </div>
                  <ul className="mt-10 space-y-2.5">
                    {tool.items.map((item) => (
                      <li key={item} className="lower text-sm text-muted-foreground">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Providers ticker */}
      <section className="border-t border-border py-12">
        <p className="lower container-page mb-6 font-mono text-xs text-muted-foreground">
          the providers we track
        </p>
        <Marquee items={providers.map((provider) => provider.name)} />
        {lastScrapeTime && (
          <p className="lower container-page mt-6 font-mono text-xs text-muted-foreground">
            fund data last updated {formatLastUpdated(lastScrapeTime)} utc
          </p>
        )}
      </section>

      {/* The inverted moment */}
      <section className="px-3 pb-3">
        <div className="paper rounded-[var(--radius)] px-6 py-20 md:px-16 md:py-28">
          <SectionLabel className="!text-[#6b7671]">your turn</SectionLabel>
          <AnimatedText
            as="h2"
            className="lower mt-8 block max-w-3xl text-[9vw] leading-[1] md:text-[4.4vw]"
            text="see what your pension could be worth."
          />
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Magnetic>
              <Link
                href="/calculator"
                className="lower group inline-flex items-center gap-3 rounded-full bg-[#101514] px-6 py-3.5 text-sm text-[#f5f5f2] transition-opacity hover:opacity-90"
              >
                open the calculator
                <span className="animate-nudge inline-block" aria-hidden="true">
                  ↗
                </span>
              </Link>
            </Magnetic>
            <Link
              href="/how-it-works"
              className="lower link-underline text-sm text-[#6b7671] transition-colors hover:text-[#101514]"
            >
              how the numbers work
            </Link>
          </div>
          <div className="mt-16 flex flex-col gap-2 border-t border-[rgba(16,21,20,0.14)] pt-6 font-mono text-xs text-[#6b7671] sm:flex-row sm:items-center sm:justify-between">
            <span className="lower">ireland · revenue age-related relief rules</span>
            <span className="lower">or browse the {funds.length} funds ↗</span>
          </div>
        </div>
      </section>
    </>
  );
}
