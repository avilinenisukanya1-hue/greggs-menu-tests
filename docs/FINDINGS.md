# Findings – Greggs.com Menu

Exploratory session on **29 October 2026** against `https://www.greggs.com/menu` (Chrome, macOS, 1080px and 1440px wide), before and while writing the automated suite. Every defect below is reproduced by an automated test marked `test.fail()` – the build stays green while the defect exists and flags *"unexpectedly passed"* the day it is fixed.

Severity reflects user impact: **High** = blocks a group of users from a task; **Medium** = degrades a task or misleads; **Low** = friction.

| ID | Title | Area | Severity | Test |
|---|---|---|---|---|
| GM-001 | Calorie slider max is below the highest-calorie product | Functional / data | Medium | `advanced-filters.spec.ts` |
| GM-002 | Selected category pill state not exposed to assistive tech | Accessibility | Medium | `keyboard-and-semantics.spec.ts` |
| GM-003 | Calorie slider has no accessible name | Accessibility | High | `keyboard-and-semantics.spec.ts`, `axe.spec.ts` |
| GM-004 | Filter dialog close button has no accessible name | Accessibility | High | `keyboard-and-semantics.spec.ts`, `axe.spec.ts` |
| GM-005 | Colour-contrast failures | Accessibility | Medium | `axe.spec.ts` |
| GM-006 | Category selection breaks the browser Back button | UX / navigation | Low | `category-filter.spec.ts` |
| GM-007 | Nutrition table has no header cells | Accessibility | Medium | `keyboard-and-semantics.spec.ts` |

---

### GM-001 · Calorie slider max (4,000 kcal) is below the highest-calorie product
**Steps:** Menu → *Filter results* → drag the Calories slider down, then back to the far right → *Apply filters*.
**Expected:** Slider at maximum = no calorie limit; all 143 products shown.
**Actual:** 142 products. *6 Slice Pepperoni Pizza with Hot Honey Pizza Box* (API: 4,012 kcal) disappears. The slider's `max` is hard-coded to `4000` while the data goes higher.
**Impact:** A customer browsing sharing boxes can't find one of them even though they set no meaningful limit. Will recur whenever a larger product is added.
**Suggested fix:** Derive `max` from the data (round up), or treat the maximum position as "no limit".

### GM-002 · Selected category pill is not exposed to assistive technology
**Actual:** The active category is shown only by a sliding background element (`[data-test-active]`). The pill `<button>`s carry no `aria-pressed`, `aria-current` or `aria-selected`, so a screen reader announces every pill identically.
**WCAG:** 4.1.2 Name, Role, Value (A).
**Suggested fix:** `aria-pressed="true|false"` on the toggle buttons (or a `tablist` pattern with `aria-selected`).

### GM-003 · Calorie range slider has no accessible name
**Actual:** `<input type="range" min="0" max="4000" step="10">` has no `<label>`, `aria-label` or `aria-labelledby`; axe rule `label` (critical). Its current value is also not announced (`aria-valuetext` absent).
**WCAG:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value (A).
**Suggested fix:** `aria-label="Maximum calories"` and `aria-valuetext="Up to 300 kcal"`.

### GM-004 · Filter dialog close (X) button has no accessible name
**Actual:** Icon-only `<button type="button" autofocus>` with no text or `aria-label`; axe rule `button-name` (critical). Because it has `autofocus`, it's the first thing a screen-reader user lands on when the dialog opens – announced only as "button".
**WCAG:** 4.1.2 (A).
**Suggested fix:** `aria-label="Close filters"`.

### GM-005 · Colour-contrast failures
**Actual (axe `color-contrast`, serious):**
- Menu page "Delivery" promo heading – white `#ffffff` on light blue `#4dabe9`, **2.52:1** (large text needs 3:1).
- Filter dialog – calorie slider value label ("4000").
- Product page – one text span (see attached axe JSON in the report).
**WCAG:** 1.4.3 Contrast (Minimum) (AA).

### GM-006 · Category changes replace browser history
**Steps:** Menu → *Breakfast* → *Hot Food* → browser **Back**.
**Expected:** Returns to *Breakfast*.
**Actual:** The URL updates (`?category=hot-food`) but via `history.replaceState`; `history.length` is unchanged, so Back leaves the menu entirely. Inconsistent – the category *is* in the URL and deep links work, so users reasonably expect Back to work too.
**Suggested fix:** `router.push` instead of `router.replace` for category changes.

### GM-007 · Nutrition table has no header cells
**Actual:** The product-page nutrition `<table>` is built from `<td>`s only – the "Per 100g" / "Per portion" column headers and the nutrient names are not `<th>`, so screen readers can't announce which column a value belongs to. axe doesn't flag this (it treats it as a layout table), so a targeted test covers it.
**WCAG:** 1.3.1 Info and Relationships (A).
**Suggested fix:** `<th scope="col">` for the header row, `<th scope="row">` for nutrient names, and a `<caption>`.

---

## Observations (not raised as defects)

- **kJ rounding drift between page and API.** Sausage Roll: page shows 1,457 kJ per portion (derived from 1,415 kJ/100g × 103g); the API stores 1,446 kJ. Within 1% and both defensible roundings, but two sources disagree on a regulated label value. The consistency test tolerates ≤2% and records any drift as an annotation.
- **Search matches product names only.** "vegan" returns 1 product though 3 descriptions mention vegan. Likely intentional, but a dietary keyword search would arguably serve users better. The suite encodes the observed behaviour (name, ordered words, case-insensitive) as its oracle.
- **Advanced filters aren't in the URL.** Category is shareable via `?category=`; allergen and calorie filters are lost on reload/share.
- **Unknown `?category=` values** fall back gracefully to the full menu (tested).
- **Unknown product URLs** correctly return HTTP 404 (tested).
- **Data quality looked good** on the day: 143 products, no duplicates, no unpublished/hidden leakage, every product has an image, description, and complete front-of-pack nutrients. UI and API agreed product-for-product.
