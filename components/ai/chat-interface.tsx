"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "i'm 32, cautious, and want low-fee funds",
  "suggest high-growth funds for someone 20 years from retirement",
  "what esg pension funds are available?",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"mock" | "gemini" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Keep the newest reply in view as the conversation grows.
  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setSource(data.source ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {source === "mock" && (
        <p className="lower mb-6 font-mono text-xs text-muted-foreground">
          demo mode — set GEMINI_API_KEY for live ai responses
        </p>
      )}

      <div className="min-h-[24rem] border-t border-border py-10">
        {messages.length === 0 ? (
          <div>
            <p className="lower font-heading text-2xl tracking-tight md:text-3xl">
              what are you looking for?
            </p>
            <p className="lower mt-3 max-w-md text-sm text-muted-foreground">
              describe your risk appetite and goals, and we&apos;ll point at funds in the catalog
              worth researching.
            </p>
            <ul className="mt-10 border-t border-border">
              {STARTERS.map((starter, i) => (
                <li key={starter}>
                  <button
                    onClick={() => send(starter)}
                    className="row-link group flex w-full items-center justify-between gap-6 border-b border-border py-5 text-left"
                  >
                    <span className="lower flex items-center gap-4">
                      <span className="tabular font-mono text-xs text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base">{starter}</span>
                    </span>
                    <span
                      className="shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden
                    >
                      ↗
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {messages.map((message, i) => (
              <div key={i} className="border-b border-border pb-8 last:border-b-0 last:pb-0">
                <p className="lower mb-3 font-mono text-xs text-primary">
                  {message.role === "user" ? "you" : "pensioniq"}
                </p>
                <p
                  className={`whitespace-pre-wrap leading-relaxed ${
                    message.role === "user"
                      ? "lower font-heading text-xl tracking-tight md:text-2xl"
                      : "text-sm text-muted-foreground md:text-base"
                  }`}
                >
                  {message.content}
                </p>
              </div>
            ))}
            {loading && (
              <div>
                <p className="lower mb-3 font-mono text-xs text-primary">pensioniq</p>
                <span className="lower font-mono text-sm text-muted-foreground">thinking…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}

        {error && <p className="lower mt-6 font-mono text-xs text-destructive">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-end gap-4 border-t border-border pt-6"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. i'm 40 and want a balanced, low-fee fund…"
          rows={2}
          maxLength={1000}
          className="lower min-h-[3.5rem] resize-none rounded-none border-0 border-b border-transparent bg-transparent px-0 text-base shadow-none placeholder:text-muted-foreground/60 focus-visible:border-primary focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="lower pill inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm transition-colors hover:text-primary disabled:opacity-40"
        >
          send <span aria-hidden>↗</span>
        </button>
      </form>

      <p className="lower mt-5 font-mono text-xs leading-relaxed text-muted-foreground">
        enter to send, shift + enter for a new line. not regulated financial advice — always speak
        to a qualified advisor before making pension decisions.
      </p>
    </div>
  );
}
