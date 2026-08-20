import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AssetClass } from "@/lib/types";

// Fixed hue per asset class (never cycled) so the same category always reads
// as the same color across fund cards, filters, and the compare table.
const ASSET_CLASS_STYLES: Record<AssetClass, string> = {
  Equity: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  Bond: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  Cash: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  Property: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  "Multi-Asset": "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  Lifecycle: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  Alternative: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
};

export function AssetClassBadge({ assetClass }: { assetClass: AssetClass }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", ASSET_CLASS_STYLES[assetClass])}>
      {assetClass}
    </Badge>
  );
}
