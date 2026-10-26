import type { AllergenCode, AllergenExclusion } from "./eu-allergens";

export type AllergenDeclaration = "contains" | "may_contain";

/** Dane o alergenach produktu lub przepisu (z katalogu — etap 3). */
export interface AllergenInfo {
  /** Czy znany jest pełny skład. Bez składu nie da się potwierdzić braku alergenu. */
  ingredientsKnown: boolean;
  /** Zadeklarowane alergeny. Brak wpisu oznacza BRAK WIEDZY, nie brak alergenu. */
  declared: Partial<Record<AllergenCode, AllergenDeclaration>>;
}

export type AllergenAssessment =
  | { status: "excluded"; matches: { code: AllergenCode; declaration: AllergenDeclaration }[] }
  | { status: "needs_verification"; reasons: ("missing_ingredients" | "traces_declared")[] }
  /** Brak zadeklarowanego konfliktu — świadomie NIE nazywamy tego „bezpieczny”. */
  | { status: "no_declared_conflict" };

/**
 * Ocena produktu względem wykluczeń użytkownika. Zasady:
 * - „zawiera” wykluczony alergen → wykluczony,
 * - „może zawierać” przy alergii z wykluczaniem śladów → wykluczony; w pozostałych przypadkach → wymaga weryfikacji,
 * - nieznany skład przy jakimkolwiek wykluczeniu alergenu → wymaga weryfikacji.
 */
export function assessAllergens(info: AllergenInfo, exclusions: AllergenExclusion[]): AllergenAssessment {
  if (exclusions.length === 0) return { status: "no_declared_conflict" };

  const matches: { code: AllergenCode; declaration: AllergenDeclaration }[] = [];
  let tracesDeclared = false;

  for (const exclusion of exclusions) {
    const declaration = info.declared[exclusion.code];
    if (declaration === "contains") {
      matches.push({ code: exclusion.code, declaration });
    } else if (declaration === "may_contain") {
      if (exclusion.kind === "allergy" && exclusion.excludeTraces) matches.push({ code: exclusion.code, declaration });
      else tracesDeclared = true;
    }
  }

  if (matches.length > 0) return { status: "excluded", matches };

  const reasons: ("missing_ingredients" | "traces_declared")[] = [];
  if (!info.ingredientsKnown) reasons.push("missing_ingredients");
  if (tracesDeclared) reasons.push("traces_declared");
  return reasons.length > 0 ? { status: "needs_verification", reasons } : { status: "no_declared_conflict" };
}
