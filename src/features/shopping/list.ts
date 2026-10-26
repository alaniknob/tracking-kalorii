import type { BasketCost, MissingReason, Need, StatusTotals } from "@/features/pricing/cost";
import type { Grosze, PriceStatus } from "@/features/pricing/types";
import { PRODUCT_CATEGORIES, type BaseUnit, type Product, type ProductCategory, type QuantityUnit } from "@/features/products/types";

export interface ShoppingPurchase {
  storeId: string;
  storeName: string;
  packages: number;
  packageAmount: number;
  packageUnit: QuantityUnit;
  priceGrosze: Grosze;
  packagesCostGrosze: Grosze;
  status: PriceStatus;
  promotionEndsOn: string | null;
  isDemo: boolean;
  /** Ile zostanie z kupionych opakowań po zużyciu w planie (jednostka bazowa). */
  leftoverBase: number;
}

export interface ShoppingItem {
  productId: string;
  name: string;
  category: ProductCategory;
  baseUnit: BaseUnit;
  /** Łączna potrzeba z całego planu. */
  needBase: number;
  /** Część pokryta zapasami. */
  pantryBase: number;
  toBuyBase: number;
  /** Przybliżona liczba sztuk do kupienia (gdy produkt ma masę sztuki). */
  pieces: number | null;
  /** Liczba posiłków w planie, które używają produktu, i nazwy przepisów. */
  mealCount: number;
  recipes: string[];
  purchase: ShoppingPurchase | null;
  missingReason: MissingReason | null;
  /**
   * Podpis pozycji: zmienia się, gdy po zmianie planu zmienia się sklep, liczba opakowań lub ilość —
   * wtedy odhaczenie przestaje obowiązywać.
   */
  signature: string;
}

export interface ShoppingGroup {
  /** Kategoria produktu albo id sklepu; `null` = bez ceny (sklep nieznany). */
  key: string | null;
  items: ShoppingItem[];
  totals: StatusTotals;
}

export interface ShoppingList {
  toBuy: ShoppingItem[];
  /** W całości pokryte zapasami — nic nie trzeba kupować. */
  covered: ShoppingItem[];
  byCategory: ShoppingGroup[];
  byStore: ShoppingGroup[];
  totals: StatusTotals;
  missingCount: number;
}

export interface ShoppingInput {
  /** Wszystkie potrzeby planu (bez zapasów). */
  full: BasketCost;
  /** Do kupienia: potrzeby minus zapasy, z wybraną ofertą. */
  basket: BasketCost;
  pantryUsed: readonly { productId: string; usedBase: number }[];
  meals: readonly { recipeName: string; needs: readonly Need[] }[];
  products: ReadonlyMap<string, Product>;
  storeNames: Readonly<Record<string, string>>;
}

const emptyTotals = (): StatusTotals => ({ current: 0, stale: 0, estimated: 0 });

function addTo(totals: StatusTotals, item: ShoppingItem) {
  if (item.purchase) totals[item.purchase.status] += item.purchase.packagesCostGrosze;
}

/**
 * Lista zakupów z planu: każdy produkt raz (suma ze wszystkich posiłków), całe opakowania
 * z oferty wybranej dla koszyka, zapasy odliczone. Liczona zawsze od nowa z bieżącego planu,
 * więc zmiana jadłospisu od razu zmienia listę.
 */
