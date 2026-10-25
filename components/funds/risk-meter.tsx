import { cn } from "@/lib/utils";

const TIER_FILL: Record<number, string> = {
  1: "bg-success",
  2: "bg-success",
  3: "bg-warning",
  4: "bg-warning",
  5: "bg-warning",
  6: "bg-destructive",
  7: "bg-destructive",
};

/**
 * Seven-segment SRI meter. A number from 1–7 means little on its own; the
 * filled run makes "where this sits on the scale" readable at a glance.
 */
export function RiskMeter({
  risk,
  className,
  size = "default",
}: {
  risk: number;
  className?: string;
  size?: "default" | "sm";
}) {
  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="img"
      aria-label={`Risk rating ${risk} out of 7`}
    >
      {Array.from({ length: 7 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "flex-1 rounded-full transition-colors",
            size === "sm" ? "h-1" : "h-1.5",
            i < risk ? TIER_FILL[risk] : "bg-border",
          )}
        />
      ))}
    </div>
  );
}
