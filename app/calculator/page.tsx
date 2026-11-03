"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageIntro } from "@/components/editorial/page-intro";
import { Reveal } from "@/components/editorial/reveal";
import { SectionLabel } from "@/components/editorial/section-label";
import { ProjectionChart } from "@/components/calculator/projection-chart";
import { calculateProjection } from "@/lib/calculations";
import { formatEuro } from "@/lib/utils";
import { csvFileName, downloadCsv } from "@/lib/csv";
import { calculatorCsvRows } from "@/lib/calculator-export";
import { Disclaimer } from "@/components/legal/disclaimer";
import { ExportButtons } from "@/components/legal/export-buttons";
import type { CalculatorInput } from "@/lib/types";

function firstOf(value: number | readonly number[]): number {
  return Array.isArray(value) ? value[0] : (value as number);
}

const DEFAULTS: CalculatorInput = {
  currentAge: 35,
  retirementAge: 65,
  currentSalary: 55_000,
  currentPotValue: 20_000,
  employeeContributionPct: 6,
  employerContributionPct: 6,
  assumedGrowthRatePct: 5,
  fundAmcPct: 1,
  marginalTaxRatePct: 40,
};

const TAX_RATE_LABELS: Record<string, string> = {
  "20": "20% standard rate",
  "40": "40% higher rate",
};

/** A slider with its value shown in mono, so the number is always readable. */
function SliderField({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="border-t border-border py-5">
      <div className="flex items-baseline justify-between gap-3">
        <Label className="lower font-mono text-xs text-muted-foreground">{label}</Label>
        <span className="tabular font-heading text-lg">{display}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(firstOf(v))}
        aria-label={label}
        className="mt-4"
      />
    </div>
  );
}

