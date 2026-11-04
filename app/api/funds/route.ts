import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/data/funds.server";

export const dynamic = "force-dynamic";

/** The fund catalogue for client components (funds list, compare, portfolio). */
export async function GET() {
  const { funds, providers, lastScrapeTime, live } = await getCatalog();
  return NextResponse.json(
    { funds, providers, lastScrapeTime, live },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
