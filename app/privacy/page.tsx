import type { Metadata } from "next";
import { PageIntro } from "@/components/editorial/page-intro";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PensionIQ collects, uses, and protects your data.",
};

const LAST_UPDATED = "2026-08-19";

const placeholder = "text-warning";

export default function PrivacyPage() {
  return (
    <>
      <PageIntro
        label="privacy"
        lines={["what we hold,", "and why."]}
        tone="slate"
        corners={{ left: `last updated ${LAST_UPDATED}`, right: "gdpr" }}
        lead="how pensioniq collects, uses and protects your data."
      />

      <div className="container-page max-w-3xl px-6 py-14 md:px-10 md:py-20">
      <div className="prose prose-sm max-w-none space-y-8 text-sm leading-relaxed text-foreground [&_h2]:scroll-mt-24">
        <section>
          <p className="border-l-2 border-warning py-1 pl-4 text-foreground">
            <strong>Draft notice:</strong> this policy contains placeholder text (marked
            <code className="mx-1">[PLACEHOLDER]</code>) that must be filled in with real
            company and contact details, and reviewed by a qualified professional, before
            this app processes real user data in production.
          </p>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">1. Who we are</h2>
          <p>
            PensionIQ (&quot;we&quot;, &quot;us&quot;) is the data controller for
            information collected through this site. We are{" "}
            <strong className={placeholder}>
              [PLACEHOLDER: legal entity name and registered address]
            </strong>
            . For any privacy question or to exercise your rights, contact{" "}
            <strong className={placeholder}>[PLACEHOLDER: privacy contact email]</strong>.
          </p>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">2. What we collect</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account data:</strong> name and email address, when you sign up
              (Settings → Your data can export or delete this).
            </li>
            <li>
              <strong>Cookie preferences:</strong> your Accept/Reject/Manage choice,
              stored in your browser (see Cookies, below).
            </li>
            <li>
              <strong>AI Suggestions messages:</strong> the free-text messages you send on
              the AI Suggestions page, sent to our AI provider to generate a reply (see
              §4).
            </li>
          </ul>
          <p className="mt-2">
            We do not collect payment information, government ID numbers, or precise
            location data. We do not run advertising or tracking pixels.
          </p>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">3. Why we process it, and our legal basis</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Account data — to provide the service you sign up for (contract).</li>
            <li>
              Analytics cookies — only if you consent via the cookie banner (consent).
            </li>
            <li>
              AI Suggestions messages — to generate a response to your question
              (consent, given by choosing to use that feature).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">4. Who we share data with</h2>
          <p>
            We use the following processors to run PensionIQ. We do not sell your data.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Supabase</strong> (database, authentication) —{" "}
              <span className={placeholder}>
                [PLACEHOLDER: confirm hosting region shown in your Supabase project
                settings; Supabase offers EU-region hosting but this must be verified for
                your specific project]
              </span>
              .
            </li>
            <li>
              <strong>Google (Gemini API)</strong> — when you use AI Suggestions, the
              message you type is sent to Google&apos;s Gemini API to generate a reply.
              This is a transfer of data to the United States. We do not send your name,
              email, or account identifier as part of this request — only the message
              text itself and our fund catalog (see{" "}
              <code>app/api/ai/suggest/route.ts</code>). Review{" "}
              <a
                href="https://ai.google.dev/gemini-api/terms"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                Google&apos;s Gemini API terms
              </a>{" "}
              for how Google handles this data.{" "}
              <span className={placeholder}>
                [PLACEHOLDER: confirm and document the legal transfer mechanism you rely
                on, e.g. EU-US Data Privacy Framework or Standard Contractual Clauses]
              </span>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">5. Cookies</h2>
          <p>
            We use strictly necessary cookies to run the site (e.g. keeping you logged
            in) and, only with your consent, optional analytics cookies. You can change
            your choice at any time via the cookie banner (Reject / Manage / Accept All).
            We do not use advertising or cross-site tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">6. Your rights</h2>
          <p>Under GDPR, you have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Access the data we hold about you (Settings → Export my data)</li>
            <li>Correct inaccurate data</li>
            <li>Erase your account and data (Settings → Delete account)</li>
            <li>Object to or restrict certain processing</li>
            <li>Data portability (your exported data is provided as machine-readable JSON)</li>
            <li>
              Lodge a complaint with your supervisory authority —{" "}
              <span className={placeholder}>
                [PLACEHOLDER: for Ireland, this is the{" "}
                <a
                  href="https://www.dataprotection.ie"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Data Protection Commission
                </a>
                ]
              </span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">7. Data retention</h2>
          <p>
            <span className={placeholder}>
              [PLACEHOLDER: define how long account data, and AI Suggestions logs (if any
              are retained server-side), are kept, and the criteria used to determine that
              period.]
            </span>
          </p>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">8. Children</h2>
          <p>
            PensionIQ is intended for adults planning retirement and is not directed at
            children. We do not knowingly collect data from anyone under 16.
          </p>
        </section>

        <section>
          <h2 className="lower font-heading text-2xl tracking-tight">9. Changes to this policy</h2>
          <p>
            We&apos;ll update the &quot;Last updated&quot; date above if this policy
            changes materially.
          </p>
        </section>
      </div>
      </div>
    </>
  );
}
