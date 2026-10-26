export interface CsvRow {
  /** Numer linii w pliku (od 1), do raportu błędów. */
  line: number;
  cells: string[];
}

export type CsvParseResult =
  | { ok: true; delimiter: string; header: string[]; rows: CsvRow[] }
  | { ok: false; error: "empty" | "unterminated_quote"; line?: number };

const DELIMITERS = [";", ",", "\t"] as const;

/** Separator z nagłówka: polski Excel zapisuje CSV ze średnikiem, inne programy z przecinkiem. */
function detectDelimiter(firstLine: string): string {
  let best: string = ";";
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = firstLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Parser CSV (RFC 4180): pola w cudzysłowach, podwójny cudzysłów jako znak, nowe linie
 * w cudzysłowach, CRLF/LF, BOM. Puste linie są pomijane.
 */
export function parseCsv(input: string): CsvParseResult {
  const text = input.replace(/^\uFEFF/, "");
  if (text.trim() === "") return { ok: false, error: "empty" };
  const delimiter = detectDelimiter(text.slice(0, text.search(/\r?\n|$/)));

  const records: CsvRow[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let recordLine = 1;
  let quoteStartLine = 1;

  const endRecord = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) records.push({ line: recordLine, cells: cells.map((c) => c.trim()) });
    cells = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.trim() === "") {
      cell = "";
      inQuotes = true;
      quoteStartLine = line;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      endRecord();
      line++;
      recordLine = line;
    } else {
      cell += ch;
    }
  }
  if (inQuotes) return { ok: false, error: "unterminated_quote", line: quoteStartLine };
  endRecord();

  if (records.length === 0) return { ok: false, error: "empty" };
  const [header, ...rows] = records;
  return { ok: true, delimiter, header: header.cells.map((h) => h.toLocaleLowerCase("pl-PL")), rows };
}
