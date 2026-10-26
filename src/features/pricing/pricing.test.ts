import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_PRODUCTS } from "@/features/products/demo-products";
import { CHAIN_STORES, customStore } from "@/features/stores/stores";
import { PRICE_STALE_AFTER_DAYS } from "./constants";
import { costNeeds, mergeNeeds, type PricingContext } from "./cost";
import { parseCsv } from "./csv";
import { daysBetween, isIsoDate, todayInPoland } from "./dates";
import { DEMO_PRICES, DEMO_PROMOTIONS } from "./demo-prices";
import { priceStatus, promotionStatus } from "./freshness";
import { importPricesCsv, parseDate } from "./import";
import { parsePlnToGrosze, proportionalGrosze } from "./money";
import { productOffers, unitPrice } from "./offers";
import { combinePriceSources, createInMemoryPriceSource } from "./provider";
import type { Promotion, StorePrice } from "./types";

const TODAY = "2026-10-26";
const products = new Map(DEMO_PRODUCTS.map((p) => [p.id, p]));
const product = (id: string) => products.get(id)!;

const source = { kind: "csv_import" as const, name: "test", url: null, isDemo: false };
const price = (p: Partial<StorePrice>): StorePrice => ({
  id: "p",
  productId: "ryz-bialy",
  storeId: "lidl",
  priceGrosze: 500,
  currency: "PLN",
  packageAmount: 1,
  packageUnit: "kg",
  observedOn: "2026-10-20",
  isEstimate: false,
  source,
  ...p,
});
const promo = (p: Partial<Promotion>): Promotion => ({
  id: "promo",
  productId: "ryz-bialy",
  storeId: "lidl",
  promoPriceGrosze: 300,
  currency: "PLN",
  packageAmount: 1,
  packageUnit: "kg",
  startsOn: "2026-10-20",
  endsOn: "2026-10-30",
  conditions: null,
  source,
  ...p,
});
const ctx = (over: Partial<PricingContext> = {}): PricingContext => ({
  products,
  prices: [],
  promotions: [],
  storeIds: new Set(["lidl", "biedronka"]),
  today: TODAY,
  allowEstimates: true,
  ...over,
});

describe("money", () => {
  it("parsuje kwoty w formacie polskim i kropkowym do groszy", () => {
    expect(parsePlnToGrosze("4,99")).toBe(499);
    expect(parsePlnToGrosze("4.9")).toBe(490);
    expect(parsePlnToGrosze("12")).toBe(1200);
    expect(parsePlnToGrosze("1 299,00 zł")).toBe(129900);
  });

  it("odrzuca niepoprawne kwoty", () => {
    for (const bad of ["", "abc", "-1", "4,999", "4,99,1", "1e3"]) expect(parsePlnToGrosze(bad)).toBeNull();
  });

  it("koszt proporcjonalny zaokrągla do grosza", () => {
    expect(proportionalGrosze(499, 150, 500)).toBe(150);
    expect(proportionalGrosze(1000, 1, 3)).toBe(333);
  });
});

describe("dates", () => {
  it("sprawdza istnienie daty i liczy dni", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(daysBetween("2026-10-01", "2026-10-26")).toBe(25);
    expect(todayInPoland(new Date("2026-10-26T23:30:00Z"))).toBe("2026-10-27");
  });

  it("akceptuje datę polską DD.MM.RRRR", () => {
    expect(parseDate("5.10.2026")).toBe("2026-10-05");
    expect(parseDate("31.02.2026")).toBeNull();
  });
});

