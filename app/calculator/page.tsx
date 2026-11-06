"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageIntro } from "@/components/editorial/page-intro";
import { Reveal } from "@/components/editorial/reveal";
import { SectionLabel } from "@/components/editorial/section-label";
import { IncomeChart, LifetimeChart } from "@/components/calculator/projection-chart";
import { CAUTIOUS_GAP_PCT, calculateProjection, yearlyIncome } from "@/lib/calculations";
import {
  LONG_RUN,
  MIX_PRESETS,
  equitySharePct,
  fundRecordPct,
  mixGrowthPct,
  mixLabel,
} from "@/lib/calculator-growth";
import { RETIREMENT, STATE_PENSION } from "@/lib/pension-guide";
import { useFunds } from "@/lib/hooks/use-funds";
import { formatEuro } from "@/lib/utils";
import { csvFileName, downloadCsv } from "@/lib/csv";
import { calculatorCsvRows } from "@/lib/calculator-export";
import { Disclaimer } from "@/components/legal/disclaimer";
import { ExportButtons } from "@/components/legal/export-buttons";
import type { CalculatorInput, PlanYear, IncomePer } from "@/lib/types";

function firstOf(value: number | readonly number[]): number {
  return Array.isArray(value) ? value[0] : (value as number);
}

/** How growth is chosen: by mix, or from a fund (its mix, or its own track record). */
interface GrowthChoice {
  source: "mix" | "fund";
  fundSlug: string | null;
  fundBasis: "mix" | "record";
  /** % in shares while saving (mix source) and once retired. */
  savingShares: number;
  retiredShares: number;
  lifestyle: boolean;
  lifestyleYears: number;
  sharesReturnPct: number;
  bondsReturnPct: number;
}

type BaseInput = Omit<CalculatorInput, "preRetirementGrowthPct" | "postRetirementGrowthPct" | "lifestyleYears">;

const DEFAULTS: BaseInput = {
  currentAge: 35,
  retirementAge: 65,
  currentSalary: 55_000,
  currentPotValue: 20_000,
  employeeContributionPct: 6,
  employerContributionPct: 6,
  salaryGrowthPct: 2.5,
  marginalTaxRatePct: 40,
  fundAmcPct: 1,
  inflationPct: 2,
  takeLumpSum: true,
  incomeAmount: 2_500,
  incomePer: "month",
  incomeIndexed: true,
  includeStatePension: true,
  statePensionWeekly: STATE_PENSION.contributoryMax2026,
  otherIncomeYearly: 0,
  planToAge: 90,
};

const DEFAULT_GROWTH: GrowthChoice = {
  source: "mix",
  fundSlug: null,
  fundBasis: "mix",
  savingShares: 80,
  retiredShares: 50,
  lifestyle: true,
  lifestyleYears: 10,
  sharesReturnPct: LONG_RUN.sharesPct,
  bondsReturnPct: LONG_RUN.bondsPct,
};

const TAX_RATE_LABELS: Record<string, string> = { "20": "20% standard rate", "40": "40% higher rate" };
const PLAN_TO = [85, 90, 95, 100] as const;
/** Retiring at or after this leaves no retired years to describe. */
const LAST_RETIRED_AGE = 100;
const PHASE_COLUMNS: Record<number, string> = { 2: "md:grid-cols-2", 3: "md:grid-cols-3" };

// ─── Small controls ────────────────────────────────────────────────────────

function SliderField({
  label,
  value,
  display,
  min,
  max,
  step = 1,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  hint?: ReactNode;
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
      {hint ? <p className="lower mt-3 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EuroField({
  id,
  label,
  value,
  hint,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: number;
  hint?: ReactNode;
  onChange: (value: number) => void;
  children?: ReactNode;
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
          inputMode="decimal"
          className="tabular h-10 min-w-0 flex-1 rounded-none border-0 border-b border-transparent bg-transparent px-0 font-heading text-lg focus-visible:border-primary focus-visible:ring-0"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Math.max(Number(e.target.value) || 0, 0))}
        />
        {children}
      </div>
      {hint ? <p className="lower mt-2 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function ToggleField({
  id,
  label,
  checked,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  hint?: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="border-t border-border py-5">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id} className="lower font-mono text-xs text-muted-foreground">
          {label}
        </Label>
        <Switch id={id} checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      </div>
      {hint ? <p className="lower mt-2 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`lower rounded-full border px-3.5 py-1.5 font-mono text-xs transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
      }`}
    >
      {children}
    </button>
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

function Note({ tone = "info", children }: { tone?: "info" | "warn" | "bad" | "good"; children: ReactNode }) {
  const bar = { info: "bg-slate", warn: "bg-sun", bad: "bg-destructive", good: "bg-success" }[tone];
  return (
    <li className="flex gap-4 border-b border-border py-4">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bar}`} aria-hidden />
      <p className="lower text-sm leading-relaxed text-muted-foreground [&_strong]:font-normal [&_strong]:text-foreground">
        {children}
      </p>
    </li>
  );
}

