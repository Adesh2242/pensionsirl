import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <p className="font-semibold text-foreground">PensionIQ</p>
            <p className="mt-2">Ireland&apos;s pension fund explorer and retirement calculator.</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Tools</p>
            <ul className="mt-2 space-y-1">
              <li><Link href="/funds" className="hover:text-foreground">Fund explorer</Link></li>
              <li><Link href="/compare" className="hover:text-foreground">Compare funds</Link></li>
              <li><Link href="/calculator" className="hover:text-foreground">Retirement calculator</Link></li>
              <li><Link href="/ai-suggestions" className="hover:text-foreground">AI suggestions</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">About</p>
            <ul className="mt-2 space-y-1">
              <li><Link href="/how-it-works" className="hover:text-foreground">How it works</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Privacy policy</Link></li>
              <li><Link href="/settings" className="hover:text-foreground">Your data &amp; privacy</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-foreground">Data sources</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a
                  href="https://funds.nationalpensionhelpline.ie"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  National Pension Helpline
                </a>
              </li>
              <li>
                <a
                  href="https://www.revenue.ie/en/jobs-and-pensions/pensions/index.aspx"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  Revenue.ie
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t pt-6">
          © {new Date().getFullYear()} PensionIQ. Not financial advice — figures are
          illustrative. Data sourced from public provider fund centres; see fund pages for
          details.
        </p>
      </div>
    </footer>
  );
}
