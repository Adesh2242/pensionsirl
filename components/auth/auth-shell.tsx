import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Brand } from "@/components/layout/navbar";

const highlights = [
  "Compare 400+ funds from every major Irish provider",
  "Project your pot with Revenue's real tax relief limits",
  "Track what you hold and get monthly value estimates",
];

/**
 * Two-panel auth layout: the form on the left, a reminder of what an account
 * is actually for on the right (hidden on small screens, where it would just
 * push the form below the fold).
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <div className="bg-grid absolute inset-0" aria-hidden />
      <div className="container-page relative grid min-h-[calc(100vh-14rem)] items-center gap-12 py-14 lg:grid-cols-2 lg:gap-16">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-flex lg:hidden">
            <Brand />
          </Link>
          <div className="mt-6 rounded-2xl border bg-card p-6 shadow-lift sm:p-8 lg:mt-0">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>

        <aside className="hidden lg:block">
          <div className="bg-glow relative isolate overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/60 to-card p-10 shadow-soft">
            <div className="relative">
              <Brand />
              <p className="mt-6 text-2xl font-semibold leading-snug">
                Pension decisions are easier when you can see the whole market.
              </p>
              <ul className="mt-7 space-y-3.5">
                {highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    <span className="text-muted-foreground">{highlight}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-xs text-muted-foreground">
                Free to use. Not regulated financial advice.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
