import { formatGrams, formatKcal, formatNumber, getMessages } from "@/i18n";
import type { NutritionTotals } from "../nutrition";

export function NutritionTable({ columns }: { columns: { label: string; values: NutritionTotals }[] }) {
  const t = getMessages();
  const n = t.nutrition;
  const rows: [string, (v: NutritionTotals) => string][] = [
    [t.recipes.energy, (v) => formatKcal(v.kcal)],
    [n.protein, (v) => formatGrams(v.proteinG)],
    [n.fat, (v) => formatGrams(v.fatG)],
    [n.carbohydrates, (v) => formatGrams(v.carbohydratesG)],
    [t.recipes.fiber, (v) => `${formatNumber(v.fiberG, undefined, 1)} g`],
  ];
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-muted text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              <span className="sr-only">{t.recipes.valueColumn}</span>
            </th>
            {columns.map((c) => (
              <th key={c.label} scope="col" className="px-3 py-2 text-right font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([label, format]) => (
            <tr key={label}>
              <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                {label}
              </th>
              {columns.map((c) => (
                <td key={c.label} className="px-3 py-2 text-right font-medium tabular-nums">
                  {format(c.values)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
