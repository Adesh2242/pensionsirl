import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { ChatInterface } from "@/components/ai/chat-interface";
import { PageIntro } from "@/components/editorial/page-intro";
import { Disclaimer } from "@/components/legal/disclaimer";

export const metadata = pageMetadata({
  title: "AI Pension Fund Suggestions",
  description:
    "Describe what you want from a pension fund and get Irish pension funds that match, with their returns, charges and risk ratings.",
  path: "/ai-suggestions",
});

export default function AiSuggestionsPage() {
  return (
    <>
      <PageIntro
        label="ai suggestions"
        lines={["describe the fund", "you are after."]}
        corners={{ left: "powered by google gemini", right: "a starting point, not advice" }}
        lead="tell us about your risk appetite, goals or preferences — esg, low fees, long horizon — and we'll point at funds in the catalog worth researching."
      />

      <section className="px-6 py-14 md:px-10 md:py-20">
        <div className="container-page max-w-3xl px-0 md:px-0">
          <p className="lower mb-10 font-mono text-xs leading-relaxed text-muted-foreground">
            messages you send here are processed by google&apos;s gemini ai to generate a reply —
            please don&apos;t include personal or financial account details. see our{" "}
            <Link href="/privacy" className="link-underline text-foreground">
              privacy policy
            </Link>
            .
          </p>
          <ChatInterface />
          <Disclaimer kind="ai" className="mt-12" />
        </div>
      </section>
    </>
  );
}
