import Link from "next/link";
import { Brand } from "@/components/layout/navbar";

const columns = [
  {
    title: "Tools",
    links: [
      { href: "/funds", label: "Fund explorer" },
      { href: "/compare", label: "Compare funds" },
      { href: "/calculator", label: "Retirement calculator" },
      { href: "/ai-suggestions", label: "AI suggestions" },
    ],
  },
  {
    title: "About",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/settings", label: "Your data & privacy" },
    ],
  },
];

const sources = [
  { href: "https://funds.nationalpensionhelpline.ie", label: "National Pension Helpline" },
  {
    href: "https://www.revenue.ie/en/jobs-and-pensions/pensions/index.aspx",
    label: "Revenue.ie",
  },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/40">
      <div className="container-page py-14 text-sm text-muted-foreground">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="max-w-xs">
            <Brand className="text-foreground" />
            <p className="mt-3 leading-relaxed">
              Ireland&apos;s pension fund explorer, comparison tool and retirement calculator.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Data sources
            </p>
            <ul className="mt-3 space-y-2.5">
              {sources.map((source) => (
                <li key={source.href}>
                  <a
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-foreground"
                  >
                    {source.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PensionIQ. All figures are illustrative.</p>
          <p>
            Not regulated financial advice — data sourced from public provider fund centres.
          </p>
        </div>
      </div>
    </footer>
  );
}
