import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The banded header every inner route opens with, so page titles, eyebrows and
 * primary actions land in the same place no matter which tool you're in.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative overflow-hidden border-b bg-gradient-to-b from-accent/40 to-background",
        className,
      )}
    >
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="container-page relative py-10 sm:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            {eyebrow && (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                {eyebrow}
              </div>
            )}
            <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
            {description && (
              <div className="mt-3 text-base leading-relaxed text-muted-foreground">
                {description}
              </div>
            )}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
        </div>
        {children}
      </div>
    </header>
  );
}
