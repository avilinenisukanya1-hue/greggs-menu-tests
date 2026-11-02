# Findings - Greggs.com Menu

Exploratory session on **29 October 2026** against `https://www.greggs.com/menu` (Chrome, macOS, 1080px and 1440px wide), before and while writing the automated suite. GM-008 to GM-012 were found on **2 November 2026** when triaging the first full automated run; each was confirmed by hand in the browser before being logged. Every defect below is reproduced by an automated test marked `test.fail()` - the build stays green while the defect exists and flags *"unexpectedly passed"* the day it is fixed.

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
| GM-008 | Product page scrolls horizontally at 320px | Accessibility / responsive | Medium | `layout.spec.ts` |
| GM-009 | Product thumbnails up to 860KB | Performance | Medium | `page-performance.spec.ts` |
| GM-010 | Product names carry trailing whitespace | Data quality | Low | `api-contract.spec.ts` |
| GM-011 | Products with `sortOrder: null` | Data quality | Low | `api-contract.spec.ts` |
| GM-012 | Images served as `application/octet-stream` | Performance / platform | Low | `api-contract.spec.ts` |
| GM-013 | Menu page layout shift (CLS ~0.13) | Performance | Medium | `page-performance.spec.ts` |

---

### GM-001: Calorie slider max (4,000 kcal) is below the highest-calorie product
**Steps:** Menu -> *Filter results* -> drag the Calories slider down, then back to the far right -> *Apply filters*.
**Expected:** Slider at maximum = no calorie limit; all 143 products shown.
**Actual:** 142 products. *6 Slice Pepperoni Pizza with Hot Honey Pizza Box* (API: 4,012 kcal) disappears. The slider's `max` is hard-coded to `4000` while the data goes higher.
**Impact:** A customer browsing sharing boxes can't find one of them even though they set no meaningful limit. Will recur whenever a larger product is added. It isn't limited to the slider: the 4,000 kcal ceiling is applied even when untouched, so the pizza box is missing from **every allergen-filtered result** and from **search results** (searching "pizza" returns 15 of the 16 pizza products). It only appears on the unfiltered menu.
**Suggested fix:** Derive `max` from the data (round up), or treat the maximum position as "no limit".

### GM-002: Selected category pill is not exposed to assistive technology
**Actual:** The active category is shown only by a sliding background element (`[data-test-active]`). The pill `<button>`s carry no `aria-pressed`, `aria-current` or `aria-selected`, so a screen reader announces every pill identically.
**WCAG:** 4.1.2 Name, Role, Value (A).
**Suggested fix:** `aria-pressed="true|false"` on the toggle buttons (or a `tablist` pattern with `aria-selected`).

### GM-003: Calorie range slider has no accessible name
**Actual:** `<input type="range" min="0" max="4000" step="10">` has no `<label>`, `aria-label` or `aria-labelledby`; axe rule `label` (critical). Its current value is also not announced (`aria-valuetext` absent).
**WCAG:** 1.3.1 Info and Relationships, 4.1.2 Name, Role, Value (A).
**Suggested fix:** `aria-label="Maximum calories"` and `aria-valuetext="Up to 300 kcal"`.

### GM-004: Filter dialog close (X) button has no accessible name
**Actual:** Icon-only `<button type="button" autofocus>` with no text or `aria-label`; axe rule `button-name` (critical). Because it has `autofocus`, it's the first thing a screen-reader user lands on when the dialog opens - announced only as "button".
**WCAG:** 4.1.2 (A).
**Suggested fix:** `aria-label="Close filters"`.

### GM-005: Colour-contrast failures
**Actual (axe `color-contrast`, serious):**
- Menu page "Delivery" promo heading - white `#ffffff` on light blue `#4dabe9`, **2.52:1** (large text needs 3:1).
- Filter dialog - calorie slider value label ("4000").
- Product page - one text span (see attached axe JSON in the report).
**WCAG:** 1.4.3 Contrast (Minimum) (AA).

### GM-006: Category changes replace browser history
**Steps:** Menu -> *Breakfast* -> *Hot Food* -> browser **Back**.
**Expected:** Returns to *Breakfast*.
**Actual:** The URL updates (`?category=hot-food`) but via `history.replaceState`; `history.length` is unchanged, so Back leaves the menu entirely. Inconsistent - the category *is* in the URL and deep links work, so users reasonably expect Back to work too.
**Suggested fix:** `router.push` instead of `router.replace` for category changes.

### GM-007: Nutrition table has no header cells
**Actual:** The product-page nutrition `<table>` is built from `<td>`s only - the "Per 100g" / "Per portion" column headers and the nutrient names are not `<th>`, so screen readers can't announce which column a value belongs to. axe doesn't flag this (it treats it as a layout table), so a targeted test covers it.
**WCAG:** 1.3.1 Info and Relationships (A).
**Suggested fix:** `<th scope="col">` for the header row, `<th scope="row">` for nutrient names, and a `<caption>`.

