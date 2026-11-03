import Link from "next/link";
import { disclaimerLines, type DisclaimerKind } from "@/lib/disclaimers";

/**
 * The standard warning block for a page that shows projections or returns.
 * Kept in normal case (not the site's lowercase style): these are
 * regulatory-style warnings and should read as such.
 */
export function Disclaimer({ kind, className = "" }: { kind: DisclaimerKind; className?: string }) {
  const lines = disclaimerLines(kind);
  return (
    <aside
      aria-label="Important information"
      className={`border-l-2 border-warning py-1 pl-4 font-mono text-[0.72rem] leading-relaxed text-muted-foreground ${className}`}
    >
      <p className="mb-2 text-foreground">Important information</p>
      <ul className="space-y-1.5">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-2">
        <Link href="/how-it-works" className="link-underline text-foreground">
          How the numbers work
        </Link>{" "}
        ·{" "}
        <Link href="/privacy" className="link-underline text-foreground">
          Privacy
        </Link>
      </p>
    </aside>
  );
}
