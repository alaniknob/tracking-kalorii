import { NextResponse } from "next/server";
import { listHistoryAction } from "@/features/meal-planning/history";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "brak_konfiguracji" }, { status: 503 });
  }
  const result = await listHistoryAction();
  if (result.status === "anonymous") return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (result.status !== "ready") return NextResponse.json({ error: "brak_konfiguracji" }, { status: 503 });
  return NextResponse.json({ plans: result.plans });
}
