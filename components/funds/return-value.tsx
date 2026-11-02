import { cn } from "@/lib/utils";

/**
 * A signed percentage return — tabular, coloured, and never shouting. `null`
 * means the fund has no history for that period and renders as a dash, never
 * as a made-up 0%.
 */
export function ReturnValue({
  value,
  className,
  showIcon = false,
}: {
  value: number | null;
  className?: string;
  showIcon?: boolean;
}) {
  if (value === null) {
    return (
      <span className={cn("tabular text-muted-foreground", className)} title="Not enough history yet">
        —
      </span>
    );
  }
  const positive = value >= 0;
  return (
    <span
      className={cn("tabular inline-flex items-center gap-1", positive ? "text-success" : "text-destructive", className)}
    >
      {showIcon && (
        <span aria-hidden className="text-[0.8em]">
          {positive ? "↑" : "↓"}
        </span>
      )}
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}
