import Link from "next/link";
import { ChatInterface } from "@/components/ai/chat-interface";
import { PageIntro } from "@/components/editorial/page-intro";

export const metadata = {
  title: "AI Suggestions",
  description: "Get AI-powered Irish pension fund suggestions based on your risk profile.",
};

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
        </div>
      </section>
    </>
  );
}
