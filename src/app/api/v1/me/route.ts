import { NextResponse } from "next/server";
import { getAuthState } from "@/features/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Zalążek API mobilnego: tożsamość z sesji ciasteczkowej `@supabase/ssr` (bez Bearer). */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "brak_konfiguracji" }, { status: 503 });
  }
  const auth = await getAuthState();
  if (auth.status !== "authenticated") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ userId: auth.userId, email: auth.email });
}