### GM-008: Product page scrolls horizontally at 320px
**Steps:** Open `/menu/product/sausage-roll-1000446` at 320px wide (or 1280px at 400% zoom).
**Expected:** Content reflows; no horizontal scrolling.
**Actual:** The page scrolls 68px sideways. The cause is a decorative yellow SVG (`svg.text-brand-primary-yellow.my-15`) with a fixed width that extends to 388px and isn't clipped by any ancestor. Viewports 388px and wider are unaffected.
**WCAG:** 1.4.10 Reflow (AA).
**Suggested fix:** `max-width: 100%` on the SVG, or `overflow-x: clip` on its container.

### GM-009: Product thumbnails are up to 860KB
**Actual:** Grid thumbnails are 512px PNGs (some larger) displayed at about 190px. Of a 1-in-10 sample, the heaviest were *6 Slice Pepperoni Pizza with Hot Honey Pizza Box* 860KB, *Large Salted Caramel Latte* 740KB and *Spooky Bun (4 pack)* 700KB. A cold load of `/menu` transfers about 5MB, most of it images.
**Impact:** Slow, data-hungry browsing on mobile networks, which is where the menu is mostly used. Lazy loading softens the first paint but not the cost of scrolling the menu.
**Suggested fix:** Serve WebP/AVIF at the displayed size via `srcset`, or put the images behind an image CDN that resizes them.

### GM-010: Product names carry trailing whitespace
**Actual:** 11 products in the menu data have a trailing space in `articleName` (e.g. `"Tuna Crunch Roll "`, `"Hot Chocolate Brownies "`). It carries through to the card `<h3>`, the image `alt` text and the product page title.
**Impact:** Mostly invisible, but it breaks exact-match lookups (search indexing, analytics, any code that compares names) and suggests the content entry process doesn't trim input.
**Suggested fix:** Trim on save in the CMS and clean the existing records.

### GM-011: Products with `sortOrder: null`
**Actual:** *Apple & Strawberry Fruit Pot* (2001206) and *Pineapple Fruit Pot* (2001659) have `sortOrder: null`; every other product has an integer.
**Impact:** Their position in the Sweet Treats grid depends on how the front end handles null in its sort, so it can change between releases without anyone touching the data.
**Suggested fix:** Make `sortOrder` required in the CMS, and backfill these two.

### GM-012: Product images served as `application/octet-stream`
**Actual:** `articles.greggs.co.uk/images/*.png` responses carry `Content-Type: application/octet-stream`. Browsers currently sniff the PNG signature and render them anyway.
**Impact:** Low today. Images would break if `X-Content-Type-Options: nosniff` were ever added, and some CDNs/proxies won't apply image optimisation or caching rules to a non-image type.
**Suggested fix:** Set the correct content type on upload to the storage bucket.

### GM-013: Menu page layout shift (CLS ~0.13)
**Steps:** Cold-load `/menu` at 1440x900 and record `layout-shift` entries (or use the Performance panel in DevTools).
**Expected:** CLS <= 0.1 (Core Web Vitals "good").
**Actual:** One shift of about 0.12, 1-3s after load, on every run (median 0.13 over 3 cold loads). The product grid is rendered client-side with no space reserved for it, so the blocks below it (the *Download the app* promo, the yellow divider and the *Shop Finder* panel) appear in the first viewport and are then pushed off-screen when the grid arrives.
**Note:** Earlier runs measured about 0.01 because dismissing the cookie banner counted as user input, and shifts within 500ms of input are excluded from CLS. Real first-time visitors see the banner too, but returning visitors don't, and the shift is still visible behind it.
**Impact:** Content jumps under the user's eye or finger, and the page fails a Core Web Vitals metric used in search ranking.
**Suggested fix:** Server-render the first rows of the grid, or reserve the grid's height (a skeleton or `min-height`) until it hydrates.

---

## Observations (not raised as defects)

- **kJ rounding drift between page and API.** Sausage Roll: page shows 1,457 kJ per portion (derived from 1,415 kJ/100g x 103g); the API stores 1,446 kJ. Within 1% and both defensible roundings, but two sources disagree on a regulated label value. The consistency test tolerates <=2% and records any drift as an annotation.
- **Search matches product names only.** "vegan" returns 1 product though 3 descriptions mention vegan. Likely intentional, but a dietary keyword search would arguably serve users better. The suite encodes the observed behaviour (name, ordered words, case-insensitive) as its oracle.
- **Advanced filters aren't in the URL.** Category is shareable via `?category=`; allergen and calorie filters are lost on reload/share.
- **Unknown `?category=` values** fall back gracefully to the full menu (tested).
- **Unknown product URLs** correctly return HTTP 404 (tested).
- **Energy figures on very small drinks don't reconcile.** *Large Americano* is 11 kcal / 53 kJ and *Large Tea* 12 kcal / 57 kJ in the data (53 kJ is about 12.7 kcal). At these values a 1 kcal rounding step is already about 10%, so the checks use a 5% **and** 10 kJ tolerance rather than flagging them. Worth confirming with the nutrition team which figure is authoritative.
- **"Clear all" in the filter modal** clears immediately but leaves the modal open with *Apply filters* disabled. It works, but it's an odd interaction: users have to close the modal themselves to see the result.
- **Otherwise data quality was good** on the day: 143 products, no duplicates, no unpublished/hidden leakage, every product has an image, a description and complete front-of-pack nutrients. UI and API agreed product-for-product.
