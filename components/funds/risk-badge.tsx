import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RISK_STYLES: Record<number, string> = {
  1: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  2: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  3: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  4: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  5: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  6: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  7: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function RiskBadge({ risk }: { risk: number }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", RISK_STYLES[risk])}>
      Risk {risk}/7
    </Badge>
  );
}

const RISK_TEXT_STYLES: Record<number, string> = {
  1: "text-emerald-600 dark:text-emerald-400",
  2: "text-emerald-600 dark:text-emerald-400",
  3: "text-amber-600 dark:text-amber-400",
  4: "text-amber-600 dark:text-amber-400",
  5: "text-orange-600 dark:text-orange-400",
  6: "text-red-600 dark:text-red-400",
  7: "text-red-600 dark:text-red-400",
};

/** Text color matching the same risk tier as RiskBadge, for a raw number (e.g. "5/7") elsewhere on the page. */
export function riskTextClass(risk: number): string {
  return RISK_TEXT_STYLES[risk] ?? "";
}
