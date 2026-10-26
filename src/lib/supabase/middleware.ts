import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "./env";

/** Odświeżenie ciasteczek sesji. Bez konfiguracji — przepuszczamy żądanie bez udawania auth. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const config = getSupabasePublicConfig();
  const response = NextResponse.next({ request });
  if (!config) return response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}
