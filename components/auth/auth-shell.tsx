import type { ReactNode } from "react";
import Link from "next/link";
import { Field } from "@/components/editorial/field";
import { SectionLabel } from "@/components/editorial/section-label";

const highlights = [
  "every irish provider in one searchable list",
  "projections on revenue's real relief limits",
  "track what you hold, get monthly estimates",
];

/**
 * Two-panel auth layout: the gradient field and the argument on the left, the
 * form on the right. On small screens the field collapses to a header strip.
 */
export function AuthShell({
  label,
  lines,
  description,
  children,
  footer,
}: {
  label: string;
  /** Headline, one entry per line. */
  lines: readonly string[];
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="px-3 pb-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Field
          className="flex min-h-[18rem] flex-col justify-end rounded-[var(--radius)] lg:min-h-[calc(100svh-1.5rem)]"
          tone="teal"
        >
          <div className="px-7 pb-10 pt-28 md:px-10 md:pb-14 lg:pt-40">
            <SectionLabel>{label}</SectionLabel>
            <h1 className="lower mt-7 font-heading text-[11vw] leading-[0.95] tracking-tight md:text-[4.4vw]">
              {lines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <ul className="mt-12 hidden border-t border-border pt-6 lg:block">
              {highlights.map((highlight) => (
                <li
                  key={highlight}
                  className="lower flex items-baseline gap-3 border-b border-border py-3 text-sm text-muted-foreground"
                >
                  <span className="text-primary" aria-hidden>
                    ▸
                  </span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </Field>

        <div className="flex items-center px-4 py-14 md:px-10 lg:py-20">
          <div className="mx-auto w-full max-w-md">
            <p className="lower text-sm text-muted-foreground">{description}</p>
            <div className="mt-10">{children}</div>
            {footer && (
              <div className="lower mt-10 border-t border-border pt-6 font-mono text-xs text-muted-foreground">
                {footer}
              </div>
            )}
            <Link
              href="/"
              className="lower link-underline mt-10 inline-block font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              ← back to pensioniq
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
