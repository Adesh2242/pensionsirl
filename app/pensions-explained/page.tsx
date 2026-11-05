import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/editorial/page-intro";
import { SectionLabel } from "@/components/editorial/section-label";
import { Disclaimer } from "@/components/legal/disclaimer";
import { EARNINGS_CAP, ageRelatedLimitPct } from "@/lib/calculations";
import {
  AUTO_ENROLMENT,
  GUIDE_CHECKED,
  OFFICIAL_LINKS,
  RETIREMENT,
  SOURCES,
  STATE_PENSION,
} from "@/lib/pension-guide";

export const metadata: Metadata = {
  title: "Irish Pensions Explained",
  description:
    "How pensions work in Ireland, in plain English: the State Pension, auto-enrolment, workplace and personal pensions, tax relief and what happens when you retire. Based on official government sources.",
};

const euro = (n: number, decimals = 0) =>
  `€${n.toLocaleString("en-IE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

const contents = [
  { id: "basics", label: "the three parts" },
  { id: "state-pension", label: "state pension" },
  { id: "auto-enrolment", label: "auto-enrolment" },
  { id: "workplace", label: "workplace pensions" },
  { id: "personal", label: "personal pensions" },
  { id: "tax-relief", label: "tax relief" },
  { id: "retiring", label: "when you retire" },
  { id: "first-steps", label: "first steps" },
  { id: "glossary", label: "glossary" },
  { id: "help", label: "where to get help" },
  { id: "official-links", label: "official links" },
];

function Section({
  id,
  no,
  title,
  lead,
  children,
}: {
  id: string;
  no: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border pt-12 md:pt-16">
      <div className="grid gap-8 md:grid-cols-[14rem_1fr] md:gap-12">
        <div className="min-w-0">
          <span className="font-mono text-sm text-primary">{no}</span>
          <h2 className="lower mt-4 font-heading text-3xl tracking-tight [overflow-wrap:anywhere] md:text-4xl">
            {title}
          </h2>
        </div>
        <div className="min-w-0 max-w-3xl">
          <p className="text-lg leading-relaxed text-foreground md:text-xl">{lead}</p>
          <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

/** "In plain terms" box: what a rule means for the reader. */
function MeansForYou({ children }: { children: ReactNode }) {
  return (
    <div className="border-l-2 border-primary bg-primary/5 py-4 pr-4 pl-5">
      <p className="lower mb-1.5 font-mono text-xs text-primary">what this means for you</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

function Rules({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link-underline text-foreground">
      {children} ↗
    </a>
  );
}

function Sources({ links }: { links: [string, string][] }) {
  return (
    <p className="lower font-mono text-xs text-muted-foreground">
      official sources:{" "}
      {links.map(([label, href], i) => (
        <span key={href}>
          {i > 0 && " · "}
          <Source href={href}>{label}</Source>
        </span>
      ))}
    </p>
  );
}

function Table({ head, rows, note }: { head: string[]; rows: ReactNode[][]; note?: ReactNode }) {
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="lower border-b border-border font-mono text-xs text-muted-foreground">
              {head.map((h, i) => (
                <th key={h} className={`pb-3 align-bottom font-normal ${i > 0 ? "pl-4 text-right" : ""}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-border">
                {row.map((cell, c) => (
                  <td key={c} className={`tabular py-3 ${c > 0 ? "pl-4 text-right whitespace-nowrap text-foreground" : ""}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="mt-3 font-mono text-xs">{note}</p>}
    </div>
  );
}

const pillars = [
  {
    no: "01",
    title: "the state pension",
    body: "A weekly payment from the government from age 66. How much you get depends on the PRSI you've paid over your working life.",
    href: "#state-pension",
  },
  {
    no: "02",
    title: "workplace pensions",
    body: "Savings through your job: your employer's scheme, or auto-enrolment (MyFutureFund) if you don't have one. Your employer pays in too.",
    href: "#workplace",
  },
  {
    no: "03",
    title: "your own pension",
    body: "A PRSA or personal pension you set up yourself. Useful if you're self-employed or want to save more. You get tax relief on what you pay in.",
    href: "#personal",
  },
];

const ageBands = [
  { label: "Under 30", age: 25 },
  { label: "30 to 39", age: 35 },
  { label: "40 to 49", age: 45 },
  { label: "50 to 54", age: 52 },
  { label: "55 to 59", age: 57 },
  { label: "60 and over", age: 62 },
];

const glossary: [string, string][] = [
  ["PRSI", "Pay Related Social Insurance — taken from your wages. Your PRSI record decides your State Pension."],
  ["Contribution", "One week of PRSI paid. 52 a year if you work all year."],
  ["Credits", "PRSI weeks the State gives you when you can't work, e.g. while unemployed, ill or caring. They count towards your State Pension."],
  ["Defined benefit (DB)", "A workplace pension that promises a set income, usually based on your salary and years of service."],
  ["Defined contribution (DC)", "A pension pot built from what's paid in plus investment growth. What you get depends on how the pot does."],
  ["AVC", "Additional voluntary contribution — extra money you pay into your workplace pension on top of the normal amount."],
  ["PRSA", "Personal Retirement Savings Account — a pension you own and can bring from job to job."],
  ["AMC", "Annual management charge — the yearly fee taken from your pension pot, as a % of its value."],
  ["Annuity", "A guaranteed income for life, bought from an insurer with your pension pot."],
  ["ARF", "Approved Retirement Fund — your pot stays invested after you retire and you take money out as you need it."],
  ["Vesting", "The point at which you start drawing benefits from a pension."],
  ["SFT", "Standard Fund Threshold — the most you can build up in pensions with full tax benefits."],
];

export default function PensionsExplainedPage() {
  const sp = STATE_PENSION;
  return (
    <>
      <PageIntro
        label="pensions explained"
        lines={["irish pensions,", "in plain english."]}
        tone="teal"
        corners={{ left: "a beginner's guide", right: `official sources · ${GUIDE_CHECKED.toLowerCase()}` }}
        lead="new to pensions, or new to ireland? start here. what the state gives you, what your job adds, what you can do yourself — and the rules, explained simply."
      />

      <div className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page px-0 md:px-0">
          {/* Key numbers */}
          <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {[
              [String(sp.age), "state pension age"],
              [euro(sp.contributoryMax2026, 2), "full state pension a week (2026)"],
              ["40%", "most tax relief on what you pay in"],
              [euro(RETIREMENT.taxFreeLumpSum), "tax-free at retirement (lifetime)"],
            ].map(([value, label], i) => (
              <div
                key={label}
                className={`border-border py-7 ${i > 0 ? "sm:px-6" : "sm:pr-6"} ${i % 2 === 1 ? "sm:border-l" : ""} ${i === 2 ? "lg:border-l" : ""}`}
              >
                <p className="tabular font-heading text-4xl tracking-tight md:text-5xl">{value}</p>
                <p className="lower mt-2 font-mono text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Contents */}
          <nav aria-label="On this page" className="mt-10 border-t border-border pt-6">
            <p className="lower font-mono text-xs text-muted-foreground">on this page</p>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              {contents.map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="lower link-underline text-sm text-muted-foreground hover:text-foreground">
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-20 space-y-20 md:space-y-28">
            {/* ── 1. Basics ── */}
            <section id="basics" className="scroll-mt-28">
              <SectionLabel>the three parts</SectionLabel>
              <h2 className="lower mt-8 max-w-3xl font-heading text-3xl tracking-tight md:text-5xl">
                most people&apos;s retirement income in ireland comes from three places.
              </h2>
              <div className="mt-12 grid border-t border-border md:grid-cols-3">
                {pillars.map((p) => (
                  <a
                    key={p.no}
                    href={p.href}
                    className="group border-border py-8 transition-colors md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l"
                  >
                    <span className="font-mono text-sm text-primary">{p.no}</span>
                    <h3 className="lower mt-4 font-heading text-2xl tracking-tight group-hover:text-primary">
                      {p.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </a>
                ))}
              </div>
              <p className="mt-8 max-w-3xl text-[0.95rem] leading-relaxed text-muted-foreground">
                The State Pension on its own is a safety net, not a full income: in 2026 the full
                rate is {euro(sp.contributoryMax2026, 2)} a week, about {euro(sp.contributoryMax2026 * 52)} a
                year. Most people need a workplace or personal pension as well to keep a similar
                standard of living after they stop working.
              </p>
            </section>

            {/* ── 2. State Pension ── */}
            <Section
              id="state-pension"
              no="01"
              title="the state pension"
              lead={`From age ${sp.age}, the government pays a weekly pension. There are two kinds: one based on the PRSI you've paid, and one based on your income if you don't have enough PRSI.`}
            >
              <h3 className="lower font-heading text-xl text-foreground">state pension (contributory)</h3>
              <p>
                This is the main State Pension. It isn&apos;t means-tested — what you earn or own
                doesn&apos;t matter — but it is counted as taxable income.
              </p>
              <Rules
                items={[
                  <>You can get it from age <strong>{sp.age}</strong>.</>,
                  <>The full rate is <strong>{euro(sp.contributoryMax2026, 2)} a week in 2026</strong>, rising to <strong>{euro(sp.contributoryMax2027, 2)} from January 2027</strong> (Budget 2027).</>,
                  <>To qualify at all you need at least <strong>{sp.minPaidContributions} paid PRSI contributions</strong> — about 10 years of work.</>,
                  <>For the full rate you need <strong>{sp.fullRateContributions.toLocaleString("en-IE")} contributions</strong> in total — about 40 years. Credits for time spent unemployed, ill or caring for someone count towards this. Fewer than {sp.fullRateContributions.toLocaleString("en-IE")} means a reduced rate.</>,
                  <>The government is moving to this &ldquo;total contributions&rdquo; method gradually. If you reach {sp.age} in 2026, {sp.yearlyAverageShare2026}% of your rate is still worked out the older &ldquo;yearly average&rdquo; way and {100 - sp.yearlyAverageShare2026}% the new way.</>,
                  <>You can choose to <strong>start it later, up to age {sp.deferUntil}</strong>, for a higher weekly rate — for example {euro(sp.contributoryAt67In2026, 2)} a week if you start at 67 in 2026.</>,
                ]}
              />
              <h3 className="lower pt-4 font-heading text-xl text-foreground">state pension (non-contributory)</h3>
              <p>
                For people aged {sp.age} or over who don&apos;t have enough PRSI for the contributory
                pension, or only get a small amount from it. It is means-tested: the government looks
                at your income and property (not including your home).
              </p>
              <Rules
                items={[
                  <>Up to <strong>{euro(sp.nonContributory2026.under80)} a week</strong> aged 66–79 and <strong>{euro(sp.nonContributory2026.over80)}</strong> aged 80 or over in 2026; {euro(sp.nonContributory2027.under80)} and {euro(sp.nonContributory2027.over80)} from January 2027.</>,
                  <>The first <strong>{euro(sp.nonContributoryMeansIgnored)} a week</strong> of your means is ignored. After that, the pension is reduced as your means go up.</>,
                  <>If you or your partner work, <strong>{euro(sp.nonContributoryEarningsDisregard)} a week</strong> of each person&apos;s earnings is ignored.</>,
                ]}
              />
              <MeansForYou>
                Every year you work and pay PRSI adds to your State Pension. If you&apos;re not working
                — caring for children, ill, or unemployed — make sure you&apos;re getting credits. You
                can check your PRSI record free on <Source href="https://www.mywelfare.ie">MyWelfare</Source>.
              </MeansForYou>
              <Sources
                links={[
                  ["State Pension (Contributory)", SOURCES.spc],
                  ["deferring it", SOURCES.spcDeferral],
                  ["State Pension (Non-Contributory)", SOURCES.spnc],
                  ["2026 rates", SOURCES.welfareRates2026],
                  ["Budget 2027 changes", SOURCES.budget2027],
                ]}
              />
            </Section>

            {/* ── 3. Auto-enrolment ── */}
            <Section
              id="auto-enrolment"
              no="02"
              title="auto-enrolment"
              lead={`Since ${AUTO_ENROLMENT.started}, employees who don't have a pension through work are put into one automatically. It's called MyFutureFund. You, your employer and the State all pay in.`}
            >
              <Rules
                items={[
                  <>You&apos;re enrolled if you&apos;re aged <strong>{AUTO_ENROLMENT.minAge} to {AUTO_ENROLMENT.maxAge}</strong>, earn <strong>more than {euro(AUTO_ENROLMENT.minEarnings)} a year</strong>, and don&apos;t already pay into a pension through your payroll.</>,
                  <>Contributions are a percentage of your gross pay, on earnings up to <strong>{euro(AUTO_ENROLMENT.earningsCap)} a year</strong>.</>,
                  <>Your employer <strong>must match</strong> what you pay in, and the State adds <strong>€1 for every €3</strong> you pay — instead of tax relief.</>,
                  <>The amounts are fixed: you can&apos;t pay more or less than the set rate. They rise every three years:</>,
                ]}
              />
              <Table
                head={["years", "you pay", "employer pays", "state adds", "total"]}
                rows={AUTO_ENROLMENT.schedule.map((s) => [
                  s.years,
                  `${s.you}%`,
                  `${s.employer}%`,
                  `${s.state}%`,
                  `${s.you + s.employer + s.state}%`,
                ])}
                note="% of your gross pay."
              />
              <MeansForYou>
                If you earn {euro(40_000)} a year, in 2026 you pay {euro(600)} a year (1.5%), your employer
                adds {euro(600)} and the State adds {euro(200)} — {euro(1_400)} a year going into your
                pension for {euro(600)} of your own money. If your job offers its own pension, ask how much
                your employer pays into it — it may be more than auto-enrolment.
              </MeansForYou>
              <Sources
                links={[
                  ["auto-enrolment explained", SOURCES.autoEnrolment],
                  ["MyFutureFund", SOURCES.myFutureFund],
                ]}
              />
            </Section>

            {/* ── 4. Workplace ── */}
            <Section
              id="workplace"
              no="03"
              title="workplace pensions"
              lead="Many employers run their own pension scheme (an occupational pension). Your employer usually pays in as well, which makes it one of the best-value ways to save."
            >
              <p>There are two main types:</p>
              <Rules
                items={[
                  <><strong>Defined benefit (DB)</strong> — promises a set pension, usually based on your salary and how long you worked there. Common in the public sector and older companies.</>,
                  <><strong>Defined contribution (DC)</strong> — money goes into your own pot and is invested. What you get depends on how much was paid in and how the investments did. Most new schemes are DC.</>,
                  <><strong>Extra payments (AVCs)</strong> — you can usually pay in more on top of the normal amount, with tax relief. If your scheme doesn&apos;t allow this, your employer must offer a PRSA you can use instead.</>,
                  <><strong>Leaving your job</strong> — the pension stays yours. If you leave within two years, you may instead get back your own contributions, less tax.</>,
                ]}
              />
              <MeansForYou>
                If your employer offers a pension and pays into it, joining is close to free money.
                Ask HR what they contribute, and whether they match extra payments from you.
              </MeansForYou>
              <Sources
                links={[
                  ["occupational pensions", SOURCES.occupational],
                  ["AVCs", SOURCES.avcs],
                  ["what are my pension options?", SOURCES.pensionOptions],
                ]}
              />
            </Section>

            {/* ── 5. Personal ── */}
            <Section
              id="personal"
              no="04"
              title="your own pension"
              lead="If you're self-employed, between jobs, or want to save more, you can set up a pension yourself. You pick the provider and the funds, and you get tax relief on what you pay in."
            >
              <Rules
                items={[
                  <><strong>PRSA</strong> (Personal Retirement Savings Account) — a pension you own that moves with you from job to job. A &ldquo;standard&rdquo; PRSA has capped charges and simple investment choices.</>,
                  <><strong>Personal pension</strong> (Retirement Annuity Contract) — mainly for the self-employed and people without a workplace scheme.</>,
                  <>Charges matter a lot over decades. Use the <Link href="/funds" className="link-underline text-foreground">fund explorer</Link> and <Link href="/compare" className="link-underline text-foreground">compare</Link> to see returns and risk, and the <Link href="/calculator" className="link-underline text-foreground">calculator</Link> to see what charges cost you.</>,
                ]}
              />
              <Sources links={[["PRSAs (Revenue)", SOURCES.prsa], ["introduction to pensions", SOURCES.introduction]]} />
            </Section>

            {/* ── 6. Tax relief ── */}
            <Section
              id="tax-relief"
              no="05"
              title="tax relief"
              lead="When you pay into a pension, you get back the income tax you'd have paid on that money. It's the main reason pensions are such good value."
            >
              <p>
                Relief is at your highest tax rate: <strong>20%</strong> or <strong>40%</strong>. So if
                you pay the higher rate, putting <strong>€100</strong> into your pension costs you only
                about <strong>€60</strong> — the other €40 is tax you don&apos;t pay.
              </p>
              <p>
                There&apos;s a limit to how much gets relief each year. It depends on your age, as a
                share of your earnings, and earnings above <strong>{euro(EARNINGS_CAP)}</strong> don&apos;t
                count:
              </p>
              <Table
                head={["your age", "% of earnings", `most relief at ${euro(EARNINGS_CAP)}`]}
                rows={ageBands.map((b) => {
                  const pct = ageRelatedLimitPct(b.age);
                  return [b.label, `${pct}%`, euro((EARNINGS_CAP * pct) / 100)];
                })}
                note="Your employer's contributions don't count towards your limit. Auto-enrolment doesn't get tax relief — the State top-up replaces it."
              />
              <MeansForYou>
                On {euro(50_000)} a year at age 35, you can get relief on up to {euro(10_000)} a year
                (20%). Try your own numbers in the <Link href="/calculator" className="link-underline">calculator</Link>.
              </MeansForYou>
              <Sources links={[["tax relief limits (Revenue)", SOURCES.taxReliefLimits], ["tax relief on pensions", SOURCES.taxReliefCI]]} />
            </Section>

            {/* ── 7. Retiring ── */}
            <Section
              id="retiring"
              no="06"
              title="when you retire"
              lead="Private and workplace pensions usually pay out from age 60, or earlier from 50 if you retire, or if you have to stop working through serious illness. Workplace schemes have their own retirement age, often 60 to 70."
            >
              <h3 className="lower font-heading text-xl text-foreground">1. a lump sum</h3>
              <p>
                Most people take part of their pension as a lump sum: usually up to <strong>25% of the
                pot</strong>, or for workplace schemes up to <strong>1.5 times final salary</strong> after 20
                years&apos; service.
              </p>
              <Table
                head={["lump sum (over your lifetime)", "tax"]}
                rows={[
                  [`First ${euro(RETIREMENT.taxFreeLumpSum)}`, "tax-free"],
                  [`${euro(RETIREMENT.taxFreeLumpSum)} to ${euro(RETIREMENT.standardRateBandTop)}`, `${RETIREMENT.standardRate}%`],
                  [`Above ${euro(RETIREMENT.standardRateBandTop)}`, "your normal income tax rate"],
                ]}
              />
              <h3 className="lower pt-4 font-heading text-xl text-foreground">2. an income from the rest</h3>
              <Rules
                items={[
                  <><strong>An annuity</strong> — you hand your pot to an insurer for a guaranteed income for life. Certain, but you can&apos;t change your mind later.</>,
                  <><strong>An ARF</strong> (Approved Retirement Fund) — your money stays invested and you take out what you need. Flexible, but it can go down, and it can run out.</>,
                  <>From 60, Revenue treats part of an ARF as withdrawn each year, and taxes it as income, even if you leave it in:</>,
                ]}
              />
              <Table
                head={["arf", "taxed as taken out each year"]}
                rows={RETIREMENT.arfImputed.map((r) => [r.when, `${r.rate}%`])}
              />
              <Rules
                items={[
                  <>A PRSA must start paying out by age <strong>{RETIREMENT.prsaLatestAge}</strong>.</>,
                  <>There&apos;s a lifetime limit on pension savings with full tax benefits — the <strong>Standard Fund Threshold</strong>: {euro(RETIREMENT.sft2026)} in 2026, {euro(RETIREMENT.sft2027)} in 2027. Only very large pensions reach it.</>,
                ]}
              />
              <MeansForYou>
                Choosing between an annuity and an ARF is one of the biggest money decisions you&apos;ll
                make. It&apos;s worth paying for independent financial advice before you retire.
              </MeansForYou>
              <Sources
                links={[
                  ["lump sums (Revenue)", SOURCES.lumpSums],
                  ["ARFs (Revenue)", SOURCES.arf],
                  ["SFT (Revenue)", SOURCES.sft],
                  ["pension options (Pensions Authority)", SOURCES.pensionOptions],
                ]}
              />
            </Section>

            {/* ── 8. First steps ── */}
            <Section
              id="first-steps"
              no="07"
              title="your first steps"
              lead="You don't need to understand everything at once. These five steps cover most of it."
            >
              <ol className="space-y-4">
                {[
                  <>Check your <strong>PRSI record</strong> on <Source href="https://www.mywelfare.ie">MyWelfare</Source> — it decides your State Pension.</>,
                  <>Ask your employer whether they <strong>offer a pension</strong> and how much they pay in. If not, you&apos;ll be in MyFutureFund.</>,
                  <>Find your <strong>pension statements</strong> and add them to your <Link href="/portfolio" className="link-underline text-foreground">portfolio</Link> to see what they could be worth.</>,
                  <>Look at the <strong>charges</strong>. A 1% difference a year can cost tens of thousands of euro over a working life.</>,
                  <>Use the <Link href="/calculator" className="link-underline text-foreground">calculator</Link> to see how much more you&apos;d need to pay in, and how much tax relief you&apos;d get.</>,
                ].map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-mono text-sm text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </Section>

            {/* ── 9. Glossary ── */}
            <Section id="glossary" no="08" title="glossary" lead="The words you'll see on pension statements, in plain terms.">
              <dl className="grid gap-x-10 gap-y-5 sm:grid-cols-2">
                {glossary.map(([term, meaning]) => (
                  <div key={term} className="border-t border-border pt-3">
                    <dt className="font-medium text-foreground">{term}</dt>
                    <dd className="mt-1 text-sm">{meaning}</dd>
                  </div>
                ))}
              </dl>
            </Section>

            {/* ── 10. Help ── */}
            <Section
              id="help"
              no="09"
              title="where to get help"
              lead="These services are free and independent."
            >
              <Rules
                items={[
                  <><Source href="https://www.citizensinformation.ie">Citizens Information</Source> — plain-English guides to every payment and scheme, plus a free phone and drop-in service.</>,
                  <><Source href="https://www.mywelfare.ie">MyWelfare</Source> — your PRSI record and applying for the State Pension.</>,
                  <><Source href="https://www.pensionsauthority.ie">The Pensions Authority</Source> — guides on workplace pensions and PRSAs.</>,
                  <><Source href="https://www.revenue.ie/en/jobs-and-pensions/pension/index.aspx">Revenue</Source> — tax relief and how pensions are taxed.</>,
                  <><Source href="https://myfuturefund.ie">MyFutureFund</Source> — auto-enrolment.</>,
                  <><Source href="https://www.fspo.ie">Financial Services and Pensions Ombudsman</Source> — if you have a complaint about a pension provider.</>,
                ]}
              />
            </Section>

            {/* ── 11. Official links ── */}
            <section id="official-links" className="scroll-mt-28 border-t border-border pt-12 md:pt-16">
              <SectionLabel>official links</SectionLabel>
              <h2 className="lower mt-8 max-w-3xl font-heading text-3xl tracking-tight md:text-5xl">
                check it yourself.
              </h2>
              <p className="mt-6 max-w-2xl text-[0.95rem] leading-relaxed text-muted-foreground">
                Every rule on this page comes from these official government pages. They&apos;re
                updated whenever the rules change, so check them for the latest figures — especially
                after each Budget in October.
              </p>
              <div className="mt-12 space-y-12">
                {OFFICIAL_LINKS.map((group) => (
                  <div key={group.topic}>
                    <h3 className="lower font-mono text-xs text-primary">{group.topic}</h3>
                    <ul className="mt-4 grid border-t border-border sm:grid-cols-2 lg:grid-cols-3">
                      {group.links.map((link) => (
                        <li key={link.href} className="border-b border-border">
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noreferrer"
                            className="group flex h-full flex-col gap-1.5 py-5 pr-6 transition-colors"
                          >
                            <span className="flex items-baseline justify-between gap-3 font-medium text-foreground group-hover:text-primary">
                              {link.title}
                              <span aria-hidden className="shrink-0 text-muted-foreground group-hover:text-primary">
                                ↗
                              </span>
                            </span>
                            <span className="text-sm leading-relaxed text-muted-foreground">{link.what}</span>
                            <span className="lower mt-1 font-mono text-[0.7rem] text-muted-foreground/80">
                              {link.site}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-24 max-w-3xl border-t border-border pt-8">
            <p className="font-mono text-xs leading-relaxed text-muted-foreground">
              Figures checked against Citizens Information, gov.ie, Revenue, the Pensions Authority and
              MyFutureFund in {GUIDE_CHECKED}. Rates change every Budget; follow the links for the
              latest. This is a general guide, not advice on your own situation.
            </p>
            <Disclaimer kind="calculator" className="mt-8" />
          </div>
        </div>
      </div>
    </>
  );
}
