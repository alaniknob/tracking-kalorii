/** Czy w żądaniu jest ciasteczko sesji Supabase — bez tego nie wołamy Auth (gość nie czeka na sieć). */
export function hasSupabaseAuthCookie(cookies: Iterable<{ name: string }>): boolean {
  for (const cookie of cookies) {
    const name = cookie.name;
    if (name.includes("-auth-token")) return true;
    if (name.startsWith("sb-") && name.includes("auth")) return true;
  }
  return false;
}

const AUTH_PATH_PREFIXES = ["/logowanie", "/rejestracja", "/auth", "/profil", "/historia", "/api"];

export function isAuthRelatedPath(pathname: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