function EuroField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="border-t border-border py-5">
      <Label htmlFor={id} className="lower font-mono text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-heading text-lg text-muted-foreground">€</span>
        <Input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          className="tabular h-10 rounded-none border-0 border-b border-transparent bg-transparent px-0 font-heading text-lg focus-visible:border-primary focus-visible:ring-0"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function CalculatorPage() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULTS);

  const result = useMemo(() => calculateProjection(input), [input]);

  function update<K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  const growth = Math.max(result.projectedPot - result.totalContributions, 0);
  const growthShare = result.projectedPot > 0 ? (growth / result.projectedPot) * 100 : 0;

  const headline = [
    {
      no: "01",
      label: `projected pot at ${input.retirementAge}`,
      value: formatEuro(result.projectedPot),
      detail: `${result.yearsToRetirement} years of contributions and growth`,
      tone: "text-foreground",
    },
    {
      no: "02",
      label: "tax relief saved this year",
      value: formatEuro(result.annualTaxReliefSaved),
      detail: `at your ${input.marginalTaxRatePct}% marginal rate`,
      tone: "text-success",
    },
    {
      no: "03",
      label: "charges paid over time",
      value: formatEuro(result.totalFeesDrag),
      detail: `${input.fundAmcPct.toFixed(2)}% amc compounded to retirement`,
      tone: "text-destructive",
    },
  ];

  const taxDetail = [
    {
      label: `age-related relief limit (age ${input.currentAge})`,
      value: `${result.ageRelatedLimitPct}% of earnings`,
    },
    { label: "earnings cap for relief", value: formatEuro(result.earningsCap) },
    { label: "max relievable contribution", value: formatEuro(result.maxRelievableContribution) },
    { label: "total contributions to retirement", value: formatEuro(result.totalContributions) },
  ];

  return (
    <>
      <PageIntro
        label="calculator"
        lines={["what your pot", "is actually worth."]}
        tone="sun"
        corners={{ left: "revenue age-related rules", right: "illustrative, not advice" }}
        lead="project your pension using revenue's age-related relief limits and the €115,000 earnings cap — and see what your fund's charges take on the way."
      />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page grid gap-16 px-0 md:px-0 lg:grid-cols-[22rem_1fr] lg:gap-20 xl:grid-cols-[24rem_1fr]">
          {/* Inputs stay in view while the figures update beside them */}
          <div className="lg:sticky lg:top-28 lg:self-start">
            <FieldGroup title="about you">
              <SliderField
                label="current age"
                value={input.currentAge}
                display={String(input.currentAge)}
                min={18}
                max={69}
                onChange={(v) => update("currentAge", v)}
              />
              <SliderField
                label="retirement age"
                value={input.retirementAge}
                display={String(input.retirementAge)}
                min={input.currentAge + 1}
                max={70}
                onChange={(v) => update("retirementAge", v)}
              />
              <EuroField
                id="salary"
                label="annual salary"
                value={input.currentSalary}
                onChange={(v) => update("currentSalary", v)}
              />
              <EuroField
                id="pot"
                label="current pension pot"
                value={input.currentPotValue}
                onChange={(v) => update("currentPotValue", v)}
              />
            </FieldGroup>

            <FieldGroup title="contributions">
              <SliderField
                label="your contribution"
                value={input.employeeContributionPct}
                display={`${input.employeeContributionPct}%`}
                min={0}
                max={40}
                onChange={(v) => update("employeeContributionPct", v)}
              />
              <SliderField
                label="employer contribution"
                value={input.employerContributionPct}
                display={`${input.employerContributionPct}%`}
                min={0}
                max={20}
                onChange={(v) => update("employerContributionPct", v)}
              />
            </FieldGroup>

            <FieldGroup title="assumptions">
              <SliderField
                label="assumed annual growth"
                value={input.assumedGrowthRatePct}
                display={`${input.assumedGrowthRatePct}%`}
                min={0}
                max={10}
                step={0.5}
                onChange={(v) => update("assumedGrowthRatePct", v)}
              />
              <SliderField
                label="fund annual charge"
                value={input.fundAmcPct}
                display={`${input.fundAmcPct.toFixed(2)}%`}
                min={0}
                max={2}
                step={0.05}
                onChange={(v) => update("fundAmcPct", v)}
              />
              <div className="border-t border-border py-5">
                <Label className="lower font-mono text-xs text-muted-foreground">
                  marginal tax rate
                </Label>
                <Select
                  value={String(input.marginalTaxRatePct)}
                  onValueChange={(v) => v && update("marginalTaxRatePct", Number(v) as 20 | 40)}
                >
                  <SelectTrigger className="lower mt-2 h-10 w-full rounded-none border-0 border-b border-transparent bg-transparent px-0 font-heading text-lg focus-visible:border-primary focus-visible:ring-0">
                    <SelectValue>{(value: string) => TAX_RATE_LABELS[value] ?? value}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20% standard rate</SelectItem>
                    <SelectItem value="40">40% higher rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FieldGroup>
          </div>

          {/* Figures */}
          <div>
            <div className="grid border-t border-border md:grid-cols-3">
              {headline.map((stat, i) => (
                <Reveal
                  key={stat.label}
                  delay={i * 90}
                  className="border-border py-8 md:px-8 md:first:pl-0 md:[&:not(:first-child)]:border-l"
                >
                  <span className="font-mono text-xs text-primary">{stat.no}</span>
                  <p className="lower mt-4 font-mono text-xs text-muted-foreground">{stat.label}</p>
                  <p
                    className={`tabular mt-3 font-heading text-4xl tracking-tight md:text-5xl ${stat.tone}`}
                  >
                    {stat.value}
                  </p>
                  <p className="lower mt-3 text-sm text-muted-foreground">{stat.detail}</p>
                </Reveal>
              ))}
            </div>

            <a
              href="#export"
              className="lower link-underline mt-5 inline-block font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              download these figures as a pdf report or csv ↓
            </a>

            <div className="mt-16">
              <SectionLabel>pot growth vs contributions</SectionLabel>
              <div className="mt-8 border-t border-border pt-8">
                <ProjectionChart data={result.yearlyProjection} />
              </div>

              {/* What share of the final pot is growth rather than money paid in */}
              <div className="mt-10 border-t border-border pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="lower font-mono text-xs text-muted-foreground">made up of</span>
                  <span className="tabular font-heading text-lg">
                    {formatEuro(result.totalContributions)} in · {formatEuro(growth)} growth
                  </span>
                </div>
                <div className="mt-4 flex h-0.5 w-full overflow-hidden bg-border">
                  <div className="bg-slate" style={{ width: `${100 - growthShare}%` }} />
                  <div className="bg-primary" style={{ width: `${growthShare}%` }} />
                </div>
                <p className="lower mt-3 font-mono text-xs text-muted-foreground">
                  {growthShare.toFixed(0)}% of the projected pot is compound growth, after charges.
                </p>
              </div>
            </div>

            <div className="mt-16">
              <SectionLabel>tax relief detail</SectionLabel>
              <dl className="mt-8 border-t border-border">
                {taxDetail.map((item) => (
                  <div
                    key={item.label}
                    className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border py-5"
                  >
                    <dt className="lower font-mono text-xs text-muted-foreground">{item.label}</dt>
                    <dd className="tabular font-heading text-lg">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="lower mt-6 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
                relief limits rise with age — 15% under 30 up to 40% at 60+ — and apply to net
                relevant earnings up to the €115,000 cap. employer contributions don&apos;t count
                against your personal limit.{" "}
                <Link href="/how-it-works" className="link-underline text-foreground">
                  how the numbers work
                </Link>
                .
              </p>
            </div>

            <div id="export" className="mt-16 scroll-mt-28 border-t border-border pt-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="lower font-mono text-xs text-muted-foreground">take it with you</p>
                  <p className="lower mt-2 max-w-md text-sm text-muted-foreground">
                    a pdf report with the chart — your inputs, the results, tax relief and the pot
                    year by year to {input.retirementAge} — or the same numbers as a csv spreadsheet.
                  </p>
                </div>
                <ExportButtons
                  onPdf={async () => {
                    const { downloadCalculatorReport } = await import("@/lib/pdf/calculator-report");
                    downloadCalculatorReport(input, result);
                  }}
                  onCsv={() =>
                    downloadCsv(csvFileName("calculator"), calculatorCsvRows(input, result))
                  }
                />
              </div>
              <Disclaimer kind="calculator" className="mt-8" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
