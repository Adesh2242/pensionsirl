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

export function ProjectionChart({ data }: { data: CalculatorResult["yearlyProjection"] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="potGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="contribGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis dataKey="age" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis
          tickFormatter={(v) => `€${Math.round(v / 1000)}k`}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [
            formatEuro(Number(value)),
            name === "potValue" ? "Projected pot" : "Total contributions",
          ]}
          labelFormatter={(age) => `Age ${age}`}
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
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
