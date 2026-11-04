import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/auth/request";
import { isUuid, parseHoldingInput, removeHolding, updateHolding } from "@/lib/portfolio/repo";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id)) return jsonError("That holding no longer exists.", 404);
  const parsed = parseHoldingInput(await request.json().catch(() => null));
  if ("error" in parsed) return jsonError(parsed.error, 400);
  const holding = await updateHolding(user.id, id, parsed.input);
  if (!holding) return jsonError("That holding no longer exists.", 404);
  return NextResponse.json({ holding }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { user, error } = await requireUser(request);
  if (error) return error;
  const { id } = await params;
  if (!isUuid(id) || !(await removeHolding(user.id, id))) return jsonError("That holding no longer exists.", 404);
  return NextResponse.json({ ok: true });
}
