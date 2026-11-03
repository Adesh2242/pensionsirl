import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageIntro } from "@/components/editorial/page-intro";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PensionIQ collects, uses and protects your data, and your rights under GDPR.",
};

const LAST_UPDATED = "2026-11-03";

const placeholder = "text-warning";

function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-28">
      <h2 className="lower font-heading text-2xl tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        label="privacy"
        lines={["what we hold,", "and why."]}
        tone="slate"
        corners={{ left: `last updated ${LAST_UPDATED}`, right: "gdpr · data stored in ireland" }}
        lead="what pensioniq collects, why, where it's kept, for how long — and how to see, fix, take away or delete it."
      />

      <div className="container-page max-w-3xl px-6 py-14 md:px-10 md:py-20">
        <div className="space-y-10 text-sm leading-relaxed text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          <p className="border-l-2 border-warning py-1 pl-4">
            <strong>Before launch:</strong> the controller&apos;s legal name, address and contact
            email (marked <code className="mx-1">[PLACEHOLDER]</code>) must be filled in, and this
            policy reviewed by a qualified professional.
          </p>

          <Section title="1. In short">
            <ul>
              <li>We collect only what the site needs: your account, the pensions you add, and your cookie choice.</li>
              <li>Your data is stored in the EU (Ireland). We never sell it, and there is no advertising, tracking or analytics.</li>
              <li>You can export it, correct it or delete it yourself at any time from Settings.</li>
              <li>CSV downloads are made on your own device — nothing is sent to us.</li>
            </ul>
          </Section>

          <Section title="2. Who we are">
            <p>
              PensionIQ (&quot;we&quot;, &quot;us&quot;) is the data controller for information
              collected through this site. We are{" "}
              <strong className={placeholder}>[PLACEHOLDER: legal entity name and registered address]</strong>
              . For any privacy question or to exercise your rights, contact{" "}
              <strong className={placeholder}>[PLACEHOLDER: privacy contact email]</strong>.
            </p>
          </Section>

          <Section title="3. What we collect">
            <ul>
              <li>
                <strong>Account:</strong> your name and email address, and a password that our
                database provider stores only as a secure hash. If you sign in with Google, Google
                shares your name and email with us.
              </li>
              <li>
                <strong>Your portfolio:</strong> what you enter for each holding — the fund, an
                optional name, its value and statement date, monthly contributions (yours and your
                employer&apos;s) and any charges — plus when you last viewed your portfolio. This is
                financial information about you, so we treat it with care: only you can read it.
              </li>
              <li>
                <strong>Cookie choice:</strong> kept in your browser, and a copy on our server with
                the time, your account (if signed in) and a salted, one-way hash of your IP address
                — never the IP address itself.
              </li>
              <li>
                <strong>AI Suggestions messages:</strong> when live AI is switched on, the text you
                type is sent to Google to write a reply. We don&apos;t store it.
              </li>
              <li>
                <strong>Technical logs:</strong> our hosting providers record standard request logs
                (such as IP address and browser) to keep the service running and secure.
              </li>
            </ul>
            <p>
              We never ask for your PPS number, bank details, policy or scheme numbers, or payment
              details — please don&apos;t type them into holding names or AI messages.
            </p>
          </Section>

          <Section title="4. Why we use it, and our legal basis">
            <ul>
              <li>Account and portfolio — to provide the service you signed up for (contract, Art. 6(1)(b) GDPR).</li>
              <li>Cookie-choice records — to show we respected your choice (legal obligation and legitimate interest).</li>
              <li>AI Suggestions — to answer the question you chose to ask (your request; contract).</li>
              <li>Technical logs — to keep the site secure and working (legitimate interest).</li>
              <li>Optional analytics — only with your consent. We don&apos;t run any analytics today.</li>
            </ul>
            <p>
              Projections, estimates and charge figures are calculated automatically from what you
              enter. They are illustrations only: no decision with legal or similar effect is made
              about you.
            </p>
          </Section>

          <Section title="5. Where it's kept, and who processes it">
            <p>We do not sell your data or share it for marketing. These processors run the service for us:</p>
            <ul>
              <li>
                <strong>Supabase</strong> — database and sign-in. Your account and portfolio are
                stored in the EU, in Supabase&apos;s Ireland region (eu-west-1).
              </li>
              <li>
                <strong>Netlify</strong> — hosts the website and runs its server code, which may
                process requests outside the EU (including in the United States).
              </li>
              <li>
                <strong>Google (Gemini API)</strong> — only when live AI Suggestions is on, and only
                the message text and our public fund list; never your name, email or account. See{" "}
                <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Google&apos;s Gemini API terms
                </a>
                .
              </li>
            </ul>
            <p>
              Where data leaves the EU we rely on{" "}
              <span className={placeholder}>
                [PLACEHOLDER: confirm the transfer mechanism for each provider — e.g. the EU-US Data
                Privacy Framework or Standard Contractual Clauses in their data processing agreements]
              </span>
              .
            </p>
          </Section>

          <Section title="6. Cookies and browser storage">
            <p>We only use what is strictly necessary — no advertising, cross-site tracking or analytics:</p>
            <ul>
              <li><code>sb-…-auth-token</code> (cookie) — keeps you signed in. Removed when you log out.</li>
              <li><code>pensioniq_cookie_consent</code> (browser storage) — remembers your cookie choice.</li>
              <li>In demo mode only, your demo account and holdings are kept in your browser&apos;s storage and never reach us.</li>
            </ul>
            <p>
              Change or withdraw your choice at any time with <strong>cookie settings</strong> in the
              footer or on the Settings page.
            </p>
          </Section>

          <Section title="7. How long we keep it">
            <ul>
              <li>Account and portfolio — until you delete your account. Deletion is immediate.</li>
              <li>Cookie-choice records — 24 months, then deleted automatically (or straight away when you delete your account).</li>
              <li>AI Suggestions messages — not stored by us.</li>
              <li>CSV and JSON exports — created on your device; we never receive a copy.</li>
              <li>
                Hosting logs and database backups — kept by our providers for their short standard
                periods, then deleted.
              </li>
            </ul>
          </Section>

          <Section title="8. How we protect it">
            <ul>
              <li>Encrypted connections (HTTPS with HSTS) and strict browser security headers.</li>
              <li>Row-level security in the database: each account can only read and change its own holdings.</li>
              <li>Passwords are never stored in plain text; you can also sign in with Google.</li>
              <li>Server keys are kept as secrets in our hosting provider and never sent to browsers.</li>
            </ul>
          </Section>

          <Section id="rights" title="9. Your rights">
            <p>Under GDPR you can, free of charge:</p>
            <ul>
              <li><strong>See and take your data</strong> — Settings → export my data (JSON), or holdings as CSV.</li>
              <li><strong>Correct it</strong> — update any holding on the Portfolio page, or contact us.</li>
              <li><strong>Delete it</strong> — Settings → delete account removes everything immediately.</li>
              <li><strong>Restrict or object</strong> to processing — contact us.</li>
              <li><strong>Withdraw consent</strong> — cookie settings, at any time, as easily as you gave it.</li>
              <li>
                <strong>Complain</strong> to the{" "}
                <a href="https://www.dataprotection.ie" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                  Data Protection Commission
                </a>{" "}
                (Ireland), or the authority where you live.
              </li>
            </ul>
            <p>We answer requests within one month.</p>
          </Section>

          <Section title="10. Children">
            <p>PensionIQ is for adults. Accounts are for people aged 16 or over, and we don&apos;t knowingly collect data from children.</p>
          </Section>

          <Section title="11. Changes">
            <p>
              If this policy changes materially we&apos;ll update the date above. See also our{" "}
              <Link href="/terms" className="underline underline-offset-2">terms &amp; disclaimer</Link>.
            </p>
          </Section>
        </div>
      </div>
    </>
  );
}