describe("aktualność cen i promocji", () => {
  it(`cena potwierdzona starzeje się po ${PRICE_STALE_AFTER_DAYS} dniach; szacunkowa jest zawsze szacunkowa`, () => {
    expect(priceStatus({ isEstimate: false, observedOn: "2026-10-12" }, TODAY)).toBe("current");
    expect(priceStatus({ isEstimate: false, observedOn: "2026-10-11" }, TODAY)).toBe("stale");
    expect(priceStatus({ isEstimate: true, observedOn: TODAY }, TODAY)).toBe("estimated");
  });

  it("promocja: przyszła / aktywna / wygasła (granice włącznie)", () => {
    expect(promotionStatus({ startsOn: "2026-10-27", endsOn: "2026-10-30" }, TODAY)).toBe("upcoming");
    expect(promotionStatus({ startsOn: "2026-10-26", endsOn: "2026-10-26" }, TODAY)).toBe("active");
    expect(promotionStatus({ startsOn: "2026-10-01", endsOn: "2026-10-25" }, TODAY)).toBe("expired");
  });
});

describe("oferty i ceny jednostkowe", () => {
  it("cena jednostkowa za 1 kg różni się od ceny opakowania", () => {
    expect(unitPrice(279, 400)).toBe(698);
    const offers = productOffers(product("ryz-bialy"), [price({ priceGrosze: 279, packageAmount: 400, packageUnit: "g" })], [], TODAY);
    expect(offers.offers[0]).toMatchObject({ priceGrosze: 279, packageBase: 400, unitPriceGrosze: 698 });
  });

  it("opakowanie w sztukach: przeliczenie przez masę sztuki + cena za sztukę", () => {
    const offers = productOffers(product("jaja"), [price({ productId: "jaja", priceGrosze: 1099, packageAmount: 10, packageUnit: "szt" })], [], TODAY);
    expect(offers.offers[0]).toMatchObject({ packageBase: 500, unitPriceGrosze: 2198, piecePriceGrosze: 110 });
  });

  it("liczy tylko aktywne promocje bez warunków; wygasłe, przyszłe i warunkowe osobno", () => {
    const result = productOffers(
      product("ryz-bialy"),
      [price({})],
      [
        promo({ id: "active" }),
        promo({ id: "expired", startsOn: "2026-10-01", endsOn: "2026-10-10" }),
        promo({ id: "upcoming", startsOn: "2026-11-01", endsOn: "2026-11-10" }),
        promo({ id: "conditional", conditions: "przy zakupie 2 szt." }),
      ],
      TODAY,
    );
    expect(result.offers.map((o) => [o.id, o.kind])).toEqual([
      ["p", "regular"],
      ["active", "promotion"],
    ]);
    expect(result.expiredPromotions.map((p) => p.id)).toEqual(["expired"]);
    expect(result.upcomingPromotions.map((p) => p.id)).toEqual(["upcoming"]);
    expect(result.conditionalPromotions.map((p) => p.id)).toEqual(["conditional"]);
  });

  it("opakowanie w ml dla produktu w gramach bez gęstości jest odrzucane, nie zgadywane", () => {
    const result = productOffers(product("ryz-bialy"), [price({ packageUnit: "ml", packageAmount: 500 })], [], TODAY);
    expect(result.offers).toEqual([]);
    expect(result.unconvertible).toEqual(["p"]);
  });
});