const pct = (v: number) => `${v.toFixed(v % 1 === 0 ? 0 : 1)}%`;

// ─── Page ──────────────────────────────────────────────────────────────────

export default function CalculatorPage() {
  const [base, setBase] = useState<BaseInput>(DEFAULTS);
  const [growth, setGrowth] = useState<GrowthChoice>(DEFAULT_GROWTH);
  const [todaysMoney, setTodaysMoney] = useState(true);
  const { funds } = useFunds();

  const fund = growth.fundSlug ? (funds.find((f) => f.slug === growth.fundSlug) ?? null) : null;
  const fundShares = fund ? equitySharePct(fund) : null;
  const fundRecord = fund ? fundRecordPct(fund) : null;
  const assumptions = { sharesPct: growth.sharesReturnPct, bondsPct: growth.bondsReturnPct };
  const savingShares = growth.source === "fund" && fundShares !== null ? fundShares : growth.savingShares;
  const preGrowth =
    growth.source === "fund" && growth.fundBasis === "record" && fundRecord
      ? fundRecord.pct
      : mixGrowthPct(savingShares, assumptions);
  const postGrowth = mixGrowthPct(growth.retiredShares, assumptions);

  // Cheap enough to run on every change (a few thousand loop steps); the
  // React Compiler memoises it.
  const input: CalculatorInput = {
    ...base,
    preRetirementGrowthPct: preGrowth,
    postRetirementGrowthPct: postGrowth,
    lifestyleYears: growth.lifestyle ? growth.lifestyleYears : 0,
  };
  const result = calculateProjection(input);

  function update<K extends keyof BaseInput>(key: K, value: BaseInput[K]) {
    setBase((prev) => {
      const next = { ...prev, [key]: value };
      // Keep the ages consistent.
      if (key === "currentAge" && next.retirementAge < next.currentAge) next.retirementAge = next.currentAge;
      if (next.planToAge <= next.retirementAge) next.planToAge = PLAN_TO.find((a) => a > next.retirementAge) ?? 100;
      return next;
    });
  }
  const setG = (patch: Partial<GrowthChoice>) => setGrowth((prev) => ({ ...prev, ...patch }));

  function chooseFund(slug: string) {
    const picked = funds.find((f) => f.slug === slug);
    setG({ source: "fund", fundSlug: slug });
    if (picked?.amc !== undefined) update("fundAmcPct", Math.round(picked.amc * 100) / 100);
  }

  // ── Money shown in today's euros or future euros ──
  const money = (value: number, year: Pick<PlanYear, "deflator">) => (todaysMoney ? value / year.deflator : value);
  const yearAt = (age: number) => result.years.find((y) => y.age === age);
  const retireYear = yearAt(input.retirementAge) ?? { deflator: 1 };
  const show = (value: number, year: Pick<PlanYear, "deflator"> = retireYear) => formatEuro(money(value, year));
  const moneyNote = todaysMoney ? "in today's money" : "in future euros";

  const yearlyPlan = yearlyIncome(input);
  const retiredYears = result.years.filter((y) => y.phase === "retired");
  const spAge = STATE_PENSION.age;
  const retiringEarly = input.retirementAge < spAge;

  // Income in each phase, today's money (independent of the money toggle: it compares with pay).
  const incomeAt = (age: number) => {
    const y = yearAt(age);
    if (!y || y.phase !== "retired") return null;
    return {
      pot: y.withdrawal / y.deflator,
      state: y.statePension / y.deflator,
      other: y.otherIncome / y.deflator,
      total: (y.withdrawal + y.statePension + y.otherIncome) / y.deflator,
    };
  };
  const replacement = (total: number) =>
    result.finalSalaryToday > 0 ? Math.round((total / result.finalSalaryToday) * 100) : 0;

  const lastsLabel =
    result.runsOutAge === null ? "beyond 100" : result.runsOutAge <= input.retirementAge ? "not at all" : `until ${result.runsOutAge}`;
  const lastsTone =
    result.runsOutAge === null || result.runsOutAge >= input.planToAge
      ? "text-success"
      : result.runsOutAge >= input.planToAge - 5
        ? "text-warning"
        : "text-destructive";
  // What the pot pays a year (today's money) before and after the State Pension starts.
  const potDrawAt = (age: number) => {
    const y = yearAt(age);
    return y && y.phase === "retired" ? y.withdrawal / y.deflator : 0;
  };
  const statePensionYearly = input.statePensionWeekly * 52;
  const per = (yearly: number) => (input.incomePer === "month" ? `${formatEuro(yearly / 12)} a month` : `${formatEuro(yearly)} a year`);

  const headline = [
    {
      no: "01",
      label: `pot at ${input.retirementAge}`,
      value: show(result.projectedPot),
      detail:
        result.yearsToRetirement > 0
          ? `${result.yearsToRetirement} years of saving, ${moneyNote}`
          : `what you have now`,
      tone: "text-foreground",
    },
    {
      no: "02",
      label: input.takeLumpSum ? "lump sum at retirement" : "lump sum",
      value: input.takeLumpSum ? show(result.lumpSum) : "not taken",
      detail: input.takeLumpSum
        ? result.lumpSumTax > 0
          ? `25% of the pot · ${show(result.lumpSumTax)} tax on it`
          : "25% of the pot, tax-free"
        : "the whole pot stays invested",
      tone: "text-foreground",
    },
    {
      no: "03",
      label: `an income of ${per(yearlyPlan)}`,
      value: lastsLabel,
      detail:
        result.runsOutAge === null
          ? "your pot still has money at 100"
          : `your pot can't make up the rest from ${result.runsOutAge}`,
      tone: lastsTone,
    },
    {
      no: "04",
      label: `income that lasts until ${input.planToAge}`,
      value: per(result.sustainableYearly),
      detail: `today's money${input.incomeIndexed ? ", rising with inflation" : ""}${
        input.includeStatePension ? ", state pension included" : ""
      }`,
      tone: "text-primary",
    },
  ];

  // ── What to know, most important first ──
  const notes: { tone: "info" | "warn" | "bad" | "good"; body: ReactNode }[] = [];
  if (input.retirementAge < 50) {
    notes.push({
      tone: "bad",
      body: (
        <>
          <strong>pensions can&apos;t usually be drawn before 50.</strong> occupational pensions allow early retirement
          from 50 if you&apos;ve left that employer; prsas and personal pensions generally from 60. earlier only for
          serious ill-health.
        </>
      ),
    });
  } else if (input.retirementAge < 60) {
    notes.push({
      tone: "warn",
      body: (
        <>
          <strong>check you can draw your pension at {input.retirementAge}.</strong> a workplace pension can usually be
          taken from 50 once you&apos;ve left that employer, but prsas and personal pensions generally only from 60.
        </>
      ),
    });
  }
  if (input.includeStatePension && input.retirementAge < LAST_RETIRED_AGE) {
    const before = potDrawAt(input.retirementAge);
    const after = potDrawAt(Math.max(spAge, input.retirementAge));
    notes.push({
      tone: retiringEarly ? "warn" : "info",
      body: retiringEarly ? (
        <>
          <strong>
            no state pension until {spAge}: {spAge - input.retirementAge} year{spAge - input.retirementAge === 1 ? "" : "s"} on
            your pot alone.
          </strong>{" "}
          your pot pays all {formatEuro(before)} a year until then. from {spAge} the state pension pays{" "}
          {formatEuro(statePensionYearly)} of it, so you draw {after > 0 ? `only ${formatEuro(after)}` : "nothing"} a year from
          the pot{result.runsOutAge !== null && result.runsOutAge < spAge ? " — if it lasts that long" : ""}.
        </>
      ) : (
        <>
          <strong>the state pension pays {formatEuro(statePensionYearly)} a year of your income</strong>, so you draw{" "}
          {after > 0 ? `only ${formatEuro(after)}` : "nothing"} a year from your pot (today&apos;s money).
        </>
      ),
    });
  }
  if (result.runsOutAge !== null && result.runsOutAge < input.planToAge) {
    notes.push({
      tone: "bad",
      body: (
        <>
          <strong>
            for {per(yearlyPlan)}, your pot runs out at {result.runsOutAge}.
          </strong>{" "}
          for an income that lasts until {input.planToAge}, aim for about {per(result.sustainableYearly)} instead
          (today&apos;s money){result.yearsToRetirement > 0 ? ", save more, or retire a little later" : ""}.
          {input.includeStatePension && result.runsOutAge >= spAge
            ? ` after that you'd live on the state pension of about ${formatEuro(statePensionYearly)} a year.`
            : ""}
        </>
      ),
    });
  } else {
    notes.push({
      tone: "good",
      body: (
        <>
          <strong>
            your plan lasts {result.runsOutAge === null ? "past 100" : `until ${result.runsOutAge}`}.
          </strong>{" "}
          you could have up to {per(result.sustainableYearly)} and still last until {input.planToAge}.
        </>
      ),
    });
  }
  if (result.cautiousRunsOutAge !== null && result.cautiousRunsOutAge !== result.runsOutAge) {
    notes.push({
      tone: "info",
      body: (
        <>
          <strong>
            if returns were {CAUTIOUS_GAP_PCT}% a year lower, it would run out at {result.cautiousRunsOutAge}
          </strong>{" "}
          instead of {result.runsOutAge ?? "after 100"}. markets don&apos;t grow in a straight line — a bad few years early
          in retirement hurts most.
        </>
      ),
    });
  }
  if (result.minimumFromAge !== null) {
    notes.push({
      tone: "info",
      body: (
        <>
          <strong>from {result.minimumFromAge}, revenue&apos;s arf minimum is more than you plan to draw.</strong> once
          you&apos;re 60, an arf is taxed as if at least 4% a year were taken out (5% from 70, 6% over €2m), so the
          calculator draws that much.
        </>
      ),
    });
  }
  if (result.lumpSum > RETIREMENT.taxFreeLumpSum) {
    notes.push({
      tone: "info",
      body: (
        <>
          <strong>only the first €200,000 of a lump sum is tax-free.</strong> the next €300,000 is taxed at 20%, and
          anything above that at your marginal rate — {show(result.lumpSumTax)} here.
        </>
      ),
    });
  }

  // Retirement in phases, split where income changes: the State Pension
  // starting, and the pot running dry (the year after its last payment).
  const emptyFrom = result.runsOutAge !== null ? result.runsOutAge + 1 : null;
  const breaks = [
    input.retirementAge,
    ...(input.includeStatePension && spAge > input.retirementAge ? [spAge] : []),
    ...(emptyFrom !== null && emptyFrom > input.retirementAge && emptyFrom < 100 ? [emptyFrom] : []),
  ]
    .filter((age, i, all) => all.indexOf(age) === i)
    .sort((a, b) => a - b);
  const phases = breaks.flatMap((start, i) => {
    const income = incomeAt(start);
    if (!income) return [];
    const next = breaks[i + 1];
    const hasSp = input.includeStatePension && start >= spAge;
    const empty = emptyFrom !== null && start >= emptyFrom;
    return [
      {
        title: next ? (next - 1 > start ? `${start}–${next - 1}` : String(start)) : `${start}+`,
        sub: empty
          ? hasSp
            ? "state pension only"
            : "pot empty"
          : hasSp
            ? "with the state pension"
            : input.includeStatePension
              ? "before the state pension"
              : "from your pot",
        income,
      },
    ];
  });

  const paidIn = result.totalContributions;
  const grown = Math.max(result.projectedPot - paidIn, 0);
  const growthShare = result.projectedPot > 0 ? (grown / result.projectedPot) * 100 : 0;

  return (
    <>
      <PageIntro
        label="calculator"
        lines={["plan your pension,", "from saving to spending."]}
        tone="sun"
        corners={{ left: "revenue rules · state pension · inflation", right: "illustrative, not advice" }}
        lead="see what your pot could grow to, what income it can pay you and for how long — including the years before the state pension starts at 66, your tax-free lump sum and inflation."
      />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page grid gap-16 px-0 md:px-0 lg:grid-cols-[22rem_1fr] lg:gap-20 xl:grid-cols-[24rem_1fr]">
          {/* ── Inputs ── */}
          <div className="lg:sticky lg:top-28 lg:max-h-[calc(100svh-8rem)] lg:self-start lg:overflow-y-auto lg:pr-3">
            <FieldGroup title="about you">
              <SliderField
                label="current age"
                value={base.currentAge}
                display={String(base.currentAge)}
                min={18}
                max={75}
                onChange={(v) => update("currentAge", v)}
              />
              <SliderField
                label="retire at"
                value={base.retirementAge}
                display={String(base.retirementAge)}
                min={Math.max(50, base.currentAge)}
                max={75}
                hint={
                  base.retirementAge < spAge
                    ? `the state pension starts at ${spAge}, so ${spAge - base.retirementAge} year${spAge - base.retirementAge === 1 ? "" : "s"} would be on your pot alone`
                    : undefined
                }
                onChange={(v) => update("retirementAge", v)}
              />
              <EuroField id="salary" label="annual salary" value={base.currentSalary} onChange={(v) => update("currentSalary", v)} />
              <EuroField
                id="pot"
                label="pension pot today"
                value={base.currentPotValue}
                hint="all your pensions, prsas and avcs added up"
                onChange={(v) => update("currentPotValue", v)}
              />
            </FieldGroup>

            <FieldGroup title="saving">
              <SliderField
                label="you pay in"
                value={base.employeeContributionPct}
                display={`${base.employeeContributionPct}% of pay`}
                min={0}
                max={40}
                onChange={(v) => update("employeeContributionPct", v)}
              />
              <SliderField
                label="your employer pays in"
                value={base.employerContributionPct}
                display={`${base.employerContributionPct}% of pay`}
                min={0}
                max={20}
                onChange={(v) => update("employerContributionPct", v)}
              />
              <SliderField
                label="pay rises a year"
                value={base.salaryGrowthPct}
                display={pct(base.salaryGrowthPct)}
                min={0}
                max={6}
                step={0.5}
                hint="contributions are a share of pay, so they grow with it"
                onChange={(v) => update("salaryGrowthPct", v)}
              />
              <div className="border-t border-border py-5">
                <Label className="lower font-mono text-xs text-muted-foreground">your tax rate</Label>
                <Select
                  value={String(base.marginalTaxRatePct)}
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

            <FieldGroup title="how it's invested">
              <div className="flex flex-wrap gap-2 border-t border-border py-5">
                <Chip active={growth.source === "mix"} onClick={() => setG({ source: "mix" })}>
                  choose a mix
                </Chip>
                <Chip active={growth.source === "fund"} onClick={() => setG({ source: "fund" })}>
                  use my fund
                </Chip>
              </div>

              {growth.source === "mix" ? (
                <>
                  <div className="flex flex-wrap gap-2 pb-4">
                    {MIX_PRESETS.map((p) => (
                      <Chip key={p.label} active={growth.savingShares === p.shares} onClick={() => setG({ savingShares: p.shares })}>
                        {p.label}
                      </Chip>
                    ))}
                  </div>
                  <SliderField
                    label="in shares while saving"
                    value={growth.savingShares}
                    display={`${growth.savingShares}%`}
                    min={0}
                    max={100}
                    step={5}
                    hint={`${mixLabel(growth.savingShares)} · about ${pct(preGrowth)} a year before charges over the long run`}
                    onChange={(v) => setG({ savingShares: v })}
                  />
                </>
              ) : (
                <div className="pb-5">
                  <Select value={growth.fundSlug ?? ""} onValueChange={(v) => v && chooseFund(v)}>
                    <SelectTrigger aria-label="your fund" className="lower h-10 w-full rounded-none border-0 border-b border-border bg-transparent px-0 text-left text-sm focus-visible:border-primary focus-visible:ring-0">
                      <SelectValue placeholder="choose your fund…">
                        {(slug: string) => {
                          const f = funds.find((x) => x.slug === slug);
                          return f ? `${f.providerName} — ${f.name}` : "choose your fund…";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {funds.map((f) => (
                        <SelectItem key={f.slug} value={f.slug}>
                          {f.providerName} — {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fund && fundShares !== null ? (
                    <div className="mt-4 space-y-3">
                      <p className="lower font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
                        about <span className="text-foreground">{fundShares}% in shares</span> ({mixLabel(fundShares)}), from
                        the markets that best match its past returns.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Chip active={growth.fundBasis === "mix"} onClick={() => setG({ fundBasis: "mix" })}>
                          long-run for its mix · {pct(mixGrowthPct(fundShares, assumptions))}
                        </Chip>
                        {fundRecord ? (
                          <Chip active={growth.fundBasis === "record"} onClick={() => setG({ fundBasis: "record" })}>
                            its {fundRecord.years}-yr record · {pct(fundRecord.pct)}
                          </Chip>
                        ) : null}
                      </div>
                      {growth.fundBasis === "record" && fundRecord ? (
                        <p className="lower font-mono text-[0.7rem] leading-relaxed text-warning">
                          {fundRecord.years} years is short: a strong or weak spell can flatter or hurt it. the long-run
                          figure is the steadier guide over decades.
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="lower mt-3 font-mono text-[0.7rem] text-muted-foreground">
                      pick the fund your pension is in and we&apos;ll use how much of it is in shares.
                    </p>
                  )}
                </div>
              )}

              <ToggleField
                id="lifestyle"
                label="reduce risk as retirement nears"
                checked={growth.lifestyle}
                hint={
                  growth.lifestyle
                    ? `growth moves to the retired mix over the last ${growth.lifestyleYears} years — many default pension funds do this ("lifestyling")`
                    : "stays in the saving mix right up to retirement"
                }
                onChange={(v) => setG({ lifestyle: v })}
              />
              {growth.lifestyle ? (
                <SliderField
                  label="over the last"
                  value={growth.lifestyleYears}
                  display={`${growth.lifestyleYears} years`}
                  min={3}
                  max={15}
                  onChange={(v) => setG({ lifestyleYears: v })}
                />
              ) : null}
              <SliderField
                label="in shares once retired"
                value={growth.retiredShares}
                display={`${growth.retiredShares}%`}
                min={0}
                max={100}
                step={5}
                hint={`about ${pct(postGrowth)} a year before charges · many people keep an arf you draw from at around half in shares`}
                onChange={(v) => setG({ retiredShares: v })}
              />
              <SliderField
                label="annual charge"
                value={base.fundAmcPct}
                display={`${base.fundAmcPct.toFixed(2)}%`}
                min={0}
                max={2.5}
                step={0.05}
                hint={fund?.amc !== undefined ? `${fund.name}'s published charge is ${fund.amc.toFixed(2)}%` : "check your annual statement"}
                onChange={(v) => update("fundAmcPct", v)}
              />
              <details className="group border-t border-border py-4">
                <summary className="lower cursor-pointer list-none font-mono text-xs text-muted-foreground hover:text-foreground">
                  long-run return assumptions <span className="group-open:hidden">↓</span>
                  <span className="hidden group-open:inline">↑</span>
                </summary>
                <SliderField
                  label="shares, a year"
                  value={growth.sharesReturnPct}
                  display={pct(growth.sharesReturnPct)}
                  min={2}
                  max={10}
                  step={0.25}
                  onChange={(v) => setG({ sharesReturnPct: v })}
                />
                <SliderField
                  label="bonds and cash, a year"
                  value={growth.bondsReturnPct}
                  display={pct(growth.bondsReturnPct)}
                  min={0}
                  max={6}
                  step={0.25}
                  hint="before charges and inflation. our defaults are cautious long-run figures, not forecasts."
                  onChange={(v) => setG({ bondsReturnPct: v })}
                />
              </details>
            </FieldGroup>

            <FieldGroup title="in retirement">
              <EuroField
                id="withdrawal"
                label="income you want"
                value={base.incomeAmount}
                hint={
                  base.includeStatePension
                    ? `in all, today's money, before tax. your pot makes up whatever the state pension${base.otherIncomeYearly > 0 ? " and other income" : ""} don't pay.`
                    : "in all, today's money, before tax. your pot pays it."
                }
                onChange={(v) => update("incomeAmount", v)}
              >
                <div className="flex shrink-0 gap-1.5">
                  {(["month", "year"] as IncomePer[]).map((p) => (
                    <Chip
                      key={p}
                      active={base.incomePer === p}
                      onClick={() => {
                        if (p === base.incomePer) return;
                        // Keep the same yearly amount when switching.
                        update("incomePer", p);
                        update("incomeAmount", Math.round(p === "month" ? base.incomeAmount / 12 : base.incomeAmount * 12));
                      }}
                    >
                      a {p}
                    </Chip>
                  ))}
                </div>
              </EuroField>
              <ToggleField
                id="indexed"
                label="rise with inflation"
                checked={base.incomeIndexed}
                hint={base.incomeIndexed ? "keeps its buying power every year" : "fixed in euros from retirement, so it buys less each year"}
                onChange={(v) => update("incomeIndexed", v)}
              />
              <ToggleField
                id="lump"
                label="take the 25% lump sum"
                checked={base.takeLumpSum}
                hint="the first €200,000 is tax-free; the rest of the pot stays invested in an arf"
                onChange={(v) => update("takeLumpSum", v)}
              />
              <ToggleField
                id="sp"
                label="include the state pension"
                checked={base.includeStatePension}
                hint={`paid from ${spAge} if you have enough prsi contributions`}
                onChange={(v) => update("includeStatePension", v)}
              />
              {base.includeStatePension ? (
                <EuroField
                  id="sp-weekly"
                  label="state pension a week"
                  value={base.statePensionWeekly}
                  hint={`full rate €${STATE_PENSION.contributoryMax2026.toFixed(2)} in 2026 (€${STATE_PENSION.contributoryMax2027.toFixed(2)} from january 2027). less with gaps in your prsi record — check mywelfare.ie.`}
                  onChange={(v) => update("statePensionWeekly", v)}
                />
              ) : null}
              <EuroField
                id="other"
                label="other income a year"
                value={base.otherIncomeYearly}
                hint="e.g. a defined benefit pension or rent, today's money"
                onChange={(v) => update("otherIncomeYearly", v)}
              />
              <div className="border-t border-border py-5">
                <Label className="lower font-mono text-xs text-muted-foreground">make it last until</Label>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PLAN_TO.filter((a) => a > base.retirementAge).map((a) => (
                    <Chip key={a} active={base.planToAge === a} onClick={() => update("planToAge", a)}>
                      {a}
                    </Chip>
                  ))}
                </div>
                <p className="lower mt-3 font-mono text-[0.7rem] leading-relaxed text-muted-foreground">
                  at 65, people in ireland live on average into their mid-80s, and many much longer — plan beyond the average.
                </p>
              </div>
            </FieldGroup>

            <FieldGroup title="inflation">
              <SliderField
                label="prices rise a year"
                value={base.inflationPct}
                display={pct(base.inflationPct)}
                min={0}
                max={5}
                step={0.25}
                hint="the ecb aims for 2%. today's-money figures take this out, so €1 means what €1 buys now."
                onChange={(v) => update("inflationPct", v)}
              />
            </FieldGroup>

            {/* Phones: the results sit below every input, so keep the answer in view while editing. */}
            <a
              href="#plan"
              className="lower sticky bottom-3 z-10 mt-8 flex items-center justify-between gap-4 rounded-full border border-border bg-background/90 px-5 py-3 font-mono text-xs backdrop-blur lg:hidden"
            >
              <span>
                <span className="text-muted-foreground">pot </span>
                <span className="tabular text-foreground">{show(result.projectedPot)}</span>
                <span className="text-muted-foreground"> · lasts </span>
                <span className={`tabular ${lastsTone}`}>{lastsLabel}</span>
              </span>
              <span className="text-primary">see plan ↓</span>
            </a>
          </div>

          {/* ── Results ── */}
          <div id="plan" className="min-w-0 scroll-mt-28">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionLabel>your plan</SectionLabel>
              <div className="flex gap-2" role="group" aria-label="show amounts">
                <Chip active={todaysMoney} onClick={() => setTodaysMoney(true)}>
                  today&apos;s money
                </Chip>
                <Chip active={!todaysMoney} onClick={() => setTodaysMoney(false)}>
                  future euros
                </Chip>
              </div>
            </div>

            <div className="mt-6 grid border-t border-border sm:grid-cols-2 xl:grid-cols-4">
              {headline.map((stat, i) => (
                <Reveal
                  key={stat.no}
                  delay={i * 70}
                  className="border-b border-border py-7 sm:px-6 sm:max-xl:odd:pl-0 sm:max-xl:even:border-l xl:border-b-0 xl:first:pl-0 xl:[&:not(:first-child)]:border-l"
                >
                  <span className="font-mono text-xs text-primary">{stat.no}</span>
                  <p className="lower mt-3 font-mono text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`tabular mt-3 font-heading text-3xl tracking-tight md:text-4xl ${stat.tone}`}>{stat.value}</p>
                  <p className="lower mt-3 text-sm text-muted-foreground">{stat.detail}</p>
                </Reveal>
              ))}
            </div>

            <ul className="mt-8 border-t border-border">
              {notes.map((n, i) => (
                <Note key={i} tone={n.tone}>
                  {n.body}
                </Note>
              ))}
            </ul>

            {/* Lifetime chart */}
            <div className="mt-16">
              <SectionLabel>{`your pot, age ${input.currentAge} to 100`}</SectionLabel>
              <div className="mt-8 border-t border-border pt-8">
                <LifetimeChart
                  years={result.years}
                  money={money}
                  retirementAge={input.retirementAge}
                  statePensionAge={input.includeStatePension ? spAge : null}
                  runsOutAge={result.runsOutAge}
                />
              </div>
              <p className="lower mt-4 font-mono text-xs text-muted-foreground">
                growing at {pct(input.preRetirementGrowthPct)} a year while saving
                {input.lifestyleYears > 0 ? `, easing to ${pct(input.postRetirementGrowthPct)} over the last ${input.lifestyleYears} years` : ""}
                {input.lifestyleYears === 0 ? `, ${pct(input.postRetirementGrowthPct)} once retired` : ""} — before the{" "}
                {input.fundAmcPct.toFixed(2)}% charge · {moneyNote}
              </p>
            </div>

            {/* Income */}
            <div className="mt-16">
              <SectionLabel>your income in retirement</SectionLabel>
              <div className={`mt-8 grid border-t border-border ${PHASE_COLUMNS[phases.length] ?? ""}`}>
                {phases.map((p, i) => (
                  <div
                    key={p.title}
                    className={`border-b border-border py-7 md:border-b-0 md:px-6 md:first:pl-0 ${i > 0 ? "md:border-l" : ""}`}
                  >
                    <p className="lower font-mono text-xs text-muted-foreground">
                      age {p.title} · {p.sub}
                    </p>
                    <p className="tabular mt-3 font-heading text-3xl tracking-tight">
                      {formatEuro(p.income.total / 12)}
                      <span className="text-base text-muted-foreground"> a month</span>
                    </p>
                    <p className="lower mt-2 text-sm text-muted-foreground">
                      {formatEuro(p.income.total)} a year · {replacement(p.income.total)}% of your final pay
                    </p>
                    <dl className="lower mt-4 space-y-1 font-mono text-xs text-muted-foreground">
                      {p.income.pot > 0 ? (
                        <div className="flex justify-between gap-4">
                          <dt>from your pot</dt>
                          <dd className="tabular text-foreground">{formatEuro(p.income.pot)}</dd>
                        </div>
                      ) : null}
                      {p.income.state > 0 ? (
                        <div className="flex justify-between gap-4">
                          <dt>state pension</dt>
                          <dd className="tabular text-foreground">{formatEuro(p.income.state)}</dd>
                        </div>
                      ) : null}
                      {p.income.other > 0 ? (
                        <div className="flex justify-between gap-4">
                          <dt>other income</dt>
                          <dd className="tabular text-foreground">{formatEuro(p.income.other)}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>
                ))}
              </div>
              <p className="lower mt-4 font-mono text-xs text-muted-foreground">
                today&apos;s money, before income tax and usc · your final pay is about {formatEuro(result.finalSalaryToday)} in
                today&apos;s money
              </p>
              {retiredYears.length > 0 ? (
                <div className="mt-10 border-t border-border pt-8">
                  <IncomeChart
                    years={result.years}
                    money={money}
                    finalPay={todaysMoney && result.yearsToRetirement > 0 ? Math.round(result.finalSalaryToday) : null}
                  />
                </div>
              ) : null}
            </div>

            {/* Saving */}
            {result.yearsToRetirement > 0 ? (
              <div className="mt-16">
                <SectionLabel>how the pot is built</SectionLabel>
                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="lower font-mono text-xs text-muted-foreground">by {input.retirementAge}, in future euros</span>
                    <span className="tabular font-heading text-lg">
                      {formatEuro(paidIn)} paid in · {formatEuro(grown)} growth
                    </span>
                  </div>
                  <div className="mt-4 flex h-0.5 w-full overflow-hidden bg-border">
                    <div className="bg-slate" style={{ width: `${100 - growthShare}%` }} />
                    <div className="bg-primary" style={{ width: `${growthShare}%` }} />
                  </div>
                  <p className="lower mt-3 font-mono text-xs text-muted-foreground">
                    {growthShare.toFixed(0)}% of the pot is growth after charges · charges cost {formatEuro(result.totalFeesDrag)} by
                    then
                  </p>
                </div>

                <dl className="mt-10 border-t border-border">
                  {[
                    { label: `tax relief this year`, value: `${formatEuro(result.annualTaxReliefSaved)} at ${input.marginalTaxRatePct}%` },
                    { label: `age-related relief limit (age ${input.currentAge})`, value: `${result.ageRelatedLimitPct}% of earnings` },
                    { label: "earnings cap for relief", value: formatEuro(result.earningsCap) },
                    { label: "most you can pay in with relief", value: `${formatEuro(result.maxRelievableContribution)} a year` },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border py-4">
                      <dt className="lower font-mono text-xs text-muted-foreground">{item.label}</dt>
                      <dd className="tabular font-heading text-lg">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="lower mt-4 max-w-2xl font-mono text-xs leading-relaxed text-muted-foreground">
                  relief limits rise with age — 15% under 30 up to 40% at 60+ — on earnings up to €115,000. employer
                  contributions don&apos;t count against your limit.{" "}
                  <Link href="/pensions-explained" className="link-underline text-foreground">
                    irish pensions explained
                  </Link>
                  .
                </p>
              </div>
            ) : null}

            {/* Year by year */}
            <details className="group mt-16 border-t border-border pt-6">
              <summary className="lower cursor-pointer list-none font-mono text-xs text-muted-foreground hover:text-foreground">
                year by year, {moneyNote} <span className="group-open:hidden">↓</span>
                <span className="hidden group-open:inline">↑</span>
              </summary>
              <div className="mt-6 overflow-x-auto">
                <table className="tabular w-full min-w-[34rem] text-right font-mono text-xs">
                  <thead className="lower text-muted-foreground">
                    <tr className="border-b border-border">
                      <th className="py-2 text-left font-normal">age</th>
                      <th className="py-2 font-normal">pot</th>
                      <th className="py-2 font-normal">from pot</th>
                      <th className="py-2 font-normal">state pension</th>
                      <th className="py-2 font-normal">total income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.years.map((y) => (
                      <tr key={`${y.phase}-${y.age}`} className={`border-b border-border/60 ${y.shortfall ? "text-destructive" : ""}`}>
                        <td className="py-1.5 text-left">
                          {y.age}
                          {y.age === input.retirementAge ? " · retire" : ""}
                        </td>
                        <td className="py-1.5">{formatEuro(money(y.potValue, y))}</td>
                        <td className="py-1.5">
                          {y.phase === "retired" ? formatEuro(money(y.withdrawal, y)) : "—"}
                          {y.minimumApplied ? "*" : ""}
                        </td>
                        <td className="py-1.5">{y.statePension ? formatEuro(money(y.statePension, y)) : "—"}</td>
                        <td className="py-1.5">
                          {y.phase === "retired" ? formatEuro(money(y.withdrawal + y.statePension + y.otherIncome, y)) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.minimumFromAge !== null ? (
                  <p className="lower mt-3 font-mono text-[0.7rem] text-muted-foreground">* revenue&apos;s arf minimum</p>
                ) : null}
              </div>
            </details>

            <div id="export" className="mt-16 scroll-mt-28 border-t border-border pt-8">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                  <p className="lower font-mono text-xs text-muted-foreground">take it with you</p>
                  <p className="lower mt-2 max-w-md text-sm text-muted-foreground">
                    a pdf report with the charts — your inputs, the pot, your income in retirement and every year to 100 —
                    or the same numbers as a csv spreadsheet.
                  </p>
                </div>
                <ExportButtons
                  onPdf={async () => {
                    const { downloadCalculatorReport } = await import("@/lib/pdf/calculator-report");
                    downloadCalculatorReport(input, result, { todaysMoney });
                  }}
                  onCsv={() => downloadCsv(csvFileName("calculator"), calculatorCsvRows(input, result))}
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
