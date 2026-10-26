"use client";

import { useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatGrosze, formatIsoDate, formatNumber, getMessages } from "@/i18n";
import { readDrafts } from "@/lib/session-draft";
import { priceTableAction, type PriceTableResponse } from "../actions";
import { PRICE_STALE_AFTER_DAYS } from "../constants";
import { PriceStatusBadge } from "./price-status-badge";
import { UnitPrice } from "./cost-breakdown";

type State = { status: "loading" } | { status: "error" } | { status: "ready"; data: PriceTableResponse };

export function PriceTable() {
  const t = getMessages();
  const p = t.pricing;
  const c = p.columns;
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const { stores, budget, priceImport } = readDrafts();
    priceTableAction({ stores, budget, priceImport })
      .then((data) => !cancelled && setState({ status: "ready", data }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <p className="text-sm text-muted">{p.recipeCost.loading}</p>;
  if (state.status === "error") return <Alert tone="danger">{p.recipeCost.error}</Alert>;
  const { data } = state;
  const selected = new Set(data.selectedStoreIds);
  const store = (id: string) => data.names.stores[id] ?? id;

  return (
    <div className="space-y-4" data-testid="price-table">
      <p className="text-xs text-muted">
        {p.statusHint(PRICE_STALE_AFTER_DAYS)} {p.observedHint}
      </p>
      {data.rows.map((row) => (
        <Card key={row.productId} className="space-y-3 p-5" data-testid={`prices-${row.productId}`}>
          <h3 className="font-semibold tracking-tight">{data.names.products[row.productId]}</h3>
          {row.offers.length === 0 ? (
            <p className="text-sm text-danger">{p.noPriceInStores}</p>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[28rem] text-sm">
                <thead className="text-left text-xs text-muted">
                  <tr className="border-b border-border">
                    <th className="py-1.5 pr-3 font-medium">{c.store}</th>
                    <th className="py-1.5 pr-3 font-medium">{c.package}</th>
                    <th className="py-1.5 pr-3 text-right font-medium">{c.price}</th>
                    <th className="py-1.5 pr-3 text-right font-medium">{c.unitPrice}</th>
                    <th className="py-1.5 font-medium">{c.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {row.offers.map((offer) => (
                    <tr key={offer.id} className={selected.has(offer.storeId) ? undefined : "text-muted"}>
                      <td className="py-1.5 pr-3">
                        {store(offer.storeId)}
                        <span className="block text-xs text-muted">
                          {formatIsoDate(offer.observedOn)}
                          {offer.source.isDemo ? "" : ` · ${offer.source.name}`}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 tabular-nums">
                        {formatNumber(offer.packageAmount, undefined, 3)} {offer.packageUnit}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium tabular-nums">{formatGrosze(offer.priceGrosze)}</td>
                      <td className="py-1.5 pr-3 text-right">
                        <UnitPrice offer={offer} />
                      </td>
                      <td className="py-1.5">
                        <span className="flex flex-wrap gap-1">
                          <PriceStatusBadge status={offer.status} />
                          {offer.kind === "promotion" && offer.promotionEndsOn ? (
                            <Badge tone="primary">{p.promotionUntil(formatIsoDate(offer.promotionEndsOn))}</Badge>
                          ) : null}
                          {offer.source.isDemo ? null : <Badge tone="primary">{p.sourceKind[offer.source.kind]}</Badge>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {row.expired.length + row.conditional.length + row.upcoming.length > 0 ? (
            <ul className="space-y-0.5 text-xs text-muted" data-testid={`promo-notes-${row.productId}`}>
              {row.expired.map((promo) => (
                <li key={promo.id}>
                  {store(promo.storeId)}: {formatGrosze(promo.promoPriceGrosze)} — {p.promotionExpired(formatIsoDate(promo.endsOn))}
                </li>
              ))}
              {row.conditional.map((promo) => (
                <li key={promo.id}>
                  {store(promo.storeId)}: {formatGrosze(promo.promoPriceGrosze)} — {p.promotionConditional(promo.conditions ?? "")}
                </li>
              ))}
              {row.upcoming.map((promo) => (
                <li key={promo.id}>
                  {store(promo.storeId)}: {formatGrosze(promo.promoPriceGrosze)} — {p.promotionUpcoming(formatIsoDate(promo.startsOn))}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