describe("koszt potrzeb", () => {
  it("rozróżnia koszt zużyty i koszt całych opakowań", () => {
    const cost = costNeeds([{ productId: "ryz-bialy", baseAmount: 300 }], ctx({ prices: [price({ priceGrosze: 500 })] }));
    const item = cost.items[0];
    expect(item.priced && item.choice).toMatchObject({ packages: 1, usedCostGrosze: 150, packagesCostGrosze: 500, leftoverBase: 700 });
    expect(cost.used.current).toBe(150);
    expect(cost.packages.current).toBe(500);
  });

  it("wybiera najtańszy sposób pokrycia potrzeby spośród różnych gramatur", () => {
    const prices = [
      price({ id: "1kg", priceGrosze: 499 }),
      price({ id: "400g", storeId: "biedronka", priceGrosze: 279, packageAmount: 400, packageUnit: "g" }),
    ];
    const small = costNeeds([{ productId: "ryz-bialy", baseAmount: 350 }], ctx({ prices }));
    expect(small.items[0].priced && small.items[0].choice.offer.id).toBe("400g");
    const large = costNeeds([{ productId: "ryz-bialy", baseAmount: 900 }], ctx({ prices }));
    expect(large.items[0].priced && large.items[0].choice.offer.id).toBe("1kg");
  });

  it("tańsza cena szacunkowa nie wypiera potwierdzonej; nieaktualna przegrywa z aktualną", () => {
    const prices = [
      price({ id: "estimate", priceGrosze: 100, isEstimate: true }),
      price({ id: "stale", storeId: "biedronka", priceGrosze: 200, observedOn: "2026-08-01" }),
      price({ id: "current", priceGrosze: 600 }),
    ];
    const cost = costNeeds([{ productId: "ryz-bialy", baseAmount: 500 }], ctx({ prices }));
    expect(cost.items[0].priced && cost.items[0].choice.offer.id).toBe("current");
    expect(cost.packages).toEqual({ current: 600, stale: 0, estimated: 0 });
  });

  it("sumy dla statusów są osobne (potwierdzone i szacunkowe nie są łączone)", () => {
    const cost = costNeeds(
      [
        { productId: "ryz-bialy", baseAmount: 500 },
        { productId: "cebula", baseAmount: 110 },
      ],
      ctx({ prices: [price({}), price({ id: "c", productId: "cebula", priceGrosze: 45, packageAmount: 1, packageUnit: "szt", isEstimate: true })] }),
    );
    expect(cost.packages).toEqual({ current: 500, stale: 0, estimated: 45 });
  });

  it("bez zgody na szacunki: produkt tylko z ceną szacunkową jest brakiem", () => {
    const cost = costNeeds(
      [{ productId: "ryz-bialy", baseAmount: 500 }],
      ctx({ prices: [price({ isEstimate: true })], allowEstimates: false }),
    );
    expect(cost.items[0]).toMatchObject({ priced: false, reason: "only_estimates" });
    expect(cost.missingCount).toBe(1);
  });

  it("brak ceny i nieznany produkt są raportowane, nie liczone jako 0 zł", () => {
    const cost = costNeeds(
      [
        { productId: "przyprawa-curry", baseAmount: 5 },
        { productId: "nie-istnieje", baseAmount: 5 },
      ],
      ctx(),
    );
    expect(cost.items.map((i) => !i.priced && i.reason)).toEqual(["no_price", "unknown_product"]);
    expect(cost.packages).toEqual({ current: 0, stale: 0, estimated: 0 });
  });

  it("ceny spoza wybranych sklepów nie są liczone, ale pokazują możliwą oszczędność", () => {
    const prices = [price({ priceGrosze: 600 }), price({ id: "auchan", storeId: "auchan", priceGrosze: 400 })];
    const cost = costNeeds([{ productId: "ryz-bialy", baseAmount: 500 }], ctx({ prices }));
    const item = cost.items[0];
    expect(item.priced && item.choice.offer.storeId).toBe("lidl");
    expect(item.priced && item.cheaperElsewhere).toMatchObject({ savingGrosze: 200, offer: { storeId: "auchan" } });
  });

  it("aktywna promocja jest liczona, a o wygasłej informujemy", () => {
    const cost = costNeeds(
      [{ productId: "ryz-bialy", baseAmount: 500 }],
      ctx({ prices: [price({})], promotions: [promo({}), promo({ id: "old", startsOn: "2026-09-01", endsOn: "2026-09-10" })] }),
    );
    const item = cost.items[0];
    expect(item.priced && item.choice.offer.kind).toBe("promotion");
    expect(item.priced && item.expiredPromotion?.id).toBe("old");
  });

  it("sumuje te same produkty z różnych przepisów (całe opakowania raz)", () => {
    expect(
      mergeNeeds([
        { productId: "a", baseAmount: 100 },
        { productId: "b", baseAmount: 5 },
        { productId: "a", baseAmount: 250 },
      ]),
    ).toEqual([
      { productId: "a", baseAmount: 350 },
      { productId: "b", baseAmount: 5 },
    ]);
  });
});