export function buildShoppingList(input: ShoppingInput): ShoppingList {
  const basket = new Map(input.basket.items.map((i) => [i.productId, i]));
  const pantry = new Map(input.pantryUsed.map((p) => [p.productId, p.usedBase]));
  const usage = new Map<string, { meals: number; recipes: Set<string> }>();
  for (const meal of input.meals) {
    for (const need of meal.needs) {
      const u = usage.get(need.productId) ?? { meals: 0, recipes: new Set<string>() };
      u.meals++;
      u.recipes.add(meal.recipeName);
      usage.set(need.productId, u);
    }
  }

  const toBuy: ShoppingItem[] = [];
  const covered: ShoppingItem[] = [];
  for (const full of input.full.items) {
    const product = input.products.get(full.productId);
    if (!product) continue;
    const item = basket.get(full.productId);
    const toBuyBase = item?.needBase ?? 0;
    const purchase: ShoppingPurchase | null =
      item && item.priced
        ? {
            storeId: item.choice.offer.storeId,
            storeName: input.storeNames[item.choice.offer.storeId] ?? item.choice.offer.storeId,
            packages: item.choice.packages,
            packageAmount: item.choice.offer.packageAmount,
            packageUnit: item.choice.offer.packageUnit,
            priceGrosze: item.choice.offer.priceGrosze,
            packagesCostGrosze: item.choice.packagesCostGrosze,
            status: item.choice.offer.status,
            promotionEndsOn: item.choice.offer.promotionEndsOn,
            isDemo: item.choice.offer.source.isDemo,
            leftoverBase: item.choice.leftoverBase,
          }
        : null;
    const u = usage.get(full.productId);
    const shopping: ShoppingItem = {
      productId: product.id,
      name: product.name,
      category: product.category,
      baseUnit: product.baseUnit,
      needBase: full.needBase,
      pantryBase: Math.min(pantry.get(product.id) ?? 0, full.needBase),
      toBuyBase,
      pieces: product.gramsPerPiece && product.baseUnit === "g" && toBuyBase > 0 ? Math.ceil(toBuyBase / product.gramsPerPiece - 1e-9) : null,
      mealCount: u?.meals ?? 0,
      recipes: u ? [...u.recipes].sort((a, b) => a.localeCompare(b, "pl")) : [],
      purchase,
      missingReason: item && !item.priced ? item.reason : null,
      signature: `${purchase?.storeId ?? "-"}|${purchase?.packages ?? 0}|${Math.round(toBuyBase)}`,
    };
    (item ? toBuy : covered).push(shopping);
  }
  const byName = (a: ShoppingItem, b: ShoppingItem) => a.name.localeCompare(b.name, "pl");
  toBuy.sort(byName);
  covered.sort(byName);

  const group = (key: string | null, items: ShoppingItem[]): ShoppingGroup => {
    const totals = emptyTotals();
    items.forEach((i) => addTo(totals, i));
    return { key, items, totals };
  };

  const byCategory = PRODUCT_CATEGORIES.map((c) => group(c, toBuy.filter((i) => i.category === c))).filter((g) => g.items.length > 0);

  const storeIds = [...new Set(toBuy.flatMap((i) => (i.purchase ? [i.purchase.storeId] : [])))].sort((a, b) =>
    (input.storeNames[a] ?? a).localeCompare(input.storeNames[b] ?? b, "pl"),
  );
  const byStore = storeIds.map((id) => group(id, toBuy.filter((i) => i.purchase?.storeId === id)));
  const unpriced = toBuy.filter((i) => !i.purchase);
  if (unpriced.length > 0) byStore.push(group(null, unpriced));

  const totals = emptyTotals();
  toBuy.forEach((i) => addTo(totals, i));
  return { toBuy, covered, byCategory, byStore, totals, missingCount: unpriced.length };
}

/** Odhaczenia zapisane w karcie: id produktu → podpis pozycji w chwili odhaczenia. */
export type CheckedMap = Record<string, string>;

export type CheckState = "unchecked" | "checked" | "changed";

/**
 * Odhaczenie obowiązuje tylko, gdy pozycja się nie zmieniła. Po zmianie planu pozycja
 * z inną ilością, liczbą opakowań lub sklepem wraca na listę jako „zmieniona”.
 */
export function checkStateOf(item: ShoppingItem, checked: Readonly<CheckedMap>): CheckState {
  const saved = checked[item.productId];
  if (saved === undefined) return "unchecked";
  return saved === item.signature ? "checked" : "changed";
}

/** Odhaczenia tylko dla pozycji obecnych na liście (usunięte z planu są pomijane). */
export function pruneChecked(list: Pick<ShoppingList, "toBuy">, checked: Readonly<CheckedMap>): CheckedMap {
  const ids = new Set(list.toBuy.map((i) => i.productId));
  return Object.fromEntries(Object.entries(checked).filter(([id]) => ids.has(id)));
}

/** Sumy kupionych i pozostałych pozycji (osobno dla statusów cen). */
export function progressOf(list: Pick<ShoppingList, "toBuy">, checked: Readonly<CheckedMap>) {
  const bought = emptyTotals();
  const remaining = emptyTotals();
  let boughtCount = 0;
  for (const item of list.toBuy) {
    const done = checkStateOf(item, checked) === "checked";
    if (done) boughtCount++;
    addTo(done ? bought : remaining, item);
  }
  return { bought, remaining, boughtCount, total: list.toBuy.length };
}
