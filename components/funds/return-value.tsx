import { cn } from "@/lib/utils";

/** A signed percentage return — tabular, coloured, and never shouting. */
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
