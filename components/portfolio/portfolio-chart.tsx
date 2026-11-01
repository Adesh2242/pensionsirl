"use client";

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProjectionPoint } from "@/lib/portfolio/projection";
import { formatEuro } from "@/lib/utils";

function compactEuro(value: number) {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `€${Math.round(value / 1_000)}k`;
  return `€${Math.round(value)}`;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ProjectionPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const rows = [
    { label: "optimistic", value: point.optimistic, dot: "bg-primary/40" },
    { label: "expected", value: point.expected, dot: "bg-primary" },
    { label: "cautious", value: point.cautious, dot: "bg-primary/40" },
    { label: "paid in", value: point.paidIn, dot: "bg-slate" },
  ];
  return (
    <div className="lower rounded-[var(--radius)] border border-border bg-popover px-3.5 py-2.5 font-mono text-xs">
      <p className="text-popover-foreground">
        {point.year}
        {point.offset > 0 && <span className="text-muted-foreground"> · in {point.offset}y</span>}
      </p>
      <div className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${row.dot}`} aria-hidden />
            <span className="text-muted-foreground">{row.label}</span>
            <span className="tabular ml-auto pl-4 text-popover-foreground">
              {formatEuro(row.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The portfolio's future: the expected path as a filled line, the
 * cautious–optimistic range as a band around it, and what you'd have from
 * contributions alone as a dashed baseline — the gap above it is growth.
 */
export function PortfolioChart({ points }: { points: ProjectionPoint[] }) {
  const data = points.map((p) => ({ ...p, range: [p.cautious, p.optimistic] as [number, number] }));

  return (
    <div className="space-y-4">
      <div className="lower flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          expected
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-3 rounded-full bg-primary/25" aria-hidden />
          cautious – optimistic
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-3 border-t border-dashed border-slate" aria-hidden />
          paid in, no growth
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="expectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 6" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="year"
            tickLine={false}
            axisLine={false}
            fontSize={12}
            tickMargin={8}
            stroke="var(--color-muted-foreground)"
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tickFormatter={compactEuro}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={60}
            stroke="var(--color-muted-foreground)"
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="range"
            stroke="none"
            fill="var(--color-primary)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="expected"
            stroke="var(--color-primary)"
            strokeWidth={2.5}
            fill="url(#expectedGradient)"
          />
          <Line
            type="monotone"
            dataKey="paidIn"
            stroke="var(--color-slate)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
