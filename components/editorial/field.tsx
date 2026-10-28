import type { ReactNode } from "react";

interface FieldProps {
  children?: ReactNode;
  /** Which pairing of warm and cool accents lights the field. */
  tone?: "teal" | "sun" | "slate";
  className?: string;
  /** Slowly drift the gradient so the surface never sits completely still. */
  drift?: boolean;
}

/**
 * The signature backdrop: a warm ellipse low-left and a cool one high-right,
 * dissolving into near-black under a layer of film grain.
 */
export function Field({ children, tone = "teal", className = "", drift = true }: FieldProps) {
  return (
    // `isolate` keeps the -z-10 gradient inside this element's stacking
    // context; without it the layer escapes and hides behind the page background.
    <div className={`grain relative isolate overflow-hidden ${className}`}>
      <div
        className={`field field-${tone} absolute inset-0 -z-10 ${drift ? "animate-drift" : ""}`}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}
