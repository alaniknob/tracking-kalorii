import { z } from "zod";
import { EU_ALLERGENS } from "@/features/allergens";
import { FOOD_GROUPS } from "@/features/preferences/diet-styles";
import { isEnergyConsistent } from "./completeness";
import { BASE_UNITS, PRODUCT_CATEGORIES, type Product } from "./types";

const grams = z.number().min(0).max(100);

export const nutritionPer100Schema = z
  .object({
    kcal: z.number().min(0).max(900),
    proteinG: grams,
    fatG: grams,
    carbohydratesG: grams,
    fiberG: grams.nullable(),
  })
  .refine((n) => n.proteinG + n.fatG + n.carbohydratesG + (n.fiberG ?? 0) <= 100.5, {
    error: "Suma makroskładników przekracza 100 g na 100 g/ml.",
  })
  .refine(isEnergyConsistent, { error: "Energia nie zgadza się z makroskładnikami (Atwater ±15%)." });

/**
 * Walidacja rekordu katalogu — ta sama dla danych demo, przyszłego importu CSV i dostawców danych.
 */
export const productSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(2).max(120),
    brand: z.string().min(1).max(80).nullable(),
    category: z.enum(PRODUCT_CATEGORIES),
    baseUnit: z.enum(BASE_UNITS),
    packageSize: z.number().positive().nullable(),
    gramsPerPiece: z.number().positive().max(5000).nullable(),
    densityGPerMl: z.number().min(0.2).max(3).nullable(),
    nutrition: nutritionPer100Schema.nullable(),
    ingredientsText: z.string().min(1).nullable(),
    allergens: z.object({
      ingredientsKnown: z.boolean(),
      declared: z.partialRecord(z.enum(EU_ALLERGENS), z.enum(["contains", "may_contain"])),
    }),
    foodGroups: z.array(z.enum(FOOD_GROUPS)),
    source: z.object({ name: z.string().min(2), url: z.url().nullable(), isDemo: z.boolean() }),
    updatedAt: z.iso.date(),
  })
  .refine((p) => !p.allergens.ingredientsKnown || p.ingredientsText !== null, {
    error: "Skład oznaczony jako znany wymaga tekstu składu.",
  }) satisfies z.ZodType<Product>;
