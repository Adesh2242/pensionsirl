import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "AI Suggestions",
  description: "Get AI-powered Irish pension fund suggestions based on your risk profile.",
};

export default function AiSuggestionsPage() {
  return (
    <>
      <PageHeader
        eyebrow={<span>Powered by Google Gemini</span>}
        title="AI fund suggestions"
        description="Tell us about your risk appetite, goals, or preferences (e.g. ESG, low fees) and we'll suggest funds from our catalog worth researching further."
      />

      <div className="container-page py-10">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 flex items-start gap-2.5 rounded-xl border border-dashed bg-card/60 p-4 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <span>
              Messages you send here are processed by Google&apos;s Gemini AI to generate a
              reply — please don&apos;t include personal or financial account details. See our{" "}
              <Link
                href="/privacy"
                className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </p>
          <ChatInterface />
        </div>
      </div>
    </>
  );
}