describe("parser CSV", () => {
  it("obsługuje średnik, cudzysłowy, CRLF, BOM i puste linie", () => {
    const result = parseCsv('\uFEFFa;b;c\r\n1;"x;y";"z ""q"""\r\n\r\n2;;"multi\nline"\n');
    expect(result).toMatchObject({ ok: true, delimiter: ";", header: ["a", "b", "c"] });
    if (!result.ok) return;
    expect(result.rows).toEqual([
      { line: 2, cells: ["1", "x;y", 'z "q"'] },
      { line: 4, cells: ["2", "", "multi\nline"] },
    ]);
  });

  it("rozpoznaje przecinek jako separator", () => {
    const result = parseCsv("a,b\n1,2");
    expect(result.ok && result.delimiter).toBe(",");
  });

  it("zgłasza niezamknięty cudzysłów i pusty plik", () => {
    expect(parseCsv('a;b\n1;"x')).toEqual({ ok: false, error: "unterminated_quote", line: 2 });
    expect(parseCsv("  \n")).toEqual({ ok: false, error: "empty" });
  });
});

describe("import cen z CSV", () => {
  const stores = [...CHAIN_STORES, customStore("Targ na Kleparzu")];
  const run = (csv: string) => importPricesCsv(csv, { products: DEMO_PRODUCTS, stores, today: TODAY });
  const HEADER = "produkt;sklep;cena;opakowanie;jednostka;data;szacunkowa;promocja_od;promocja_do;warunki;zrodlo";

  it("przyjmuje poprawne wiersze: id lub nazwa, przecinek dziesiętny, data polska, własny sklep", () => {
    const result = run(
      [
        HEADER,
        "ryz-bialy;Lidl;4,99;1;kg;2026-10-20;nie;;;;paragon",
        "Mleko 2% tłuszczu;biedronka;3.69;1000;ml;20.10.2026;;;;;gazetka",
        "jaja;Targ na Kleparzu;12,00;10;szt;2026-10-21;tak;;;;szacunek",
        "losos;lidl;15,99;250;g;2026-10-22;;2026-10-22;2026-11-04;;gazetka",
      ].join("\n"),
    );
    expect(result.status).toBe("done");
    if (result.status !== "done") return;
    expect(result.errors).toEqual([]);
    expect(result.prices.map((p) => [p.productId, p.storeId, p.priceGrosze, p.isEstimate, p.observedOn])).toEqual([
      ["ryz-bialy", "lidl", 499, false, "2026-10-20"],
      ["mleko-2", "biedronka", 369, false, "2026-10-20"],
      ["jaja", "inny-targ-na-kleparzu", 1200, true, "2026-10-21"],
    ]);
    expect(result.promotions).toMatchObject([{ productId: "losos", promoPriceGrosze: 1599, endsOn: "2026-11-04" }]);
    expect(result.prices[0].source).toEqual({ kind: "csv_import", name: "paragon", url: null, isDemo: false });
  });

  it("nagłówki z polskimi znakami i wielkimi literami są rozpoznawane", () => {
    const result = run("Produkt;Sklep;Cena;Opakowanie;Jednostka;Data;Źródło\nryz-bialy;lidl;4,99;1;kg;2026-10-20;paragon");
    expect(result.status === "done" && result.prices.length).toBe(1);
  });

  it("raportuje błędy z numerem linii i kolumną, przyjmując poprawne wiersze", () => {
    const result = run(
      [
        HEADER,
        "nieznany;lidl;4,99;1;kg;2026-10-20;;;;;paragon",
        "ryz-bialy;Żabka Nano;4,99;1;kg;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;4,999;1;kg;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;0;1;kg;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;4,99;-1;kg;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;4,99;1;opak;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;4,99;500;ml;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;4,99;1;kg;2026-13-01;;;;;paragon",
        "ryz-bialy;lidl;4,99;1;kg;2026-10-27;;;;;paragon",
        "ryz-bialy;lidl;4,99;1;kg;2020-01-01;;;;;paragon",
        "ryz-bialy;lidl;4,99;1;kg;2026-10-20;może;;;;paragon",
        "ryz-bialy;lidl;4,99;1;kg;2026-10-20;;;;;",
        "ryz-bialy;lidl;3,99;1;kg;2026-10-20;tak;2026-10-20;2026-10-30;;gazetka",
        "ryz-bialy;lidl;3,99;1;kg;2026-10-20;;2026-10-30;2026-10-20;;gazetka",
        "ryz-bialy;lidl;3,99;1;kg;2026-10-20;;2026-10-20;;;gazetka",
        "ryz-bialy;lidl;3,99;1;kg;2026-10-20;;;;2 szt.;gazetka",
        "ryz-bialy;lidl;4,99;1;kg;2026-10-20;;;;;paragon",
        "ryz-bialy;lidl;4,99;1;kg;2026-10-20;;;;;paragon",
      ].join("\n"),
    );
    expect(result.status).toBe("done");
    if (result.status !== "done") return;
    expect(result.errors.map((e) => [e.line, e.column])).toEqual([
      [2, "produkt"],
      [3, "sklep"],
      [4, "cena"],
      [5, "cena"],
      [6, "opakowanie"],
      [7, "jednostka"],
      [8, "jednostka"],
      [9, "data"],
      [10, "data"],
      [11, "data"],
      [12, "szacunkowa"],
      [13, "zrodlo"],
      [14, "szacunkowa"],
      [15, "promocja_do"],
      [16, "promocja_do"],
      [17, "warunki"],
      [19, null],
    ]);
    expect(result.prices).toHaveLength(1);
    expect(result.rejectedRows).toBe(17);
    expect(result.errors.every((e) => e.message.length > 5)).toBe(true);
  });

  it("błędy pliku: pusty, brak kolumn, nieznane kolumny, tylko nagłówek, waluta", () => {
    expect(run("").status).toBe("file_error");
    const missing = run("produkt;cena\nryz-bialy;4,99");
    expect(missing.status === "file_error" && missing.message).toContain("sklep");
    const unknown = run(`${HEADER};kolor\n`);
    expect(unknown.status === "file_error" && unknown.message).toContain("kolor");
    expect(run(HEADER).status).toBe("file_error");
    const eur = run("produkt;sklep;cena;opakowanie;jednostka;data;zrodlo;waluta\nryz-bialy;lidl;4,99;1;kg;2026-10-20;x1;EUR");
    expect(eur.status === "done" && eur.errors[0].column).toBe("waluta");
  });

  it("szablon CSV z /public jest poprawny", () => {
    const template = readFileSync("public/szablon-cen.csv", "utf8");
    const result = run(template);
    expect(result.status === "done" && result.errors).toEqual([]);
    expect(result.status === "done" && result.prices.length + result.promotions.length).toBe(3);
  });
});

