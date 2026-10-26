export const DRAFT_KEYS = {
  diet: "tk:draft:diet",
  restrictions: "tk:draft:restrictions",
  stores: "tk:draft:stores",
  budget: "tk:draft:budget",
  priceImport: "tk:draft:price-import",
  /** Profil zapisywany tylko na wyraźne życzenie (zawiera dane o zdrowiu). */
  profile: "tk:draft:profile",
  pantry: "tk:draft:pantry",
  plan: "tk:draft:plan",
  /** Odhaczone pozycje listy zakupów (id produktu → podpis pozycji). */
  shoppingChecked: "tk:draft:shopping-checked",
} as const;

export type DraftKey = (typeof DRAFT_KEYS)[keyof typeof DRAFT_KEYS];
