"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CalculatorResult } from "@/lib/types";
import { formatEuro } from "@/lib/utils";

const SERIES_LABELS: Record<string, string> = {
  potValue: "Projected pot",
  contributions: "Total contributions",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; color?: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-lift">
      <p className="font-medium text-popover-foreground">Age {label}</p>
      <div className="mt-1.5 space-y-1">
        {payload.map((entry) => (
          <div key={String(entry.dataKey)} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {SERIES_LABELS[String(entry.dataKey)] ?? String(entry.dataKey)}
            </span>
            <span className="tabular ml-auto font-medium text-popover-foreground">
              {formatEuro(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectionChart({ data }: { data: CalculatorResult["yearlyProjection"] }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
          Projected pot
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground" aria-hidden />
          Total contributions
        </span>
        <span className="ml-auto">The gap between the two is compound growth, after charges.</span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="potGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="contribGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickMargin={8}
            stroke="var(--color-muted-foreground)"
          />
          <YAxis
            tickFormatter={(v) => `€${Math.round(v / 1000)}k`}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={56}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="contributions"
            stroke="var(--color-muted-foreground)"
            fill="url(#contribGradient)"
            strokeWidth={1.5}
          />
          <Area
            type="monotone"
            dataKey="potValue"
            stroke="var(--color-primary)"
            fill="url(#potGradient)"
            strokeWidth={2.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
