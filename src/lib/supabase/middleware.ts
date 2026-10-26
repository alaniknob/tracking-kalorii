import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { allowsIncompleteProfile, isProtectedAppPath } from "@/config/routes";
import { firstIncompleteWizardPath, wizardDraftsFromRow } from "@/features/onboarding/progress";
import { getSupabasePublicConfig } from "./env";
import { hasSupabaseAuthCookie, isAuthRelatedPath } from "./session-cookie";

function redirectWithCookies(url: URL, from: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  for (const cookie of from.cookies.getAll()) response.cookies.set(cookie);
  return response;
}

/** Odświeżenie sesji + bramka: gość nie chodzi po aplikacji; niepełny profil wraca do kreatora. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const config = getSupabasePublicConfig();
  const path = request.nextUrl.pathname;
  const protectedPath = isProtectedAppPath(path);
  const response = NextResponse.next({ request });

  if (!config) {
    if (protectedPath) return NextResponse.redirect(new URL("/", request.url));
    return response;
  }

  const hasCookie = hasSupabaseAuthCookie(request.cookies.getAll());
  let userId: string | null = null;

  if (hasCookie || isAuthRelatedPath(path)) {
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
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;

    if (userId && protectedPath && !allowsIncompleteProfile(path)) {
      const { data: row } = await supabase
        .from("user_drafts")
        .select("profile_json, diet_json, restrictions_json, stores_json, budget_json")
        .eq("user_id", userId)
        .maybeSingle();
      const resume = firstIncompleteWizardPath(wizardDraftsFromRow(row));
      if (resume) return redirectWithCookies(new URL(resume, request.url), response);
    }
  }

  if (protectedPath && !userId) {
    return redirectWithCookies(new URL("/", request.url), response);
  }

  if (userId && (path === "/logowanie" || path === "/rejestracja")) {
    return redirectWithCookies(new URL("/", request.url), response);
  }

  return response;
}
