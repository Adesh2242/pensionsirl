import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Permanently deletes the authenticated user's Supabase Auth account.
 * Requires SUPABASE_SERVICE_ROLE_KEY — Supabase only allows user deletion
 * via its admin API, which can't be done with the public anon key.
 */
export async function DELETE() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Account deletion isn't configured on the server yet (missing SUPABASE_SERVICE_ROLE_KEY). Contact support to request deletion.",
      },
      { status: 501 },
    );
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
