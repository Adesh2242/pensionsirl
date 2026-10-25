"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Info, PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageHeader } from "@/components/layout/page-header";
import { ProjectionChart } from "@/components/calculator/projection-chart";
import { calculateProjection } from "@/lib/calculations";
import { formatEuro } from "@/lib/utils";
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
  "20": "20% (standard rate)",
  "40": "40% (higher rate)",
};

/** A slider with its current value shown as a pill, so the number is always readable. */
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
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">{label}</Label>
        <span className="tabular rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">
          {display}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(firstOf(v))}
        aria-label={label}
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
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          €
        </span>
        <Input
          id={id}
          type="number"
          min={0}
          inputMode="numeric"
          className="tabular h-10 pl-7"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
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
      icon: PiggyBank,
      tone: "text-chart-1",
      label: `Projected pot at ${input.retirementAge}`,
      value: formatEuro(result.projectedPot),
      detail: `${result.yearsToRetirement} years of contributions and growth`,
    },
    {
      icon: TrendingUp,
      tone: "text-success",
      label: "Tax relief saved this year",
      value: formatEuro(result.annualTaxReliefSaved),
      detail: `At your ${input.marginalTaxRatePct}% marginal rate`,
    },
    {
      icon: TrendingDown,
      tone: "text-destructive",
      label: "Charges paid over time",
      value: formatEuro(result.totalFeesDrag),
      detail: `${input.fundAmcPct.toFixed(2)}% AMC compounded to retirement`,
    },
  ];

  const taxDetail = [
    {
      label: `Age-related relief limit (age ${input.currentAge})`,
      value: `${result.ageRelatedLimitPct}% of earnings`,
    },
    { label: "Earnings cap for relief", value: formatEuro(result.earningsCap) },
    { label: "Max relievable contribution", value: formatEuro(result.maxRelievableContribution) },
    { label: "Total contributions to retirement", value: formatEuro(result.totalContributions) },
  ];

  return (
    <>
      <PageHeader
        eyebrow={<span>Irish Revenue rules · {new Date().getFullYear()}</span>}
        title="Retirement calculator"
        description="Project your pension pot using Revenue's age-related tax relief limits and the €115,000 earnings cap. Figures are illustrative and not financial advice."
      />

      <div className="container-page py-10">
        <div className="grid gap-6 lg:grid-cols-[22rem_1fr] xl:grid-cols-[24rem_1fr]">
          {/* Inputs stay in view while the results update beside them. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className="shadow-soft">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Your details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-7 pt-5">
                <FieldGroup title="About you">
                  <SliderField
                    label="Current age"
                    value={input.currentAge}
                    display={String(input.currentAge)}
                    min={18}
                    max={69}
                    onChange={(v) => update("currentAge", v)}
                  />
                  <SliderField
                    label="Retirement age"
                    value={input.retirementAge}
                    display={String(input.retirementAge)}
                    min={input.currentAge + 1}
                    max={70}
                    onChange={(v) => update("retirementAge", v)}
                  />
                  <EuroField
                    id="salary"
                    label="Annual salary"
                    value={input.currentSalary}
                    onChange={(v) => update("currentSalary", v)}
                  />
                  <EuroField
                    id="pot"
                    label="Current pension pot"
                    value={input.currentPotValue}
                    onChange={(v) => update("currentPotValue", v)}
                  />
                </FieldGroup>

                <FieldGroup title="Contributions">
                  <SliderField
                    label="Your contribution"
                    value={input.employeeContributionPct}
                    display={`${input.employeeContributionPct}%`}
                    min={0}
                    max={40}
                    onChange={(v) => update("employeeContributionPct", v)}
                  />
                  <SliderField
                    label="Employer contribution"
                    value={input.employerContributionPct}
                    display={`${input.employerContributionPct}%`}
                    min={0}
                    max={20}
                    onChange={(v) => update("employerContributionPct", v)}
                  />
                </FieldGroup>

                <FieldGroup title="Assumptions">
                  <SliderField
                    label="Assumed annual growth"
                    value={input.assumedGrowthRatePct}
                    display={`${input.assumedGrowthRatePct}%`}
                    min={0}
                    max={10}
                    step={0.5}
                    onChange={(v) => update("assumedGrowthRatePct", v)}
                  />
                  <SliderField
                    label="Fund annual charge"
                    value={input.fundAmcPct}
                    display={`${input.fundAmcPct.toFixed(2)}%`}
                    min={0}
                    max={2}
                    step={0.05}
                    onChange={(v) => update("fundAmcPct", v)}
                  />
                  <div className="space-y-2">
                    <Label className="text-sm">Marginal tax rate</Label>
                    <Select
                      value={String(input.marginalTaxRatePct)}
                      onValueChange={(v) => v && update("marginalTaxRatePct", Number(v) as 20 | 40)}
                    >
                      <SelectTrigger className="h-10 w-full">
                        <SelectValue>
                          {(value: string) => TAX_RATE_LABELS[value] ?? value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20% (standard rate)</SelectItem>
                        <SelectItem value="40">40% (higher rate)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </FieldGroup>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-3">
              {headline.map((stat) => (
                <Card key={stat.label} className="shadow-soft">
                  <CardContent className="pt-1">
                    <div className={`icon-tile size-10 ${stat.tone}`}>
                      <stat.icon className="h-4.5 w-4.5" aria-hidden />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`tabular mt-1 text-2xl font-semibold ${stat.tone}`}>
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="shadow-soft">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Pot growth vs. contributions</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <ProjectionChart data={result.yearlyProjection} />

                {/* What share of the final pot is growth rather than money paid in. */}
                <div className="mt-6 space-y-2 border-t pt-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Made up of</span>
                    <span className="tabular font-medium">
                      {formatEuro(result.totalContributions)} in · {formatEuro(growth)} growth
                    </span>
                  </div>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="bg-muted-foreground/50"
                      style={{ width: `${100 - growthShare}%` }}
                    />
                    <div className="bg-primary" style={{ width: `${growthShare}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {growthShare.toFixed(0)}% of your projected pot comes from compound growth,
                    after charges.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Tax relief detail</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {taxDetail.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-baseline justify-between gap-3 border-b pb-3 last:border-b-0 sm:last:border-b-0"
                    >
                      <dt className="text-sm text-muted-foreground">{item.label}</dt>
                      <dd className="tabular shrink-0 font-semibold">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span>
                    Relief limits rise with age (15% under 30 up to 40% at 60+) and apply to net
                    relevant earnings up to the €115,000 cap. Employer contributions don&apos;t
                    count against your personal limit.
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
