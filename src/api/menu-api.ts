import { z } from 'zod';

/**
 * The menu page is a Nuxt app that hydrates its product grid from this endpoint.
 * We never call it with hand-built parameters; tests capture the exact request the
 * page makes (see fixtures.ts) so we validate what real users actually receive.
 */
export const MENU_API_PATTERN = /\/api\/v1\.0\/articles\/masters/;

const NutrientSchema = z.object({
  name: z.string().min(1),
  value: z.number().nonnegative(),
  unitOfMeasure: z.string().min(1),
  percentageOfDailyIntake: z.number().nonnegative().nullable().optional(),
  valuePerHundredArticleSizeUnit: z.number().nonnegative().nullable().optional(),
});

const IngredientSchema = z.object({
  name: z.string().min(1),
  isAllergen: z.boolean(),
});

export const ArticleSchema = z
  .object({
    articleCode: z.string().regex(/^\d{7}$/, 'articleCode should be a 7-digit string'),
    // Validate without .trim(): a transform would hide the whitespace the data-quality spec checks for.
    articleName: z.string().regex(/\S/, 'articleName should not be blank'),
    isPublished: z.boolean(),
    isHiddenInMenu: z.boolean(),
    articleCategoryId: z.number().int().positive(),
    customerDescription: z.string().nullable(),
    menuDescription: z.string().nullable(),
    articleSize: z.object({ size: z.number().positive(), unitOfMeasure: z.string() }).nullable(),
    nutritionalValues: z.array(NutrientSchema),
    ingredients: z.array(IngredientSchema),
    imageUri: z.string().url(),
    thumbnailUri: z.string().url(),
    // Nullable so one bad record doesn't mask other contract breaks; data-quality spec checks it (GM-011).
    sortOrder: z.number().int().nullable(),
  })
  // Unknown/extra fields are allowed - we only pin what the UI depends on.
  .passthrough();

export const MenuResponseSchema = z.array(ArticleSchema);

export type Article = z.infer<typeof ArticleSchema>;

// ---------- helpers ----------

export function nutrient(article: Article, name: string): number | undefined {
  return article.nutritionalValues.find((n) => n.name === name)?.value;
}

export function kcal(article: Article): number {
  const v = nutrient(article, 'Calories');
  if (v === undefined) throw new Error(`No Calories value for ${article.articleCode}`);
  return v;
}

export function allergens(article: Article): string[] {
  return article.ingredients.filter((i) => i.isAllergen).map((i) => i.name);
}

/**
 * Energy figures disagree beyond what rounding explains. Relative tolerance alone is
 * meaningless for drinks of ~10 kcal (1 kcal of rounding is already ~10%), so a gap
 * must exceed BOTH the relative tolerance and an absolute 10 kJ (~2.4 kcal) floor.
 */
export function energyMismatch(a: number, b: number, relTolerance: number): boolean {
  const diff = Math.abs(a - b);
  return diff > 10 && diff / Math.max(a, b) > relTolerance;
}

export function hasAllergen(article: Article, allergen: string): boolean {
  return allergens(article).some((a) => a.toLowerCase() === allergen.toLowerCase());
}
