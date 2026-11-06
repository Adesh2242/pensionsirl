"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PlanYear } from "@/lib/types";
import { formatEuro } from "@/lib/utils";

const compact = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `€${(v / 1_000_000).toFixed(1)}m` : `€${Math.round(v / 1000)}k`;

function ChartTooltip({
  active,
  payload,
  label,
  labels,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; color?: string }[];
  label?: string | number;
  labels: Record<string, string>;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((e) => Number(e.value) > 0 || e.dataKey === "pot");
  return (
    <div className="lower rounded-[var(--radius)] border border-border bg-popover px-3.5 py-2.5 font-mono text-xs">
      <p className="text-popover-foreground">age {label}</p>
      <div className="mt-1.5 space-y-1">
        {rows.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
            <span className="text-muted-foreground">{labels[String(entry.dataKey)] ?? String(entry.dataKey)}</span>
            <span className="tabular ml-auto pl-4 text-popover-foreground">{formatEuro(Number(entry.value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Legend({ items, note }: { items: { label: string; className: string; dashed?: boolean }[]; note?: string }) {
  return (
    <div className="lower flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-2">
          <span
            className={item.dashed ? `h-0 w-3 border-t border-dashed ${item.className}` : `h-1.5 w-1.5 rounded-full ${item.className}`}
            aria-hidden
          />
          {item.label}
        </span>
      ))}
      {note ? <span className="ml-auto hidden sm:inline">{note}</span> : null}
    </div>
  );
}

const axis = { tickLine: false, axisLine: false, fontSize: 12, stroke: "var(--color-muted-foreground)" } as const;

/** The pot over a lifetime: building up while saving, then drawn down. */
export function LifetimeChart({
  years,
  money,
  retirementAge,
  statePensionAge,
  runsOutAge,
}: {
  years: PlanYear[];
  /** Turns a future-euro amount in a given year into what's shown. */
  money: (value: number, year: PlanYear) => number;
  retirementAge: number;
  statePensionAge: number | null;
  runsOutAge: number | null;
}) {
  const data = years.map((y) => ({
    age: y.age,
    pot: Math.round(money(y.potValue, y)),
    paidIn: y.phase === "saving" || y.age === retirementAge ? Math.round(money(y.contributions, y)) : undefined,
  }));
  const reference = (x: number, text: string, color = "var(--color-muted-foreground)") => (
    <ReferenceLine
      x={x}
      stroke={color}
      strokeDasharray="3 4"
      label={{ value: text, position: "insideTopLeft", fontSize: 11, fill: color, offset: 8 }}
    />
  );
  return (
    <div className="space-y-3">
      <Legend
        items={[
          { label: "pot", className: "bg-primary" },
          { label: "paid in while saving", className: "border-slate", dashed: true },
        ]}
        note="the pot builds while you work, then pays your income"
      />
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="potGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" vertical={false} className="stroke-border" />
          <XAxis dataKey="age" {...axis} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tickFormatter={compact} {...axis} width={60} />
          <Tooltip
            content={<ChartTooltip labels={{ pot: "pot", paidIn: "paid in so far" }} />}
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          />
          {reference(retirementAge, `retire ${retirementAge}`)}
          {statePensionAge !== null && statePensionAge > retirementAge ? reference(statePensionAge, "state pension") : null}
          {runsOutAge !== null ? reference(runsOutAge, `runs out ${runsOutAge}`, "var(--color-destructive)") : null}
          <Area isAnimationActive={false} type="monotone" dataKey="pot" stroke="var(--color-primary)" fill="url(#potGradient)" strokeWidth={2.5} />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="paidIn"
            stroke="var(--color-slate)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Yearly income in retirement by where it comes from, against pay before retiring. */
export function IncomeChart({
  years,
  money,
  finalPay,
}: {
  years: PlanYear[];
  money: (value: number, year: PlanYear) => number;
  /** Pay in the last working year, in the units shown; drawn as a reference line when given. */
  finalPay: number | null;
}) {
  const data = years
    .filter((y) => y.phase === "retired")
    .map((y) => ({
      age: y.age,
      fromPot: Math.round(money(y.withdrawal, y)),
      statePension: Math.round(money(y.statePension, y)),
      other: Math.round(money(y.otherIncome, y)),
    }));
  const hasOther = data.some((d) => d.other > 0);
  return (
    <div className="space-y-3">
      <Legend
        items={[
          { label: "from your pot", className: "bg-primary" },
          { label: "state pension", className: "bg-sun" },
          ...(hasOther ? [{ label: "other income", className: "bg-slate" }] : []),
          ...(finalPay ? [{ label: "your pay before retiring", className: "border-foreground/50", dashed: true }] : []),
        ]}
        note="before income tax and usc"
      />
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} barCategoryGap={1}>
          <CartesianGrid strokeDasharray="2 6" vertical={false} className="stroke-border" />
          <XAxis dataKey="age" {...axis} tickMargin={8} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tickFormatter={compact} {...axis} width={60} />
          <Tooltip
            content={
              <ChartTooltip labels={{ fromPot: "from your pot", statePension: "state pension", other: "other income" }} />
            }
            cursor={{ fill: "var(--color-muted)", opacity: 0.3 }}
          />
          {finalPay ? (
            <ReferenceLine y={finalPay} ifOverflow="extendDomain" stroke="var(--color-foreground)" strokeOpacity={0.5} strokeDasharray="4 4" />
          ) : null}
          <Bar isAnimationActive={false} dataKey="fromPot" stackId="income" fill="var(--color-primary)" />
          <Bar isAnimationActive={false} dataKey="statePension" stackId="income" fill="var(--color-sun)" />
          {hasOther ? <Bar isAnimationActive={false} dataKey="other" stackId="income" fill="var(--color-slate)" /> : null}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
