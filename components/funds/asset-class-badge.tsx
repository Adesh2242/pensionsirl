import { cn } from "@/lib/utils";
import type { AssetClass } from "@/lib/types";

/**
 * Asset class as a mono micro-label. Categories are distinguished by the dot's
 * colour rather than by seven competing pill backgrounds, which the editorial
 * surface can't carry.
 */
const DOT: Record<AssetClass, string> = {
  Equity: "bg-primary",
  Bond: "bg-slate",
  Cash: "bg-success",
  Property: "bg-sun",
  "Multi-Asset": "bg-warm",
  Lifecycle: "bg-[#9b8ad1]",
  Alternative: "bg-[#c77d9b]",
};

export function AssetClassBadge({
  assetClass,
  className,
}: {
  assetClass: AssetClass;
  className?: string;
}) {
  return (
    <span className={cn("lower inline-flex items-center gap-1.5 font-mono text-xs", className)}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[assetClass])} aria-hidden />
      {assetClass}
    </span>
  );
}
