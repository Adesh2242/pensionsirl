import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Risk tiers map onto the theme's semantic colours (success / warning /
// destructive) rather than raw palette steps, so they track the theme and
// stay legible in dark mode.
const RISK_STYLES: Record<number, string> = {
  1: "bg-success/12 text-success ring-success/20",
  2: "bg-success/12 text-success ring-success/20",
  3: "bg-warning/15 text-warning ring-warning/25",
  4: "bg-warning/15 text-warning ring-warning/25",
  5: "bg-warning/15 text-warning ring-warning/25",
  6: "bg-destructive/12 text-destructive ring-destructive/20",
  7: "bg-destructive/12 text-destructive ring-destructive/20",
};

export function RiskBadge({ risk }: { risk: number }) {
  return (
    <Badge
      variant="secondary"
      className={cn("tabular font-medium ring-1 ring-inset", RISK_STYLES[risk])}
    >
      Risk {risk}/7
    </Badge>
  );
}

const RISK_TEXT_STYLES: Record<number, string> = {
  1: "text-success",
  2: "text-success",
  3: "text-warning",
  4: "text-warning",
  5: "text-warning",
  6: "text-destructive",
  7: "text-destructive",
};

/** Text color matching the same risk tier as RiskBadge, for a raw number (e.g. "5/7") elsewhere on the page. */
export function riskTextClass(risk: number): string {
  return RISK_TEXT_STYLES[risk] ?? "";
}
