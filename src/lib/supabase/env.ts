/**
 * Publiczna konfiguracja Supabase. Brak zmiennych = aplikacja NIE udaje kont
 * (ekran „brak konfiguracji”). Klucz publishable (`sb_publishable_…`) jest
 * akceptowany jako NEXT_PUBLIC_SUPABASE_ANON_KEY — to ten sam slot co dawny klucz anon JWT.
 */

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export function isSupabaseUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Anon / publishable: nowy format `sb_publishable_…` albo klasyczny JWT (`eyJ…`).
 * Odrzucamy puste i ewidentnie niepełne wartości — bez zgadywania.
 */
export function isSupabaseAnonKey(value: string): boolean {
  const key = value.trim();
  if (key.length < 20) return false;
  if (key.startsWith("sb_publishable_")) return /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  return key.startsWith("eyJ");
}

export function readSupabasePublicConfig(
  env: NodeJS.Dict<string> = process.env,
): { status: "missing" } | { status: "invalid" } | { status: "ok"; config: SupabasePublicConfig } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  if (url === "" && anonKey === "") return { status: "missing" };
  if (!isSupabaseUrl(url) || !isSupabaseAnonKey(anonKey)) return { status: "invalid" };
  return { status: "ok", config: { url, anonKey } };
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const result = readSupabasePublicConfig();
  return result.status === "ok" ? result.config : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

/** Klucz service_role — wyłącznie serwer. Potrzebny tylko gdy RPC delete_own_account nie wystarczy. */
export function getServiceRoleKey(env: NodeJS.Dict<string> = process.env): string | null {
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (key === "" || key.startsWith("NEXT_PUBLIC_")) return null;
  return key;
}
