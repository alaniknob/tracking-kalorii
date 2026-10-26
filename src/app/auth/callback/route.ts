import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/panel";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/panel";
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/logowanie", origin));
  }
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createServerSupabase();
    if (supabase) await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL(safeNext, origin));
}
