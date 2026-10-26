import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { isSafeInternalPath } from "@/lib/safe-path";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const nextRaw = searchParams.get("next") ?? "/panel";
  const safeNext = isSafeInternalPath(nextRaw) ? nextRaw : "/panel";
  const login = new URL("/logowanie", origin);

  if (!isSupabaseConfigured() || searchParams.get("error")) {
    return NextResponse.redirect(login);
  }

  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(login);

  const supabase = await createServerSupabase();
  if (!supabase) return NextResponse.redirect(login);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(login);

  return NextResponse.redirect(new URL(safeNext, origin));
}
