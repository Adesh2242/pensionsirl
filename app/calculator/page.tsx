"use client";

import { useMemo, useState } from "react";
import { PiggyBank, TrendingDown, TrendingUp } from "lucide-react";
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
import { ProjectionChart } from "@/components/calculator/projection-chart";
import { calculateProjection } from "@/lib/calculations";
import type { CalculatorInput } from "@/lib/types";

function firstOf(value: number | readonly number[]): number {
  return Array.isArray(value) ? value[0] : (value as number);
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
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

export default function CalculatorPage() {
  const [input, setInput] = useState<CalculatorInput>(DEFAULTS);

  const result = useMemo(() => calculateProjection(input), [input]);

  function update<K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Retirement calculator</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Project your pension pot using Irish Revenue&apos;s age-related tax relief limits.
        Figures are illustrative and not financial advice.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Current age</Label>
                <span className="font-medium">{input.currentAge}</span>
              </div>
              <Slider
                min={18}
                max={69}
                step={1}
                value={[input.currentAge]}
                onValueChange={(v) => update("currentAge", firstOf(v))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Retirement age</Label>
                <span className="font-medium">{input.retirementAge}</span>
              </div>
              <Slider
                min={input.currentAge + 1}
                max={70}
                step={1}
                value={[input.retirementAge]}
                onValueChange={(v) => update("retirementAge", firstOf(v))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Annual salary</Label>
              <Input
                id="salary"
                type="number"
                value={input.currentSalary}
                onChange={(e) => update("currentSalary", Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pot">Current pension pot</Label>
              <Input
                id="pot"
                type="number"
                value={input.currentPotValue}
                onChange={(e) => update("currentPotValue", Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Your contribution</Label>
                <span className="font-medium">{input.employeeContributionPct}%</span>
              </div>
              <Slider
                min={0}
                max={40}
                step={1}
                value={[input.employeeContributionPct]}
                onValueChange={(v) => update("employeeContributionPct", firstOf(v))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Employer contribution</Label>
                <span className="font-medium">{input.employerContributionPct}%</span>
              </div>
              <Slider
                min={0}
                max={20}
                step={1}
                value={[input.employerContributionPct]}
                onValueChange={(v) => update("employerContributionPct", firstOf(v))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Assumed annual growth</Label>
                <span className="font-medium">{input.assumedGrowthRatePct}%</span>
              </div>
              <Slider
                min={0}
                max={10}
                step={0.5}
                value={[input.assumedGrowthRatePct]}
                onValueChange={(v) => update("assumedGrowthRatePct", firstOf(v))}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Fund AMC</Label>
                <span className="font-medium">{input.fundAmcPct}%</span>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.05}
                value={[input.fundAmcPct]}
                onValueChange={(v) => update("fundAmcPct", firstOf(v))}
              />
            </div>

            <div className="space-y-2">
              <Label>Marginal tax rate</Label>
              <Select
                value={String(input.marginalTaxRatePct)}
                onValueChange={(v) => v && update("marginalTaxRatePct", Number(v) as 20 | 40)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20% (standard rate)</SelectItem>
                  <SelectItem value="40">40% (higher rate)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <PiggyBank className="h-4.5 w-4.5" aria-hidden />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Projected pot at {input.retirementAge}</p>
                <p className="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {formatEuro(result.projectedPot)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                  <TrendingUp className="h-4.5 w-4.5" aria-hidden />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Tax relief saved this year</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatEuro(result.annualTaxReliefSaved)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                  <TrendingDown className="h-4.5 w-4.5" aria-hidden />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Estimated fees over time</p>
                <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
                  {formatEuro(result.totalFeesDrag)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pot growth vs. contributions</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectionChart data={result.yearlyProjection} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tax relief detail</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Age-related relief limit ({input.currentAge} years old)
                </p>
                <p className="text-lg font-medium">{result.ageRelatedLimitPct}% of earnings</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Earnings cap for relief</p>
                <p className="text-lg font-medium">{formatEuro(result.earningsCap)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Max relievable contribution</p>
                <p className="text-lg font-medium">
                  {formatEuro(result.maxRelievableContribution)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total contributions to retirement</p>
                <p className="text-lg font-medium">{formatEuro(result.totalContributions)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
