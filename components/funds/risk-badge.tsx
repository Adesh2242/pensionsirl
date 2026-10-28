import { cn } from "@/lib/utils";

// Risk tiers map onto the theme's semantic colours, which are tuned for the
// near-black canvas rather than for white.
const RISK_TEXT_STYLES: Record<number, string> = {
  1: "text-success",
  2: "text-success",
  3: "text-warning",
  4: "text-warning",
  5: "text-warning",
  6: "text-destructive",
  7: "text-destructive",
};

/** Micro-label: "risk 6/7", coloured by tier. No pill — the type carries it. */
export function RiskBadge({ risk, className }: { risk: number; className?: string }) {
  return (
    <span
      className={cn(
        "lower tabular font-mono text-xs",
        RISK_TEXT_STYLES[risk] ?? "text-muted-foreground",
        className,
      )}
    >
      risk {risk}/7
    </span>
  );
}

/** Text color matching the same risk tier, for a raw number elsewhere on the page. */
export function riskTextClass(risk: number): string {
  return RISK_TEXT_STYLES[risk] ?? "";
}
