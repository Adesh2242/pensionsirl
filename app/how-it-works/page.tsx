import { providers } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hueForName } from "@/lib/color-hash";

export const metadata = {
  title: "How it Works",
  description: "How PensionIQ sources its data and calculates retirement projections.",
};

const faqs = [
  {
    q: "Where does the fund data come from?",
    a: "Provider names, fund names, asset classes, risk ratings, and 1/3/5/10-year return figures are sourced weekly from each provider's public fund centre and the National Pension Helpline fund explorer (funds.nationalpensionhelpline.ie) via scripts/scrape-funds.ts. NAV isn't published by this source — only returns are.",
  },
  {
    q: "How is the tax relief calculated?",
    a: "The calculator uses Revenue.ie's age-related percentage limits on net relevant earnings (15% under 30, rising to 40% at 60+) and the €115,000 earnings cap for relief purposes, applied to your marginal tax rate.",
  },
  {
    q: "Is this financial advice?",
    a: "No. PensionIQ is an information and comparison tool. Figures are illustrative and you should speak to a qualified financial advisor before making pension decisions.",
  },
  {
    q: "What happens to my data?",
    a: "In demo mode, accounts and saved preferences live only in your browser's local storage — nothing is sent to a server. See Settings for data export and deletion.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">How PensionIQ works</h1>
      <p className="mt-2 text-muted-foreground">
        A quick guide to where our data comes from and how the numbers are calculated.
      </p>

      <div className="mt-8 space-y-4">
        {faqs.map((faq) => (
          <Card key={faq.q}>
            <CardHeader>
              <CardTitle className="text-base">{faq.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{faq.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Providers covered</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {providers.map((p) => (
          <div key={p.slug} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${hueForName(p.name)}`}
              aria-hidden
            >
              {p.name[0]}
            </div>
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.realFundCount} funds (real count)</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
