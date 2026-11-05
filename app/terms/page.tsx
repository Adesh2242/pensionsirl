import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/editorial/page-intro";
import {
  DATA_SOURCE,
  NOT_ADVICE,
  WARNING_ESTIMATES,
  WARNING_PAST_PERFORMANCE,
  WARNING_TAX,
  WARNING_VALUE,
} from "@/lib/disclaimers";

export const metadata = pageMetadata({
  title: "Terms & Disclaimer",
  description:
    "PensionIQ is an information tool, not financial advice. The terms of using it.",
  path: "/terms",
});

const LAST_UPDATED = "2026-11-03";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="lower font-heading text-2xl tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <PageIntro
        label="terms"
        lines={["information,", "not advice."]}
        tone="slate"
        corners={{ left: `last updated ${LAST_UPDATED}`, right: "terms & disclaimer" }}
        lead="what pensioniq is, what it isn't, and the terms of using it."
      />

      <div className="container-page max-w-3xl px-6 py-14 md:px-10 md:py-20">
        <div className="space-y-10 text-sm leading-relaxed text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          <div className="space-y-2 border-l-2 border-warning py-1 pl-4">
            <p>{WARNING_PAST_PERFORMANCE}</p>
            <p>{WARNING_VALUE}</p>
            <p>{WARNING_ESTIMATES}</p>
          </div>

          <Section title="1. Not financial advice">
            <p>{NOT_ADVICE}</p>
            <p>
              Nothing on PensionIQ — fund lists, comparisons, &quot;best&quot; flags, projections,
              the calculator, portfolio estimates or AI Suggestions — is a recommendation to buy,
              sell, switch or hold any pension or fund. It does not take account of your full
              financial circumstances, objectives or attitude to risk.
            </p>
          </Section>

          <Section title="2. Fund data">
            <p>{DATA_SOURCE}</p>
            <p>
              Returns are shown as average yearly figures over 1, 3 and 5 years. Charges are often
              not published in our source; where we assume a typical charge we say so. Your
              provider&apos;s documents and your statements are always the authority.
            </p>
          </Section>

          <Section title="3. Projections, estimates and the calculator">
            <ul>
              <li>Portfolio values between statements are estimates: your statement value moved day by day with market indices that broadly match what each fund invests in (for example global shares or euro bonds), less charges. They are not your fund&apos;s actual unit price and can differ from it, especially for actively managed or multi-asset funds. Index prices are delayed, end-of-day figures from public market data.</li>
              <li>Projections assume each fund keeps growing at its 5-year average (or shorter history), less charges, with contributions unchanged. Real returns will differ, and can be negative.</li>
              <li>&quot;Today&apos;s money&quot; figures assume 2% a year inflation.</li>
              <li>{WARNING_TAX}</li>
            </ul>
          </Section>

          <Section title="4. AI Suggestions">
            <p>
              AI answers are generated automatically and can be wrong, incomplete or out of date.
              Check every fund and figure on its PensionIQ page and with the provider before
              relying on it. Don&apos;t enter personal details in your messages.
            </p>
          </Section>

          <Section title="5. Your account">
            <p>
              You must be 16 or over to create an account. Keep your password safe. You&apos;re
              responsible for the accuracy of what you enter. You can delete your account at any
              time from Settings — see the{" "}
              <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
            </p>
          </Section>

          <Section title="6. Our liability">
            <p>
              PensionIQ is provided free, &quot;as is&quot;. We work to keep it accurate and
              available but don&apos;t guarantee either. To the extent the law allows, we aren&apos;t
              liable for any loss arising from decisions made using it. Nothing here limits any
              right you have as a consumer that can&apos;t be limited by law.
            </p>
          </Section>

          <Section title="7. Law">
            <p>These terms are governed by the laws of Ireland.</p>
          </Section>
        </div>
      </div>
    </>
  );
}
