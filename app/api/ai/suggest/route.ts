import { NextResponse } from "next/server";
import { getAllFunds } from "@/lib/data/funds.server";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatAmc } from "@/lib/utils";
import type { Fund } from "@/lib/types";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_MESSAGE_LENGTH = 1000;

// 20 requests / hour per client IP. Durable (Upstash Redis) when
// UPSTASH_REDIS_REST_URL/_TOKEN are set, else an in-memory fallback that
// resets on restart and doesn't share state across instances. See TODO.md.
const RATE_LIMIT = 20;
const RATE_WINDOW_SECONDS = 60 * 60;

// Fund catalog changes at most once a day (scraper run), so it's cached
// in-memory rather than re-queried on every chat message.
const CATALOG_TTL_MS = 5 * 60 * 1000;
let catalogCache: { funds: Fund[]; expiresAt: number } | null = null;

async function getCachedFunds(): Promise<Fund[]> {
  if (catalogCache && catalogCache.expiresAt > Date.now()) {
    return catalogCache.funds;
  }
  const funds = await getAllFunds();
  catalogCache = { funds, expiresAt: Date.now() + CATALOG_TTL_MS };
  return funds;
}

function buildSystemPrompt(funds: Fund[]) {
  const catalog = funds
    .map((f) => `${f.providerName} — ${f.name} (${f.assetClass}, risk ${f.riskRating}/7, AMC ${formatAmc(f.amc)})`)
    .join("\n");

  return `You are the PensionIQ AI assistant, helping users in Ireland understand pension funds and retirement planning. Only discuss Irish pensions, PRSAs, tax relief, and the fund catalog below. Keep your entire reply under 120 words and at most 3 bullet points — this is a strict limit, not a suggestion. Reference specific funds by name and provider when relevant, and end with a one-line disclaimer that this is not regulated financial advice. Output plain text only — no markdown (no **bold**, no #headings, no [links]); use a leading "-" for bullet points.

Fund catalog:
${catalog}`;
}

function keywordMatch(message: string, words: string[]) {
  const lower = message.toLowerCase();
  return words.some((w) => lower.includes(w));
}

function mockSuggestion(message: string, funds: Fund[]) {
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
    .sort((a, b) => (a.amc ?? Infinity) - (b.amc ?? Infinity))
    .slice(0, 3);

  const lines = picks.map(
    (f) => `• ${f.name} (${f.providerName}) — ${f.assetClass}, risk ${f.riskRating}/7, ${formatAmc(f.amc)} AMC`,
  );

  return [
    `Based on what you've described, here are a few funds worth researching further:`,
    "",
    ...lines,
    "",
    "This is a templated demo response (no live AI key configured) — not regulated financial advice. Speak to a qualified financial advisor before making decisions.",
  ].join("\n");
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin requests may omit Origin (e.g. curl, some browsers)
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = await checkRateLimit(`ai-suggest:${ip}`, RATE_LIMIT, RATE_WINDOW_SECONDS);
  if (!success) {
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

  const funds = await getCachedFunds();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: mockSuggestion(message, funds), source: "mock" });
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildSystemPrompt(funds) }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: {
            maxOutputTokens: 1600,
            temperature: 0.6,
            thinkingConfig: { thinkingBudget: 128 },
          },
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
    return NextResponse.json({ reply: mockSuggestion(message, funds), source: "mock" });
  }
}
