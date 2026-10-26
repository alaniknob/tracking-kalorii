import { Badge } from "@/components/ui/badge";
import { formatGrosze, formatIsoDate, formatNumber, getMessages } from "@/i18n";
import type { BasketCost, ItemCost } from "../cost";
import type { NameMaps } from "../names";
import type { Offer } from "../offers";
import { PriceStatusBadge } from "./price-status-badge";


export function UnitPrice({ offer, inline = false }: { offer: Offer; inline?: boolean }) {
  const p = getMessages().pricing;
  const perPiece = offer.piecePriceGrosze !== null;
  return (
    <span className="tabular-nums">
      {formatGrosze(offer.unitPriceGrosze)}
      {p.perUnit(offer.baseUnit === "ml" ? "l" : "kg")}
      {perPiece ? (
        <span className={inline ? undefined : "block text-xs text-muted"}>
          {inline ? " · " : ""}
          {formatGrosze(offer.piecePriceGrosze!)}
          {p.perPiece}
        </span>
      ) : null}
    </span>
  );
}

function ItemRow({ item, names }: { item: ItemCost; names: NameMaps }) {
  const p = getMessages().pricing;
  const c = p.columns;
  const name = names.products[item.productId] ?? item.productId;
  const need = `${formatNumber(item.needBase)} ${names.units[item.productId] ?? ""}`;
  if (!item.priced) {
    return (
      <li data-testid={`cost-${item.productId}`} className="py-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{name}</span>
          <span className="text-right text-sm font-medium text-danger">{p.noPrice}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {c.need}: {need} · {p.missing[item.reason]}
        </p>
      </li>
    );
  }
  const { offer } = item.choice;
  return (
    <li data-testid={`cost-${item.productId}`} className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{name}</span>
        <span className="text-right font-semibold tabular-nums">{formatGrosze(item.choice.packagesCostGrosze)}</span>
      </div>
      <p className="mt-0.5 text-xs leading-relaxed text-muted">
        {names.stores[offer.storeId] ?? offer.storeId} · {p.packagesCount(item.choice.packages)}{" "}
        {formatNumber(offer.packageAmount, undefined, 3)} {offer.packageUnit} × {formatGrosze(offer.priceGrosze)} ·{" "}
        <UnitPrice offer={offer} inline />
        <br />
        {c.need}: {need} · {c.usedCost.toLowerCase()}: {formatGrosze(item.choice.usedCostGrosze)}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <PriceStatusBadge status={offer.status} />
        {offer.kind === "promotion" && offer.promotionEndsOn ? (
          <Badge tone="primary">{p.promotionUntil(formatIsoDate(offer.promotionEndsOn))}</Badge>
        ) : null}
        {item.expiredPromotion ? <Badge>{p.recipeCost.expiredPromo}</Badge> : null}
        {offer.source.isDemo ? null : <Badge tone="primary">{p.sourceKind[offer.source.kind]}</Badge>}
      </div>
      {item.cheaperElsewhere ? (
        <p className="mt-1 text-xs text-muted">
          {p.recipeCost.cheaperElsewhere(
            names.stores[item.cheaperElsewhere.offer.storeId] ?? item.cheaperElsewhere.offer.storeId,
            formatGrosze(item.cheaperElsewhere.savingGrosze),
          )}
        </p>
      ) : null}
    </li>
  );
}

/** Tabela pozycji + sumy rozbite na ceny aktualne / nieaktualne / szacunkowe (nigdy jedna wspólna kwota). */
export function CostBreakdown({
  cost,
  names,
  servings,
}: {
  cost: BasketCost;
  names: NameMaps;
  servings?: number;
}) {
  const p = getMessages().pricing;
  const rows = [
    { key: "current", label: p.totals.confirmed },
    { key: "stale", label: p.totals.stale },
    { key: "estimated", label: p.totals.estimated },
  ] as const;

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border text-sm">
        {cost.items.map((item) => (
          <ItemRow key={item.productId} item={item} names={names} />
        ))}
      </ul>

      <div className="rounded-lg bg-surface-muted p-4" data-testid="cost-totals">
        <h3 className="mb-2 text-sm font-semibold">{p.totals.title}</h3>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="pb-1 text-left font-medium" />
              <th className="pb-1 text-right font-medium">{p.totals.used}</th>
              <th className="pb-1 text-right font-medium">{p.totals.packages}</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => cost.packages[r.key] > 0 || r.key === "current")
              .map((r) => (
                <tr key={r.key} data-testid={`total-${r.key}`}>
                  <td className="py-0.5">{r.label}</td>
                  <td className="py-0.5 text-right tabular-nums">{formatGrosze(cost.used[r.key])}</td>
                  <td className="py-0.5 text-right font-semibold tabular-nums">{formatGrosze(cost.packages[r.key])}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {servings && servings > 0 ? (
          <p className="mt-2 text-xs text-muted" data-testid="cost-per-serving">
            {p.totals.perServing}: {formatGrosze(Math.round((cost.used.current + cost.used.stale) / servings))}
            {cost.used.estimated > 0 ? ` + ${formatGrosze(Math.round(cost.used.estimated / servings))} (${p.status.estimated.toLowerCase()})` : ""}
          </p>
        ) : null}
        {cost.missingCount > 0 ? <p className="mt-1 text-xs text-danger">{p.totals.missingCount(cost.missingCount)}</p> : null}
        <p className="mt-2 text-xs text-subtle">{p.totals.neverMixed}</p>
      </div>
    </div>
  );
}
