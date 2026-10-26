import { cookies } from "next/headers";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { hasSupabaseAuthCookie } from "@/lib/supabase/session-cookie";

export type AuthState =
  | { status: "not_configured" }
  | { status: "anonymous" }
  | { status: "authenticated"; userId: string; email: string | null };

export async function getAuthState(): Promise<AuthState> {
  if (!isSupabaseConfigured()) return { status: "not_configured" };
  const cookieStore = await cookies();
  if (!hasSupabaseAuthCookie(cookieStore.getAll())) return { status: "anonymous" };
  const supabase = await createServerSupabase();
  if (!supabase) return { status: "not_configured" };
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };
  return { status: "authenticated", userId: data.user.id, email: data.user.email ?? null };
}
