import type { ScreenId } from "@/config/routes";
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
        title: "Walidacja po stronie serwera",
        body: "Każde dane z formularza są sprawdzane na serwerze — wartości dające błędne wyniki są odrzucane.",
      },
    ],
    screensTitle: "Ekrany aplikacji",
    screensLead: "Ekrany oznaczone jako niedostępne powstaną w kolejnych etapach — szczegóły w docs/ROADMAP.md.",
    groups: {
      start: "Start",
      account: "Konto",
      settings: "Ustawienia",
      planning: "Planowanie",
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
