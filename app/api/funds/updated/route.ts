import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/data/funds.server";

export const dynamic = "force-dynamic";

/** Just "when was fund data last updated", for the footer on every page. */
export async function GET() {
  const { lastScrapeTime, live } = await getCatalog();
  return NextResponse.json(
    { lastScrapeTime, live },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
