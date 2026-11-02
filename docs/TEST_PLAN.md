# Test Plan - Greggs.com Menu

## 1. System under test

| Surface | URL | Notes |
|---|---|---|
| Menu listing | `/menu`, `/menu?category=<slug>` | Nuxt SSR + client hydration. 6 category sections, pill filters, search, "Filter results" modal (allergens, calories, categories). |
| Product detail | `/menu/product/<name-slug>-<articleCode>` | Title, image, description, front-of-pack nutrition, nutrition table, allergens. |
| Menu API | `production-digital.greggs.co.uk/api/v1.0/articles/masters?ExcludeUnpublished=true&ExcludeDuplicates=true&ExcludeHiddenFromMenu=true` | JSON array the grid is built from. Used as the **test oracle**. |

## 2. Approach

**Oracle-driven, not snapshot-driven.** The menu is seasonal (e.g. the Festive Bake, Candy Cane hot chocolate on 29 Oct 2026), so hard-coded product lists or counts would rot within weeks. Every functional assertion derives its expected result from the live API response that the page itself requested, then checks the UI agrees. A test only needs changing when *behaviour* changes, not when the menu does.

**Risk-based depth.**

| Risk | Why it matters | Depth |
|---|---|---|
| Allergen filter shows a product containing the excluded allergen | Customer safety; UK allergen-information obligations | **Every** allergen x **every** product, both directions (leaks *and* wrongful hiding) |
| Allergens / calories on detail page differ from source data | Safety + regulatory labelling | Sampled detail pages, exact match |
| Category / search shows wrong set | Core browsing journey | Every category; set equality vs API |
| Inaccessible controls | Excludes disabled users; WCAG 2.2 AA is the accepted UK benchmark | axe on every state + manual keyboard/semantic checks |
| Broken layout on phones | Menu is typically browsed on phones, on the go | 5 breakpoints, 2 real device profiles |
| Slow menu | Conversion; Core Web Vitals | Median-of-3 cold loads with budgets |

## 3. Coverage matrix

| Area | Spec | What is asserted |
|---|---|---|
| Rendering | `functional/menu-page.spec.ts` | 200, title/meta/canonical/lang, pill order, section order, card completeness (title, alt, href format), no duplicates, all images load, no first-party JS errors / 4xx-5xx |
| Category filter | `functional/category-filter.spec.ts` | Each category: URL, only its section, exact product set vs API. Deep links, "All", unknown slug fallback, highlight position, reload persistence, Back (GM-006) |
| Search | `functional/search.spec.ts` | Result set = name-match oracle for 6 queries (case, whitespace, multi-word), empty state + chip, clear, combine with category, XSS-safe |
| Advanced filters | `functional/advanced-filters.spec.ts` | All 11 allergens vs API, combined exclusions, badge count, Clear all, calorie ceiling, slider range (GM-001), modal category counts |
| Navigation | `functional/product-navigation.spec.ts` | Card -> detail, first product of each category, Back keeps category, anchor products by direct link, 404 |
| API contract | `data/api-contract.spec.ts` | Status/content-type, Zod schema, no unpublished/hidden/dupes, categories, nutrients present, kJ~kcalx4.184, sat<=fat, sugar<=carbs, clean names (GM-010), sortOrder present (GM-011), descriptions, every thumbnail serves an image (GM-012) |
| UI vs API | `data/ui-api-consistency.spec.ts` | Listing = API (codes + names), products in correct section, detail pages match name/kcal/kJ/portion/allergens |
| Accessibility | `accessibility/axe.spec.ts` | WCAG 2.2 AA axe scan on 5 states; new violations fail, known ones annotated |
| Accessibility | `accessibility/keyboard-and-semantics.spec.ts` | Tab/Enter on pills, card focus ring, dialog focus in/out + Escape, heading order, labelled search, GM-002/003/004/007 |
| Responsive | `responsive/layout.spec.ts` | 320-1440px: no horizontal scroll (WCAG 1.4.10), 2/3/4 columns, even cards, pill bar usable, product page fits (GM-008); 24x24 targets (WCAG 2.5.8) |
| Mobile devices | `mobile-android`, `mobile-ios` projects | `@smoke` journeys on Pixel 7 (Chromium) and iPhone 14 (WebKit) |
| Performance | `performance/page-performance.spec.ts` (own config, 1 worker) | TTFB/DCL/load/LCP/CLS/TBT budgets, API latency, lazy-loading, client-side category switch <1s, thumbnail weight (GM-009), CLS (GM-013) |

## 4. Out of scope (and why)

- **Ordering/checkout** (Click + Collect, delivery) - outside the Menu brief and would place real orders.
- **The Greggs app / Rewards** - separate product.
- **Visual regression snapshots** - content changes daily; pixel diffs would be noise. Layout is asserted geometrically instead.
- **Load testing** - inappropriate against a production site we don't own.
- **Firefox** - trivially added as a project; omitted to keep run time and production traffic modest.

## 5. Entry / exit

- **Entry:** site reachable; menu API returns >=50 products.
- **Exit (green build):** zero unexpected failures. Known defects may fail *as expected*; any known defect that starts passing is surfaced for clean-up.
