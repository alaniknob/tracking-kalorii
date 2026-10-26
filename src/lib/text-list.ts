/** Normalizacja nazw do porównań (wielkość liter, spacje, Unicode NFC). */
export function normalizeLabel(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl-PL");
}

/** Lista z pola tekstowego: elementy rozdzielone przecinkiem, średnikiem lub nową linią, bez duplikatów. */
export function parseTextList(value: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const raw of value.split(/[,;\n]/)) {
    const item = raw.normalize("NFC").trim().replace(/\s+/g, " ");
    const key = normalizeLabel(item);
    if (item === "" || seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}
