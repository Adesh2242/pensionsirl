"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTERS = [
  "I'm 32, cautious, and want low-fee funds",
  "Suggest high-growth funds for someone 20 years from retirement",
  "What ESG pension funds are available?",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"mock" | "gemini" | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col gap-4">
      {source === "mock" && (
        <Badge variant="outline" className="w-fit">
          Demo mode — set GEMINI_API_KEY for live AI responses
        </Badge>
      )}

      <Card>
        <CardContent className="flex min-h-[320px] flex-col gap-4 pt-6">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted-foreground">
              <Sparkles className="h-8 w-8 text-primary" />
              <p>Describe your risk appetite and goals to get fund suggestions.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted"
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="self-start rounded-lg bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  Thinking…
                </div>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. I'm 40 and want a balanced, low-fee fund…"
          rows={2}
          maxLength={1000}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <Button type="submit" disabled={loading || !input.trim()} className="self-end">
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Not regulated financial advice. Always speak to a qualified advisor before making
        pension decisions.
      </p>
    </div>
  );
}
