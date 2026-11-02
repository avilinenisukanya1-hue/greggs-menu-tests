# Greggs.com Menu – Automated Quality Suite

Playwright + TypeScript suite covering the **Menu** section of [greggs.com](https://www.greggs.com/menu): functional behaviour, data consistency, accessibility, responsiveness and performance.

**119 tests · 6 Playwright projects · 13 defects found** (see [`docs/FINDINGS.md`](docs/FINDINGS.md))

| Doc | What's in it |
|---|---|
| [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) | Scope, risk analysis, full coverage matrix, what's out of scope |
| [`docs/FINDINGS.md`](docs/FINDINGS.md) | Defects with steps, evidence, WCAG mapping and suggested fixes |
| [`reports/SUMMARY.md`](reports/SUMMARY.md) · [`reports/perf/SUMMARY.md`](reports/perf/SUMMARY.md) | Results of the latest full run (HTML report is generated per run / published by CI) |

---

## What I tested

| Area | Highlights |
|---|---|
| **Functional** | Page rendering & metadata · category pills (every category, deep links, "All", invalid slugs, reload, Back) · search (case, whitespace, multi-word, empty state, XSS) · **allergen filter for all 11 allergens** · calorie filter · product cards → detail pages · 404 handling |
| **Data consistency** | Menu API contract (Zod schema) · data quality rules (kJ ≈ kcal × 4.184, saturates ≤ fat, sugar ≤ carbs, no duplicates/unpublished/hidden items, every image resolves) · **UI ⇄ API**: listing matches product-for-product, products sit in the right section, detail pages match calories, kJ, portion and allergens |
| **Accessibility** | axe-core WCAG 2.2 AA on 5 page states · keyboard operation (Tab/Enter, focus ring, dialog focus trap/Escape/return) · heading structure · accessible names · table semantics |
| **Responsive** | 320 / 390 / 700 / 1024 / 1440px – no horizontal scroll (WCAG 1.4.10 reflow), correct 2/3/4-column grid, usable pill bar, 24×24px targets (WCAG 2.5.8) · smoke journeys on Pixel 7 (Chromium) and iPhone 14 (WebKit) |
| **Performance** | Median of 3 cold loads: TTFB, DCL, load, **LCP, CLS, TBT** with budgets · menu API latency · lazy-loading of images · client-side category switch speed · thumbnail weight |

## Why this approach

**1. The live API is the oracle, not hard-coded data.** Greggs' menu is seasonal – on the day I built this it included the Festive Bake and Candy Cane hot chocolate. A suite that asserts "Breakfast has 19 items" breaks within weeks. Instead, a worker-scoped fixture captures the exact `articles/masters` response the page itself requests, validates it, and every test derives its expectation from it. Tests only change when **behaviour** changes.

**2. Depth follows risk.** The allergen filter is the one place a bug can hurt someone, so it gets exhaustive coverage: every allergen × every product, checked in both directions (nothing containing the allergen leaks through *and* nothing safe is wrongly hidden). Lower-risk areas get proportionate coverage.

**3. Explore first, then automate.** Before writing tests I mapped the DOM, the `data-test*` hooks, the Nuxt data flow and the API in a real browser. That's where the [findings](docs/FINDINGS.md) came from, and why selectors use the site's own `data-test-card`, `data-test-filter`, `data-test="filterButton"` hooks and ARIA roles rather than brittle CSS.

**4. Known defects are tests, not comments.** Each defect is a test that asserts the *correct* behaviour, marked `test.fail()` with an ID. The build stays green while the bug exists; when Greggs fixes it, Playwright reports *"unexpectedly passed"* and the summary lists it for clean-up – at which point it becomes a regression guard. axe violations already logged are annotated, but any **new** violation fails the build.

**5. Why Playwright.** Cross-engine (Chromium + WebKit for real iOS rendering), first-class network interception (needed to capture the oracle), built-in device emulation, `addLocatorHandler` for the cookie banner, auto-waiting that avoids sleeps, and traces for debugging CI failures. TypeScript + Zod give a typed, validated contract for the API.

### Project structure

```
src/
  fixtures.ts            test.extend: page objects, cookie-banner handler, worker-scoped API snapshot
  pages/                 MenuPage, ProductPage (page objects)
  api/menu-api.ts        Zod schema + helpers (kcal, allergens…)
  data/categories.ts     category ids/slugs/labels, allergen list, anchor products
  data/known-defects.ts  defect registry (GM-001..GM-013) + knownDefect() marker
  a11y.ts, perf.ts       axe wrapper, Web Vitals collection & budgets
  cookie-banner.ts       OneTrust consent preset + "Reject all" fallback handler
tests/
  functional/  data/  accessibility/  responsive/  performance/
playwright.config.ts            functional / a11y / responsive / mobile projects
playwright.perf.config.ts       performance project, run on its own
scripts/summarise-results.mjs   JSON report → SUMMARY.md (+ GitHub job summary)
.github/workflows/menu-tests.yml  CI: push/PR/daily schedule, artifacts, report on GitHub Pages
```

## How to run

Requires **Node 20+** (`.nvmrc` pins 22).

```bash
npm ci
npm run install:browsers      # Chromium + WebKit (with OS deps)

npm test                      # functional, data, a11y, responsive, mobile (113 tests, ~4 min)
npm run test:smoke            # @smoke journeys only
npm run test:functional       # functional + data consistency
npm run test:a11y
npm run test:responsive
npm run test:mobile           # Pixel 7 + iPhone 14
npm run test:perf             # separate config, 1 worker - see below

npm run summary               # write reports/SUMMARY.md from the last run
npm run report                # open the HTML report
npm run report:perf           # perf run has its own report in reports/perf/
```

Useful options:

```bash
npx playwright test --ui                          # interactive runner
npx playwright test -g "No Milk"                  # single test by name
BASE_URL=https://staging.example npm test         # point at another environment
PERF_RUNS=5 BUDGET_LCP=2500 npm run test:perf     # stricter perf budgets
```

### Reports

Each run writes to `reports/`:

- `html/` – Playwright HTML report (traces, screenshots & video on failure; axe JSON and perf metrics attached to their tests)
- `junit.xml` – for any CI dashboard
- `results.json` → `SUMMARY.md` – pass / known-defect / fail counts per project, defects exercised, and every measurement (Web Vitals, API latency, lazy-loading ratio, kJ drift)

In GitHub Actions the summary appears on the run page, the full report is uploaded as an artifact, and on `main` it is published to **GitHub Pages** (enable *Settings → Pages → Source: GitHub Actions*). A daily scheduled run catches content changes that ship without a code deploy.

## Assumptions

- **Production is the target.** There's no public staging environment, so the suite runs read-only against `www.greggs.com`, with low worker counts and batched image checks to keep traffic modest. Nothing is ordered, submitted or signed into.
- **The `articles/masters` response is the source of truth** for what the menu should show. If the API itself were wrong, UI ⇄ API checks wouldn't catch it – which is why the API also has its own contract and data-quality tests.
- **Search semantics** were inferred by exploration (product name only, words in order, case-insensitive) and encoded as the oracle. If that is not the intended behaviour, only the oracle function needs to change.
- **Cookie banner** is suppressed by pre-setting OneTrust's consent cookies to *necessary only* (the same state as *Reject all*), with a locator handler as a fallback. OneTrust loads late, and a banner appearing mid-test steals keyboard focus. Behaviour with analytics cookies accepted isn't covered.
- **UK locale** (`en-GB`, `Europe/London`).

## Limitations

- **Performance runs on its own.** `npm test` doesn't include the perf specs: timings measured while ~100 functional tests load the same site are noise. `npm run test:perf` uses `playwright.perf.config.ts` (1 worker, no retries) and CI runs it as a separate step.
- **Lab, not field, performance.** Budgets are measured from a CI runner/laptop on a cold cache; they indicate regressions, not real-user Core Web Vitals (use CrUX/RUM for that). Perf assertions are *soft*, so one slow metric doesn't hide the others.
- **Automated accessibility is partial.** axe only detects a subset of WCAG issues. Keyboard and semantic tests extend that, but screen-reader announcement quality, cognitive load and zoom-to-400% were checked only lightly by hand.
- **Detail pages are sampled** (first + last product per category + highest-calorie items, ~15 pages) to keep run time reasonable. Run-time vs coverage can be tuned in `sample()` in `tests/data/ui-api-consistency.spec.ts`.
- **Bot protection.** Production CDNs can challenge datacenter IPs. If CI runs are blocked, run locally or from a self-hosted runner.
- **Third parties** (OneTrust, reCAPTCHA, Sentry) are excluded from axe scans and error checks – they're not Greggs-owned code.
- **No visual regression** – the menu changes daily, so pixel snapshots would be noise. Layout is verified geometrically instead.
- **Firefox** isn't in the default matrix (one line to add in `playwright.config.ts`).

## What I'd add next

- Lighthouse CI for a fuller perf/SEO/best-practices audit and trend history
- Contract test on the Nuxt `_payload.json` SSR data, to catch SSR/CSR drift
- Synthetic monitoring: run `@smoke` every 15 minutes and alert on failure
- Screen-reader smoke with Guidepup (VoiceOver/NVDA) for the filter dialog
- Firefox project and a 400% zoom reflow check
