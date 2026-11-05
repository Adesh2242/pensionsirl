import Link from "next/link";
import { providers } from "@/lib/mock-data";
import { PageIntro } from "@/components/editorial/page-intro";
import { Reveal } from "@/components/editorial/reveal";
import { SectionLabel } from "@/components/editorial/section-label";

export const metadata = {
  title: "How it Works",
  description: "How PensionIQ sources its data and calculates retirement projections.",
};

const faqs = [
  {
    q: "where does the fund data come from?",
    a: "Provider names, fund names, asset classes, risk ratings, and 1/3/5/10-year return figures are sourced weekly from each provider's public fund centre and the National Pension Helpline fund explorer (funds.nationalpensionhelpline.ie) via scripts/scrape-funds.ts. NAV isn't published by this source — only returns are.",
  },
  {
    q: "how does my portfolio value change between statements?",
    a: "The fund data source publishes returns, not daily unit prices, so each holding is moved day by day with market indices that match what the fund invests in — for example global shares for a global equity fund, or a share/bond mix for a managed fund — using end-of-day prices of euro-priced index ETFs (via Yahoo Finance), less the fund's charge, plus your contributions. It's an estimate: close for index funds, rougher for actively managed ones. Update a holding from your latest statement to reset it to the exact figure.",
  },
  {
    q: "how is the tax relief calculated?",
    a: "The calculator uses Revenue.ie's age-related percentage limits on net relevant earnings (15% under 30, rising to 40% at 60+) and the €115,000 earnings cap for relief purposes, applied to your marginal tax rate.",
  },
  {
    q: "is this financial advice?",
    a: "No. PensionIQ is an information and comparison tool. Figures are illustrative and you should speak to a qualified financial advisor before making pension decisions.",
  },
  {
    q: "what happens to my data?",
    a: "Your account and portfolio are stored in the EU (Amsterdam) and only you can see them. Settings lets you export everything or delete your account; see the privacy policy for details.",
  },
];

const steps = [
  {
    no: "01",
    title: "we pull the catalog",
    body: "a weekly scrape of each provider's public fund centre, normalised into one schema: provider, asset class, risk rating, charge, returns.",
  },
  {
    no: "02",
    title: "you filter and compare",
    body: "search the whole market at once, then put up to four funds side by side with the lowest charge and highest return flagged.",
  },
  {
    no: "03",
    title: "the numbers get real",
    body: "the calculator applies revenue's age-related relief limits and the €115,000 cap, then compounds your fund's charge against the projected pot.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageIntro
        label="how it works"
        lines={["where the numbers", "come from."]}
        tone="slate"
        corners={{ left: "sources & method", right: "updated weekly" }}
        lead="no black box: every figure on this site is either scraped from a public provider fund centre or calculated from revenue's published rules."
      />

      <section className="px-6 py-16 md:px-10 md:py-24">
        <div className="container-page px-0 md:px-0">
          <SectionLabel>method</SectionLabel>
          <div className="mt-10 grid border-t border-border md:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal
                key={step.no}
                delay={i * 90}
                className="border-border py-8 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l"
              >
                <span className="font-mono text-sm text-primary">{step.no}</span>
                <h2 className="lower mt-5 font-heading text-2xl tracking-tight md:text-3xl">
                  {step.title}
                </h2>
                <p className="lower mt-5 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 pb-16 md:px-10 md:pb-24">
        <div className="container-page px-0 md:px-0">
          <SectionLabel>questions</SectionLabel>
          <dl className="mt-10 border-t border-border">
            {faqs.map((faq, i) => (
              <Reveal
                key={faq.q}
                delay={i * 60}
                className="grid gap-4 border-b border-border py-8 md:grid-cols-[1fr_1.3fr] md:gap-12"
              >
                <dt className="lower font-heading text-xl tracking-tight md:text-2xl">{faq.q}</dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{faq.a}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-6 pb-20 md:px-10 md:pb-28">
        <div className="container-page px-0 md:px-0">
          <SectionLabel>providers covered</SectionLabel>
          <ul className="mt-10 border-t border-border">
            {providers.map((provider, i) => (
              <li key={provider.slug}>
                <Link
                  href={`/funds?provider=${provider.slug}`}
                  className="row-link group flex items-baseline justify-between gap-6 border-b border-border py-5"
                >
                  <span className="flex items-baseline gap-5">
                    <span className="tabular font-mono text-xs text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="lower font-heading text-xl tracking-tight transition-colors group-hover:text-primary md:text-2xl">
                      {provider.name}
                    </span>
                  </span>
                  <span className="lower tabular shrink-0 font-mono text-xs text-muted-foreground">
                    {provider.realFundCount} funds ↗
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
