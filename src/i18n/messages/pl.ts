import type { ScreenId } from "@/config/routes";
import type { AllergenCode, AllergenReaction, ExclusionKind } from "@/features/allergens/eu-allergens";
import type { DietStyle, Difficulty, FoodGroup, KitchenEquipment } from "@/features/preferences/diet-styles";
import type { DataCompleteness, ProductCategory } from "@/features/products/types";
import type { MealType, RecipeReliability } from "@/features/recipes/types";
import type {
  ActivityLevel,
  Goal,
  GoalBlockReason,
  HealthFlag,
  NutritionWarning,
  RestrictionReason,
  Sex,
} from "@/features/nutrition/types";

/**
 * Słownik tekstów interfejsu (pl-PL). Kolejne języki dodajemy jako pliki o tym samym kształcie
 * (`Messages`), bez zmian w komponentach.
 */
export const pl = {
  app: {
    name: "Tracking Kalorii",
    tagline: "Plan żywienia, kalorie i koszt zakupów — w jednym miejscu.",
    description:
      "Aplikacja szacuje zapotrzebowanie energetyczne, a w kolejnych etapach ułoży 7-dniowy jadłospis i listę zakupów dopasowaną do budżetu i wybranych sklepów.",
  },
  common: {
    unavailable: "Niedostępne",
    soon: "Wkrótce",
    available: "Dostępne",
    stage: (n: number) => `Etap ${n}`,
    backHome: "Wróć na stronę główną",
    skipToContent: "Przejdź do treści",
    mainNav: "Główna nawigacja",
    optional: "opcjonalnie",
    estimateDisclaimer:
      "Wyniki są szacunkiem na podstawie wzorów populacyjnych, a nie pomiarem medycznym. W razie wątpliwości skonsultuj się z lekarzem lub dietetykiem.",
  },
  /** Krótkie etykiety głównej nawigacji. */
  nav: {
    onboarding: "Profil",
    nutritionSettings: "Żywienie",
    allergies: "Alergie",
    recipes: "Przepisy",
    generator: "Generator",
  } satisfies Partial<Record<ScreenId, string>>,
  home: {
    ctaPrimary: "Oblicz zapotrzebowanie",
    ctaScreens: "Zobacz plan rozwoju",
    featuresTitle: "Co już działa",
    features: [
      {
        title: "Kalkulator zapotrzebowania",
        body: "BMR wg wzoru Mifflina–St Jeora, TDEE z poziomu aktywności, proponowana kaloryczność i makroskładniki.",
      },
      {
        title: "Zasady bezpieczeństwa",
        body: "Brak skrajnie niskich kalorii, limit tempa redukcji, osobne zasady dla osób niepełnoletnich, w ciąży i z chorobami.",
      },
      {
        title: "Preferencje, alergie i konflikty",
        body: "Łączone sposoby żywienia, 14 alergenów UE, nietolerancje i wykluczenia. Sprzeczności są wykrywane, a alergie zawsze mają pierwszeństwo.",
      },
    ],
    screensTitle: "Ekrany aplikacji",
    screensLead: "Ekrany oznaczone jako niedostępne powstaną w kolejnych etapach — szczegóły w docs/ROADMAP.md.",
    groups: {
      start: "Start",
      account: "Konto",
      settings: "Ustawienia",
      planning: "Planowanie",
      catalog: "Katalog",
    },
  },
  screens: {
    home: { title: "Strona główna", description: "Wprowadzenie do aplikacji." },
    login: { title: "Logowanie", description: "Logowanie e-mailem przez Supabase Auth." },
    register: { title: "Rejestracja", description: "Zakładanie konta i zgody na przetwarzanie danych." },
    onboarding: {
      title: "Profil i zapotrzebowanie",
      description: "Podaj podstawowe dane, aby oszacować zapotrzebowanie energetyczne i makroskładniki.",
    },
    dashboard: { title: "Panel", description: "Podsumowanie celu, bieżącego planu i listy zakupów." },
    nutritionSettings: {
      title: "Ustawienia żywieniowe",
      description: "Sposób żywienia, nielubiane produkty, czas przygotowania, trudność i wyposażenie kuchni.",
    },
    allergies: {
      title: "Alergie i wykluczenia",
      description: "14 alergenów UE, nietolerancje i własne wykluczenia produktów.",
    },
    budget: { title: "Budżet", description: "Tygodniowy budżet na zakupy spożywcze w PLN." },
    stores: { title: "Wybór sklepów", description: "Sklepy, w których robisz zakupy (np. Lidl, Biedronka, Kaufland)." },
    generator: {
      title: "Generator jadłospisu",
      description: "7-dniowy jadłospis z uwzględnieniem celu, alergii, preferencji i budżetu.",
    },
    week: { title: "Widok tygodnia", description: "Jadłospis na 7 dni z kaloriami, makro i kosztem." },
    meal: { title: "Szczegóły posiłku", description: "Składniki, gramatury, instrukcja, kalorie i koszt posiłku." },
    shopping: {
      title: "Lista zakupów",
      description: "Zsumowane składniki, opakowania, grupowanie wg sklepu i kategorii, odhaczanie kupionych.",
    },
    recipes: {
      title: "Przepisy",
      description: "Przepisy z kaloriami i makroskładnikami wyliczanymi ze składników oraz oceną zgodności z Twoimi alergiami i preferencjami.",
    },
    products: {
      title: "Produkty",
      description: "Katalog produktów: wartości odżywcze na 100 g / 100 ml, alergeny, kompletność danych i źródło.",
    },
    profileSettings: { title: "Ustawienia profilu", description: "Edycja profilu, eksport i usunięcie konta oraz danych." },
    history: { title: "Historia planów", description: "Poprzednie jadłospisy i listy zakupów." },
  } satisfies Record<ScreenId, { title: string; description: string }>,
  unavailable: {
    badge: "Ekran w przygotowaniu",
    body: (stage: number) =>
      `Ten ekran nie jest jeszcze dostępny. Zostanie udostępniony w etapie ${stage} zgodnie z planem rozwoju.`,
    noAuth:
      "Konta użytkowników wymagają skonfigurowania Supabase (zmienne w .env.example). Do tego czasu aplikacja nie zapisuje żadnych danych.",
  },
  profile: {
    privacyNote:
      "Dane nie są nigdzie zapisywane — obliczenia wykonywane są na serwerze tylko na potrzeby tego wyniku. Pola dotyczące zdrowia są opcjonalne.",
    sections: {
      body: "Dane podstawowe",
      goal: "Cel i aktywność",
      health: "Zdrowie (opcjonalnie)",
    },
    fields: {
      birthDate: "Data urodzenia",
      heightCm: "Wzrost (cm)",
      weightKg: "Masa ciała (kg)",
      targetWeightKg: "Masa docelowa (kg)",
      sex: "Płeć fizjologiczna",
      sexHint: "Używana wyłącznie we wzorze na BMR. Możesz jej nie podawać — wynik będzie mniej dokładny.",
      activityLevel: "Poziom aktywności",
      goal: "Cel",
      mealsPerDay: "Liczba posiłków dziennie",
      healthFlags: "Zaznacz, jeśli dotyczy",
      healthHint:
        "Przy zaznaczeniu którejkolwiek opcji aplikacja nie wyliczy automatycznie celu kalorycznego — takie sytuacje wymagają indywidualnych zaleceń.",
    },
    sex: {
      unspecified: "Wolę nie podawać",
      female: "Kobieta",
      male: "Mężczyzna",
    } satisfies Record<Sex, string>,
    activity: {
      sedentary: "Siedzący tryb życia (brak treningów)",
      light: "Niska aktywność (1–3 treningi w tygodniu)",
      moderate: "Umiarkowana (3–5 treningów w tygodniu)",
      active: "Wysoka (6–7 treningów lub praca fizyczna)",
      very_active: "Bardzo wysoka (ciężka praca fizyczna i treningi)",
    } satisfies Record<ActivityLevel, string>,
    goal: {
      lose_weight: "Redukcja masy ciała",
      maintain: "Utrzymanie masy ciała",
      gain_weight: "Zwiększenie masy ciała",
      build_muscle: "Budowa masy mięśniowej",
    } satisfies Record<Goal, string>,
    healthFlags: {
      pregnancy: "Ciąża",
      breastfeeding: "Karmienie piersią",
      diabetes: "Cukrzyca",
      kidney_disease: "Choroba nerek",
      cardiovascular_disease: "Choroba układu krążenia",
      eating_disorder: "Zaburzenia odżywiania (obecnie lub w przeszłości)",
      other_condition: "Inna choroba wymagająca diety",
    } satisfies Record<HealthFlag, string>,
    submit: "Oblicz",
    submitting: "Obliczanie…",
  },
  validation: {
    formInvalid: "Popraw zaznaczone pola i spróbuj ponownie.",
    required: "To pole jest wymagane.",
    number: "Podaj liczbę.",
    integer: "Podaj liczbę całkowitą.",
    range: (min: number, max: number, unit = "") => `Podaj wartość od ${min} do ${max}${unit ? ` ${unit}` : ""}.`,
    birthDateInvalid: "Podaj prawidłową datę urodzenia.",
    birthDateFuture: "Data urodzenia nie może być z przyszłości.",
    ageRange: (min: number, max: number) => `Kalkulator obsługuje wiek od ${min} do ${max} lat.`,
    option: "Wybierz jedną z dostępnych opcji.",
    targetBelowCurrent: "Przy redukcji masa docelowa musi być niższa od obecnej.",
    targetAboveCurrent: "Przy zwiększaniu masy masa docelowa musi być wyższa od obecnej.",
    unexpected: "Nie udało się wykonać obliczeń. Spróbuj ponownie za chwilę.",
    textTooLong: (max: number) => `Tekst może mieć maksymalnie ${max} znaków.`,
    textItemLength: (min: number, max: number) => `Każda pozycja musi mieć od ${min} do ${max} znaków.`,
    textListMax: (max: number) => `Możesz podać maksymalnie ${max} pozycji.`,
    dietStylesRequired: "Wybierz co najmniej jeden sposób żywienia.",
    conflictsBlocking: "Ustawienia zawierają sprzeczności — popraw je, aby można było je przyjąć.",
  },
  preferences: {
    draftNote:
      "Do czasu założenia kont ustawienia są przechowywane wyłącznie w tej karcie przeglądarki (sessionStorage) i znikają po jej zamknięciu. Serwer każdorazowo sprawdza je ponownie.",
    draftIncludedAllergies: "Uwzględniono też Twoje ustawienia z ekranu „Alergie i wykluczenia”.",
    draftIncludedDiet: "Uwzględniono też Twoje ustawienia z ekranu „Ustawienia żywieniowe”.",
    clearDraft: "Wyczyść ustawienia z tej karty",
    submit: "Sprawdź i zapisz w tej karcie",
    submitting: "Sprawdzanie…",
    saved: "Ustawienia są spójne i zostały zapisane w tej karcie przeglądarki.",
    sections: {
      diet: "Sposób żywienia",
      dietHint: "Możesz łączyć kilka opcji — np. „Bezmięsna” + „Z rybami” to dieta pescowegetariańska.",
      products: "Produkty",
      practical: "Gotowanie",
      eu: "Alergeny wymagające oznaczania w UE",
      euHint:
        "Alergia — wykluczamy produkt także przy deklaracji „może zawierać” (jeśli zaznaczysz poniżej). Nietolerancja — wykluczamy produkty zawierające składnik.",
      custom: "Inne alergie, nietolerancje i wykluczenia",
    },
    fields: {
      dislikedProducts: "Nielubiane produkty",
      preferredProducts: "Preferowane produkty",
      listHint: "Oddziel przecinkami, np. „brokuły, seler naciowy”.",
      maxIngredients: "Maks. liczba składników w przepisie",
      maxPrepMinutes: "Maks. czas przygotowania posiłku",
      difficulty: "Trudność przepisów",
      equipment: "Dostępne wyposażenie kuchni",
      useLeftovers: "Wykorzystuj resztki z poprzednich posiłków",
      otherAllergies: "Inne alergie pokarmowe",
      otherIntolerances: "Inne nietolerancje",
      voluntaryExclusions: "Dobrowolne wykluczenia",
      voluntaryHint: "Produkty, których nie chcesz jeść z innych powodów (np. etycznych, religijnych).",
      avoidTraces: "Przy alergiach wykluczaj produkty z informacją „może zawierać” (zanieczyszczenie krzyżowe)",
    },
    noLimit: "Bez limitu",
    minutes: (n: string) => `${n} min`,
    dietStyles: {
      traditional: "Tradycyjna",
      vegetarian: "Wegetariańska",
      vegan: "Wegańska",
      meatless: "Bezmięsna",
      with_fish: "Z rybami",
      no_fish: "Bez ryb",
      with_meat: "Z mięsem",
    } satisfies Record<DietStyle, string>,
    foodGroups: {
      meat: "mięso",
      fish: "ryby",
      seafood: "owoce morza",
      eggs: "jaja",
      dairy: "nabiał",
      honey: "miód",
    } satisfies Record<FoodGroup, string>,
    difficulty: { easy: "Tylko proste", medium: "Proste i średnie", any: "Dowolna" } satisfies Record<Difficulty, string>,
    equipment: {
      stove: "Kuchenka / płyta",
      oven: "Piekarnik",
      microwave: "Mikrofalówka",
      blender: "Blender",
      air_fryer: "Frytkownica beztłuszczowa",
      slow_cooker: "Wolnowar",
    } satisfies Record<KitchenEquipment, string>,
    allergens: {
      gluten: "Zboża zawierające gluten",
      crustaceans: "Skorupiaki",
      eggs: "Jaja",
      fish: "Ryby",
      peanuts: "Orzeszki ziemne (arachidowe)",
      soybeans: "Soja",
      milk: "Mleko (w tym laktoza)",
      nuts: "Orzechy",
      celery: "Seler",
      mustard: "Gorczyca",
      sesame: "Nasiona sezamu",
      sulphites: "Dwutlenek siarki i siarczyny",
      lupin: "Łubin",
      molluscs: "Mięczaki",
    } satisfies Record<AllergenCode, string>,
    reactions: { none: "Nie dotyczy", allergy: "Alergia", intolerance: "Nietolerancja" } satisfies Record<
      AllergenReaction,
      string
    >,
    exclusionKinds: {
      allergy: "alergia",
      intolerance: "nietolerancja",
      voluntary: "wykluczenie dobrowolne",
      dislike: "nielubiany",
    } satisfies Record<ExclusionKind, string>,
    summary: {
      title: "Wynikowe reguły dla jadłospisu",
      forbidden: "Wykluczone grupy",
      required: "Mają pojawiać się w planie",
      allergens: "Wykluczone alergeny",
      traces: "także „może zawierać”",
      custom: "Własne wykluczenia",
      preferred: "Preferowane produkty",
      none: "Brak",
      conflictsBlocking: "Sprzeczności do poprawienia",
      conflictsResolved: "Konflikty rozstrzygnięte automatycznie",
      priority: "Kolejność ważności: alergie i nietolerancje > sposób żywienia > preferencje smakowe i cena.",
      verificationNote:
        "Brak alergenu w nazwie produktu nie oznacza jego braku. Produkty bez pełnych danych o składzie będą oznaczane jako „wymaga weryfikacji”.",
    },
    conflicts: {
      dietContradiction: (required: string, requiredBy: string, forbiddenBy: string) =>
        `„${requiredBy}” wymaga produktów z grupy „${required}”, a „${forbiddenBy}” je wyklucza. Odznacz jedną z opcji.`,
      pescatarianHint: "Jeśli jesz ryby, ale nie mięso, wybierz „Bezmięsna” + „Z rybami”.",
      restrictionOverridesDiet: (group: string, requiredBy: string, allergen: string, kind: string) =>
        `${kind[0].toUpperCase()}${kind.slice(1)} („${allergen}”) wyklucza grupę „${group}”, więc wymaganie „${requiredBy}” nie będzie stosowane.`,
      productPreferredAndDisliked: (product: string) =>
        `„${product}” jest jednocześnie na liście preferowanych i nielubianych produktów.`,
      preferredProductExcluded: (product: string, kind: string) =>
        `„${product}” usunięto z preferowanych, bo jest wykluczony (${kind}).`,
    },
  },
  nutrition: {
    resultTitle: "Twoje szacunkowe zapotrzebowanie",
    bmr: { label: "BMR", hint: "Podstawowa przemiana materii — energia potrzebna w spoczynku." },
    tdee: { label: "TDEE", hint: "Całkowite dzienne zapotrzebowanie przy podanej aktywności." },
    goalKcal: { label: "Proponowana kaloryczność", hint: "Cel kaloryczny dopasowany do wybranego celu." },
    plannedKcal: {
      label: "Kalorie zaplanowanych posiłków",
      hint: "Pojawią się po wygenerowaniu jadłospisu (etap 5).",
      empty: "Brak planu",
    },
    adjustment: (kcal: number) =>
      kcal === 0 ? "Bez korekty względem TDEE" : `${kcal > 0 ? "+" : "−"}${Math.abs(kcal)} kcal względem TDEE`,
    perDay: "kcal / dzień",
    bmi: "BMI",
    macrosTitle: "Makroskładniki (dziennie)",
    protein: "Białko",
    fat: "Tłuszcze",
    carbohydrates: "Węglowodany",
    fiber: "Błonnik (min.)",
    perMeal: (meals: number) => `Średnio na posiłek (${meals} dziennie)`,
    restrictedTitle: "Nie wyliczymy automatycznie celu kalorycznego",
    restricted: {
      minor:
        "Osoby niepełnoletnie są w okresie wzrostu — zapotrzebowania nie należy wyznaczać wzorami dla dorosłych. Skonsultuj się z lekarzem lub dietetykiem.",
      pregnancy:
        "W ciąży zapotrzebowanie zmienia się z każdym trymestrem, a redukcja kalorii nie jest zalecana. Plan żywienia ustal z lekarzem lub dietetykiem.",
      breastfeeding:
        "Karmienie piersią zwiększa zapotrzebowanie energetyczne. Plan żywienia ustal z lekarzem lub dietetykiem.",
      eating_disorder:
        "Przy zaburzeniach odżywiania liczenie kalorii może szkodzić. Ta funkcja jest wyłączona — wsparcia szukaj u specjalisty.",
      health_condition:
        "Przy zaznaczonych schorzeniach zalecenia żywieniowe powinny być ustalane indywidualnie z lekarzem lub dietetykiem.",
    } satisfies Record<RestrictionReason, string>,
    blockedTitle: "Ten cel nie zostanie zaproponowany automatycznie",
    blocked: {
      underweight_weight_loss:
        "Twoje BMI wskazuje na niedowagę, dlatego nie zaproponujemy deficytu kalorycznego. Rozważ cel „Utrzymanie masy ciała” i konsultację ze specjalistą.",
      target_bmi_too_low:
        "Masa docelowa odpowiada BMI poniżej 18,5 (niedowaga). Wybierz wyższą masę docelową lub inny cel.",
    } satisfies Record<GoalBlockReason, string>,
    warnings: {
      sex_unspecified_estimate:
        "Nie podano płci fizjologicznej — użyto uśrednionej stałej wzoru, więc wynik może odbiegać o ok. ±80 kcal.",
      age_outside_formula_range:
        "Wzór Mifflina–St Jeora opracowano dla osób w wieku 19–78 lat — dla Twojego wieku wynik jest mniej pewny.",
      obesity_protein_reference:
        "Przy BMI ≥ 30 białko wyliczono od masy odpowiadającej BMI 25, aby nie zawyżać zapotrzebowania.",
      goal_limited_by_safety:
        "Korektę kaloryczności ograniczono zasadami bezpieczeństwa (maks. tempo zmian lub minimalna kaloryczność).",
      no_safe_deficit:
        "Twoje szacowane zapotrzebowanie jest zbyt niskie, by bezpiecznie zastosować deficyt — proponujemy kaloryczność równą TDEE. Skonsultuj cel ze specjalistą.",
    } satisfies Record<NutritionWarning, string>,
  },
  catalog: {
    demoBadge: "Dane przykładowe",
    demoNotice:
      "Wszystkie produkty i przepisy na tym ekranie to dane przykładowe (demo): przybliżone wartości typowe dla kategorii, nie z etykiet konkretnych produktów. Nie zawierają cen.",
    per100: (unit: "g" | "ml") => `na 100 ${unit}`,
    noNutrition: "Brak danych o wartościach odżywczych",
    unknownIngredients: "Skład nieznany — wymaga weryfikacji",
    contains: "zawiera",
    mayContain: "może zawierać",
    noDeclaredAllergens: "Brak zadeklarowanych alergenów",
    noDeclaredAllergensUnverified: "Brak zadeklarowanych alergenów (niepotwierdzone — skład nieznany)",
    package: (size: string) => `Opakowanie: ${size}`,
    byWeight: "Na wagę / sztuki",
    piece: (grams: number) => `1 szt. ≈ ${grams} g`,
    completeness: {
      complete: "Dane pełne",
      partial: "Dane częściowe",
      minimal: "Dane minimalne",
    } satisfies Record<DataCompleteness, string>,
    categories: {
      grains: "Zboża i makarony",
      bakery: "Pieczywo",
      dairy: "Nabiał",
      eggs: "Jaja",
      meat: "Mięso",
      fish: "Ryby",
      legumes: "Strączki i tofu",
      vegetables: "Warzywa",
      fruits: "Owoce",
      nuts_seeds: "Orzechy i nasiona",
      fats_oils: "Tłuszcze",
      spices_condiments: "Przyprawy",
      other: "Inne",
    } satisfies Record<ProductCategory, string>,
    source: "Źródło",
    updatedAt: "Aktualizacja danych",
  },
  recipes: {
    servings: (n: number) => `${n} ${n === 1 ? "porcja" : n < 5 ? "porcje" : "porcji"}`,
    minutes: (n: number) => `${n} min`,
    energy: "Energia",
    fiber: "Błonnik",
    valueColumn: "Wartość",
    perServing: "Na porcję",
    total: "Cały przepis",
    per100Cooked: "Na 100 g potrawy",
    servingMass: (g: number) => `Porcja ≈ ${g} g`,
    rawMass: (g: number) => `Masa surowych składników ≈ ${g} g`,
    cookedMass: (g: number) => `Masa po przygotowaniu ≈ ${g} g (szacunek)`,
    incompleteData:
      "Brakuje danych o części składników — podane wartości są zaniżone (dolna granica).",
    fiberIncomplete: "Błonnik: część składników nie ma danych.",
    calculatedNote: "Kalorie i makroskładniki są wyliczane ze składników (masa surowa), nie wpisywane ręcznie.",
    ingredients: "Składniki",
    instructions: "Przygotowanie",
    allergens: "Alergeny (suma składników)",
    foodGroups: "Grupy żywności",
    noFoodGroups: "Bez mięsa, ryb, jaj, nabiału i miodu",
    equipment: "Sprzęt",
    reliability: {
      tested: "Przepis przetestowany",
      estimated: "Wartości szacunkowe",
      unverified: "Przepis nieprzetestowany",
    } satisfies Record<RecipeReliability, string>,
    mealTypes: {
      breakfast: "Śniadanie",
      lunch: "Obiad",
      dinner: "Kolacja",
      snack: "Przekąska",
    } satisfies Record<MealType, string>,
    difficulty: { easy: "Łatwy", medium: "Średni" },
    issue: {
      unknown_product: (id: string) => `Nieznany produkt (${id}).`,
      conversion_failed: (name: string) => `Nie można przeliczyć ilości produktu „${name}” (brak masy sztuki lub gęstości).`,
      missing_nutrition: (name: string) => `„${name}” nie ma danych o wartościach odżywczych.`,
    },
    backToList: "Wszystkie przepisy",
    details: "Szczegóły",
    fit: {
      loading: "Sprawdzanie zgodności z Twoimi ustawieniami…",
      noSettings: "Ustaw preferencje i alergie, aby sprawdzić zgodność",
      excluded: "Wykluczony dla Ciebie",
      needs_verification: "Wymaga weryfikacji",
      no_conflict_found: "Brak konfliktu z Twoimi ustawieniami",
      noConflictNote: "Na podstawie dostępnych danych — to nie jest gwarancja braku alergenów.",
      error: "Nie udało się sprawdzić zgodności. Spróbuj odświeżyć stronę.",
      reasons: {
        allergen: (allergen: string, declaration: string) => `Alergen: ${allergen} (${declaration}).`,
        forbidden_group: (group: string) => `Zawiera grupę wykluczoną przez Twoje ustawienia: ${group}.`,
        custom_exclusion: (label: string, kind: string, product: string) =>
          `„${product}” pasuje do wykluczenia „${label}” (${kind}).`,
        allergen_data_incomplete: "Co najmniej jeden składnik nie ma pełnych danych o składzie.",
        allergen_traces: "Składnik może zawierać śladowe ilości alergenu, którego nie tolerujesz.",
        custom_restriction_unverifiable: (label: string, kind: string) =>
          `Nie da się potwierdzić braku „${label}” (${kind}) — skład części składników jest nieznany.`,
      },
    },
  },
  errors: {
    notFoundTitle: "Nie znaleziono strony",
    notFoundBody: "Ta strona nie istnieje lub została przeniesiona.",
    unexpectedTitle: "Coś poszło nie tak",
    unexpectedBody: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie — Twoje dane nie zostały nigdzie wysłane.",
    retry: "Spróbuj ponownie",
  },
  footer: {
    note: "Aplikacja w fazie rozwoju. Wyniki mają charakter informacyjny i nie zastępują porady lekarza ani dietetyka.",
  },
};

export type Messages = typeof pl;