describe("dane demo i dostawcy", () => {
  it("każda cena demo jest oznaczona jako przykładowa i odnosi się do znanego produktu i sieci", () => {
    const chainIds = new Set(CHAIN_STORES.map((s) => s.id));
    for (const p of [...DEMO_PRICES, ...DEMO_PROMOTIONS]) {
      expect(p.source.isDemo).toBe(true);
      expect(p.source.kind).toBe("demo");
      expect(products.has(p.productId)).toBe(true);
      expect(chainIds.has(p.storeId)).toBe(true);
    }
    for (const p of DEMO_PRICES) {
      expect(productOffers(product(p.productId), [p], [], TODAY).unconvertible).toEqual([]);
    }
  });

  it("łączy źródła i filtruje po produktach i sklepach", async () => {
    const demo = createInMemoryPriceSource(DEMO_PRICES, DEMO_PROMOTIONS, true);
    const own = createInMemoryPriceSource([price({ id: "own" })], [], false);
    const combined = combinePriceSources([demo, own]);
    expect(combined.isDemo).toBe(true);
    const rice = await combined.getPrices({ productIds: ["ryz-bialy"], storeIds: ["lidl"] });
    expect(rice.map((p) => p.source.kind).sort()).toEqual(["csv_import", "demo"]);
  });
});
