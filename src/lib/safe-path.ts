/** Ścieżka wewnętrzna do przekierowania po Auth — bez open redirect. */
export function isSafeInternalPath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("://") || value.includes("\\")) return false;
  return true;
}
