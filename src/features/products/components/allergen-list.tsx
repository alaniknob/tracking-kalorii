import { Badge } from "@/components/ui/badge";
import { EU_ALLERGENS, type AllergenInfo } from "@/features/allergens";
import { getMessages } from "@/i18n";

/** Zadeklarowane alergeny. Nigdy nie komunikuje „bez alergenów” przy nieznanym składzie. */
export function AllergenList({ info }: { info: AllergenInfo }) {
  const t = getMessages();
  const declared = EU_ALLERGENS.filter((code) => info.declared[code]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {declared.map((code) => (
        <Badge key={code} tone={info.declared[code] === "contains" ? "warning" : "neutral"}>
          {t.preferences.allergens[code]} · {info.declared[code] === "contains" ? t.catalog.contains : t.catalog.mayContain}
        </Badge>
      ))}
      {declared.length === 0 ? (
        <span className="text-sm text-muted">
          {info.ingredientsKnown ? t.catalog.noDeclaredAllergens : t.catalog.noDeclaredAllergensUnverified}
        </span>
      ) : null}
      {!info.ingredientsKnown ? <Badge tone="warning">{t.catalog.unknownIngredients}</Badge> : null}
    </div>
  );
}
