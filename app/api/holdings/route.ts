import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth/request";
import { addHolding, listHoldings, parseHoldingInput } from "@/lib/portfolio/repo";

export const dynamic = "force-dynamic";
const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  return NextResponse.json({ holdings: await listHoldings(user.id) }, noStore);
}

export async function POST(request: Request) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const parsed = parseHoldingInput(await request.json().catch(() => null));
  if ("error" in parsed) return jsonError(parsed.error, 400);
  try {
    return NextResponse.json({ holding: await addHolding(user.id, parsed.input) }, { status: 201, ...noStore });
  } catch (e) {
    // 23503: the fund isn't in the catalogue.
    if ((e as { code?: string }).code === "23503") return jsonError("That fund isn't in the catalogue.", 400);
    throw e;
  }
}
