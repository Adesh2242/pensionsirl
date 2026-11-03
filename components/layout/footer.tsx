import Link from "next/link";
import { Wordmark } from "@/components/layout/navbar";
import { FundDataUpdated } from "@/components/layout/fund-data-updated";
import { CookieSettingsLink } from "@/components/layout/cookie-settings-link";

const tools = [
  { href: "/portfolio", label: "my portfolio" },
  { href: "/funds", label: "fund explorer" },
  { href: "/compare", label: "compare funds" },
  { href: "/calculator", label: "retirement calculator" },
  { href: "/ai-suggestions", label: "ai suggestions" },
] as const;

const about = [
  { href: "/how-it-works", label: "how it works" },
  { href: "/privacy", label: "privacy policy" },
  { href: "/terms", label: "terms & disclaimer" },
  { href: "/settings", label: "your data" },
] as const;

const sources = [
  { href: "https://funds.nationalpensionhelpline.ie", label: "national pension helpline" },
  {
    href: "https://www.revenue.ie/en/jobs-and-pensions/pensions/index.aspx",
    label: "revenue.ie",
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-block">
            <Wordmark className="text-2xl" />
          </Link>
          <p className="lower mt-6 max-w-xs text-sm text-muted-foreground">
            every irish pension fund in one place — compared, projected and explained.
          </p>
        </div>

        <div>
          <p className="lower mb-5 font-mono text-xs text-muted-foreground">tools</p>
          <ul className="space-y-2.5">
            {tools.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="lower link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="lower mb-5 font-mono text-xs text-muted-foreground">about</p>
          <ul className="space-y-2.5">
            {about.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="lower link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <CookieSettingsLink className="lower link-underline text-sm text-muted-foreground transition-colors hover:text-foreground" />
            </li>
          </ul>
        </div>

        <div>
          <p className="lower mb-5 font-mono text-xs text-muted-foreground">data sources</p>
          <ul className="space-y-2.5">
            {sources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="lower link-underline text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {source.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="container-page lower flex flex-col gap-2 py-6 font-mono text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} pensioniq · <FundDataUpdated />
          </p>
          <p>
            information only — not regulated financial advice. past performance is not a reliable
            guide to future performance.
          </p>
        </div>
      </div>
    </footer>
  );
}
