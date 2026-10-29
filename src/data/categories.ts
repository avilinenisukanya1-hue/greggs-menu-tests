/**
 * Static reference data for the Greggs menu.
 *
 * Category ids come from the `articleCategoryId` field returned by the menu API
 * (production-digital.greggs.co.uk/api/v1.0/articles/masters); the slug is the
 * value used in the `?category=` query string and the label is what the user sees
 * on the filter pills and section headings.
 *
 * Product counts are deliberately NOT hard-coded: the menu is seasonal, so every
 * count assertion is made against the live API response instead.
 */
export interface Category {
  id: number;
  label: string;
  slug: string;
}

export const CATEGORIES: readonly Category[] = [
  { id: 1, label: 'Breakfast', slug: 'breakfast' },
  { id: 2, label: 'Savouries & Bakes', slug: 'savouries-bakes' },
  { id: 3, label: 'Drinks & Snacks', slug: 'drinks-snacks' },
  { id: 4, label: 'Sandwiches & Salads', slug: 'sandwiches-salads' },
  { id: 5, label: 'Sweet Treats', slug: 'sweet-treats' },
  { id: 6, label: 'Hot Food', slug: 'hot-food' },
] as const;

/** The 14 UK regulated allergens are a superset; these are the ones the filter exposes. */
export const FILTERABLE_ALLERGENS = [
  'Soya',
  'Wheat',
  'Sulphites',
  'Eggs',
  'Milk',
  'Oats',
  'Barley',
  'Mustard',
  'Fish',
  'Crustaceans',
  'Nuts',
] as const;

export type Allergen = (typeof FILTERABLE_ALLERGENS)[number];

/** Long-standing core range items – used as stable anchors for product-page tests. */
export const ANCHOR_PRODUCTS = [
  { code: '1000446', name: 'Sausage Roll', slug: 'sausage-roll-1000446' },
  { code: '1000514', name: 'Steak Bake', slug: 'steak-bake-1000514' },
  { code: '1000516', name: 'Cheese & Onion Bake', slug: 'cheese-onion-bake-1000516' },
] as const;
