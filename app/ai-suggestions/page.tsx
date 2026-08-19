import Link from "next/link";
import { ChatInterface } from "@/components/ai/chat-interface";

export const metadata = {
  title: "AI Suggestions",
  description: "Get AI-powered Irish pension fund suggestions based on your risk profile.",
};

export default function AiSuggestionsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">AI fund suggestions</h1>
      <p className="mt-2 text-muted-foreground">
        Tell us about your risk appetite, goals, or preferences (e.g. ESG, low fees) and
        we&apos;ll suggest funds from our catalog worth researching further.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Messages you send here are processed by Google&apos;s Gemini AI to generate a
        reply — please don&apos;t include personal or financial account details. See our{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
      <div className="mt-8">
        <ChatInterface />
      </div>
    </div>
  );
}
