import { NextResponse } from "next/server";
import { funds } from "@/lib/mock-data";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.0-flash";
const MAX_MESSAGE_LENGTH = 1000;

// Simple in-memory rate limit: 20 requests / hour per client IP. Resets on
// server restart — fine as a first line of defence, not a substitute for a
// real limiter (e.g. Vercel's or Upstash) in production. See TODO.md.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const requestLog = new Map<string, number[]>();

function isRateLimited(key: string) {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  requestLog.set(key, timestamps);
  return timestamps.length > RATE_LIMIT;
}

const FUND_CATALOG_SUMMARY = funds
  .map(
    (f) =>
      `${f.providerName} — ${f.name} (${f.assetClass}, risk ${f.riskRating}/7, AMC ${f.amc.toFixed(2)}%)`,
  )
  .join("\n");

const SYSTEM_PROMPT = `You are the PensionIQ AI assistant, helping users in Ireland understand pension funds and retirement planning. Only discuss Irish pensions, PRSAs, tax relief, and the fund catalog below. Be concise (under 200 words), reference specific funds by name and provider when relevant, and always include a brief disclaimer that this is not regulated financial advice.

Fund catalog:
${FUND_CATALOG_SUMMARY}`;

function keywordMatch(message: string, words: string[]) {
  const lower = message.toLowerCase();
  return words.some((w) => lower.includes(w));
}

function mockSuggestion(message: string) {
  let riskBand: [number, number] = [3, 5];
  if (keywordMatch(message, ["cautious", "low risk", "safe", "conservative", "cash"])) {
    riskBand = [1, 2];
  } else if (keywordMatch(message, ["aggressive", "high risk", "growth", "adventurous"])) {
    riskBand = [6, 7];
  }
  const esgOnly = keywordMatch(message, ["esg", "ethical", "sustainable", "climate"]);

  const candidates = funds.filter(
    (f) =>
      f.riskRating >= riskBand[0] &&
      f.riskRating <= riskBand[1] &&
      (!esgOnly || f.sfdrArticle === 8 || f.sfdrArticle === 9),
  );
  const picks = (candidates.length ? candidates : funds)
    .slice()
    .sort((a, b) => a.amc - b.amc)
    .slice(0, 3);

  const lines = picks.map(
    (f) =>
      `• ${f.name} (${f.providerName}) — ${f.assetClass}, risk ${f.riskRating}/7, ${f.amc.toFixed(2)}% AMC`,
  );

  return [
    `Based on what you've described, here are a few funds worth researching further:`,
    "",
    ...lines,
    "",
    "This is a templated demo response (no live AI key configured) — not regulated financial advice. Speak to a qualified financial advisor before making decisions.",
  ].join("\n");
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  let body: { message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = (body.message ?? "").toString().trim().slice(0, MAX_MESSAGE_LENGTH);
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: mockSuggestion(message), source: "mock" });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 512, temperature: 0.6 },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const reply: string | undefined =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");

    if (!reply) {
      throw new Error("Empty response from Gemini");
    }

    return NextResponse.json({ reply, source: "gemini" });
  } catch (error) {
    console.error("AI suggest route falling back to mock:", error);
    return NextResponse.json({ reply: mockSuggestion(message), source: "mock" });
  }
}
