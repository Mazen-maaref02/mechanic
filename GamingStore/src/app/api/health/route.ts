import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Liveness/readiness check used by e2e bootstrapping and monitoring. */
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("store_settings").select("key").limit(1);
    if (error) {
      return NextResponse.json({ status: "degraded", db: error.message }, { status: 503 });
    }
    return NextResponse.json({ status: "ok", db: "ok" });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", error: err instanceof Error ? err.message : "unknown" },
      { status: 503 },
    );
  }
}
