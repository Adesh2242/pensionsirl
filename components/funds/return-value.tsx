import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** A signed percentage return, coloured and arrowed so direction reads before the digits do. */
export function ReturnValue({
  value,
  className,
  showIcon = false,
}: {
  value: number;
  className?: string;
  showIcon?: boolean;
}) {
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 font-medium",
        positive ? "text-success" : "text-destructive",
        className,
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
