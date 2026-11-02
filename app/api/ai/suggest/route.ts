import { NextResponse } from "next/server";
import { getAllFunds } from "@/lib/data/funds.server";
import { checkRateLimit } from "@/lib/rate-limit";
import { returnFor } from "@/lib/fund-returns";
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

function pct(value: number | null) {
  return value === null ? "n/a" : `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function describeAmc(fund: Fund) {
  return fund.amc === undefined ? "AMC not published" : `AMC ${fund.amc.toFixed(2)}%`;
}

/** The longest-run average yearly return a fund has: 5-year, else 3-year, else 1-year. */
function longRunReturn(fund: Fund): { pct: number; years: 5 | 3 | 1 } | null {
  const five = returnFor(fund, "5y");
  if (five !== null) return { pct: five, years: 5 };
  const three = returnFor(fund, "3y");
  if (three !== null) return { pct: three, years: 3 };
  const one = returnFor(fund, "1y");
  return one === null ? null : { pct: one, years: 1 };
}

function buildSystemPrompt(funds: Fund[]) {
  const catalog = funds
    .map(
      (f) =>
        `${f.providerName} — ${f.name} (${f.assetClass}, risk ${f.riskRating}/7, ${describeAmc(f)}, avg yearly return: 1y ${pct(returnFor(f, "1y"))}, 3y ${pct(returnFor(f, "3y"))}, 5y ${pct(returnFor(f, "5y"))})`,
    )
    .join("\n");
  const noCharges = funds.every((f) => f.amc === undefined);

  return `You are the PensionIQ AI assistant, helping users in Ireland understand pension funds and retirement planning. Only discuss Irish pensions, PRSAs, tax relief, and the fund catalog below. Keep your entire reply under 120 words and at most 3 bullet points — this is a strict limit, not a suggestion. Reference specific funds by name and provider when relevant, and quote their returns from the catalog when you recommend them. Returns are average yearly percentages; prefer the 5-year figure for "best return" questions. Never invent a figure that isn't in the catalog.${
    noCharges
      ? " The data source does not publish charges (AMC) for these funds: if asked to filter by charge, say plainly that charges aren't available here, answer the rest of the question, and suggest checking the AMC on the provider's fund factsheet or the user's statement."
      : ""
  } and end with a one-line disclaimer that this is not regulated financial advice. Output plain text only — no markdown (no **bold**, no #headings, no [links]); use a leading "-" for bullet points.

Fund catalog:
${catalog}`;
}

function keywordMatch(message: string, words: string[]) {
  const lower = message.toLowerCase();
  return words.some((w) => lower.includes(w));
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };

/** "give 2 funds" / "top three" → 2 / 3; defaults to 3, capped at 5. */
function requestedCount(message: string) {
  const match = message.toLowerCase().match(/\b(\d|one|two|three|four|five)\b\s*(?:\w+\s+)?(?:funds?|options?|picks?)/);
  if (!match) return 3;
  const n = NUMBER_WORDS[match[1]] ?? Number(match[1]);
  return Math.min(Math.max(n, 1), 5);
}

/** "amc under 0,5%" / "charge below 1%" → 0.5 / 1. */
function maxAmc(message: string): number | null {
  const match = message
    .toLowerCase()
    .match(/(?:amc|charge|fee)s?\s*(?:of\s*)?(?:under|below|less than|<|<=|max(?:imum)?|up to)\s*(\d+(?:[.,]\d+)?)/);
  return match ? Number(match[1].replace(",", ".")) : null;
}

/**
 * The built-in answer used when no AI key is configured (or Gemini fails):
 * reads risk, ESG, "best return", a charge limit and how many funds were
 * asked for, and answers from the catalog.
 */
function mockSuggestion(message: string, funds: Fund[], reason: "no-key" | "unavailable") {
  let riskBand: [number, number] | null = null;
  if (keywordMatch(message, ["cautious", "low risk", "safe", "conservative", "cash"])) {
    riskBand = [1, 3];
  } else if (keywordMatch(message, ["aggressive", "high risk", "growth", "adventurous"])) {
    riskBand = [5, 7];
  } else if (keywordMatch(message, ["balanced", "medium risk", "moderate"])) {
    riskBand = [3, 5];
  }
  const esgOnly = keywordMatch(message, ["esg", "ethical", "sustainable", "climate"]);
  const wantsReturn = keywordMatch(message, ["return", "best", "top", "perform", "highest"]);
  const amcLimit = maxAmc(message);
  const count = requestedCount(message);
  const notes: string[] = [];

  let candidates = funds.filter(
    (f) =>
      (!riskBand || (f.riskRating >= riskBand[0] && f.riskRating <= riskBand[1])) &&
      (!esgOnly || f.sfdrArticle === 8 || f.sfdrArticle === 9),
  );
  if (amcLimit !== null) {
    const withAmc = candidates.filter((f) => f.amc !== undefined);
    if (withAmc.length === 0) {
      notes.push(
        `Charges (AMC) aren't published for these funds, so they couldn't be filtered to under ${amcLimit}% — check the AMC on the provider's factsheet or your statement.`,
      );
    } else {
      candidates = withAmc.filter((f) => (f.amc ?? Infinity) <= amcLimit);
    }
  }
  if (candidates.length === 0) {
    notes.push("Nothing matched every filter, so these are the closest from the whole catalog.");
    candidates = funds;
  }

  const ranked = candidates.slice().sort((a, b) => {
    if (wantsReturn || amcLimit === null) {
      return (longRunReturn(b)?.pct ?? -Infinity) - (longRunReturn(a)?.pct ?? -Infinity);
    }
    return (a.amc ?? Infinity) - (b.amc ?? Infinity);
  });
  const picks = ranked.slice(0, count);

  const lines = picks.map((f) => {
    const r = longRunReturn(f);
    const ret = r ? `${pct(r.pct)} a year over ${r.years} year${r.years > 1 ? "s" : ""}` : "no return history yet";
    return `• ${f.name} (${f.providerName}) — ${ret}, ${f.assetClass}, risk ${f.riskRating}/7, ${describeAmc(f)}`;
  });

  const intro = wantsReturn
    ? `The ${picks.length === 1 ? "fund" : `${picks.length} funds`} with the highest average yearly return that match:`
    : "Based on what you've described, here are a few funds worth researching further:";

  return [
    intro,
    "",
    ...lines,
    "",
    ...(notes.length ? [...notes, ""] : []),
    "Past returns don't guarantee future ones, and higher returns usually come with higher risk.",
    reason === "no-key"
      ? "This answer comes from PensionIQ's built-in search, not live AI — not regulated financial advice."
      : "Live AI couldn't be reached, so this answer comes from PensionIQ's built-in search — not regulated financial advice.",
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
    return NextResponse.json({ reply: mockSuggestion(message, funds, "no-key"), source: "mock" });
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
    return NextResponse.json({
      reply: mockSuggestion(message, funds, "unavailable"),
      source: "fallback",
    });
  }
}
