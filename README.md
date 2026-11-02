# Greggs Menu Tests

Automated tests for the Menu section of [greggs.com](https://www.greggs.com/menu), written with Playwright and TypeScript.

- Latest test report (GitHub Pages): https://avilinenisukanya1-hue.github.io/greggs-menu-tests/
- Latest performance report: https://avilinenisukanya1-hue.github.io/greggs-menu-tests/perf/
- Defects found: [docs/FINDINGS.md](docs/FINDINGS.md)
- Test plan: [docs/TEST_PLAN.md](docs/TEST_PLAN.md)
- Summary of the last local run: [reports/SUMMARY.md](reports/SUMMARY.md) and [reports/perf/SUMMARY.md](reports/perf/SUMMARY.md)

## What I tested

The suite has 119 tests and covers the five areas in the brief.

- Functional: menu page loads, category filters (including deep links, reload and Back), search, the allergen and calorie filters, and navigation from a product card to its detail page.
- Data consistency: the menu API that feeds the page is checked against a schema and some basic data rules (for example, saturated fat should never be more than total fat). The products, names, calories and allergens shown on the page are then compared with the API.
- Accessibility: axe-core scans against WCAG 2.2 AA, plus keyboard checks (tabbing to filters and cards, opening and closing the filter dialog) and heading structure.
- Responsiveness: layout checks at 320, 390, 700, 1024 and 1440px wide, and the main journeys on an Android (Pixel 7) and iPhone (iPhone 14) profile.
- Performance: load time, LCP, CLS and TBT for the menu and a product page, plus image lazy-loading and image size.

I found 13 defects. The most important ones:

- The calorie slider stops at 4000 kcal, but one pizza box is 4012 kcal. Because the slider limit is always applied, that product disappears from search and from every allergen filter, not only when the slider is used.
- The calorie slider and the filter dialog's close button have no accessible name, so screen reader users can't tell what they are.
- The product page scrolls sideways on a 320px screen.
- The menu page layout shifts when the product grid loads (CLS about 0.13, above the 0.1 target).

Full details, with steps to reproduce, are in [docs/FINDINGS.md](docs/FINDINGS.md).

## Why I chose this approach

The menu changes often (seasonal items come and go), so I didn't hard-code product lists or counts. The tests read the same API response the menu page loads and work out the expected result from it. That way the tests only need updating when the behaviour changes, not when the menu does.

I spent the most effort on the allergen filter, because a bug there could affect someone's health. Every allergen is checked against every product, in both directions: nothing containing the allergen should be shown, and nothing safe should be hidden.

Before writing any tests I explored the site by hand in the browser. That is where most of the defects came from. It also showed me that the site has its own `data-test` attributes, which I used as selectors because they are more stable than CSS classes.

Each known defect has a test that checks the correct behaviour and is marked as an expected failure (`test.fail()`) with its defect ID. The build stays green while the defect exists. When Greggs fixes it, Playwright reports the test as "unexpectedly passed", so it is easy to spot and turn into a normal regression test.

I used Playwright because it runs both Chromium and WebKit, has good device emulation, and makes it easy to capture network responses, which the API comparisons rely on.

## How to run the tests

You need Node 20 or later.

```bash
npm ci
npm run install:browsers

npm test            # main suite: functional, data, accessibility, responsive, mobile
npm run test:perf   # performance tests (run separately, see Limitations)
```

Other commands:

```bash
npm run test:smoke        # quick smoke tests only
npm run test:a11y         # accessibility only
npm run report            # open the HTML report from the last run
npm run summary           # write reports/SUMMARY.md from the last run
npx playwright test --ui  # interactive mode
```

## Test reports

Each run writes an HTML report, JUnit XML and a JSON file to `reports/` (performance results go to `reports/perf/`). `npm run summary` turns the results into a short readable summary.

The tests also run in GitHub Actions on every push and once a day. Each run uploads the reports as build artifacts and publishes the HTML reports to GitHub Pages:

- Main suite: https://avilinenisukanya1-hue.github.io/greggs-menu-tests/
- Performance: https://avilinenisukanya1-hue.github.io/greggs-menu-tests/perf/

In the report, tests for known defects are listed as expected failures, each with its defect ID.

## Assumptions

- The tests run against the live site, as there is no public test environment. They only read pages. Nothing is ordered or submitted, and the number of parallel tests is kept low.
- The menu API response is treated as the source of truth for what the page should show. The API also has its own checks, in case the data itself is wrong.
- Search behaviour was worked out by trying it: it matches product names only, is not case-sensitive, and the words must appear in order.
- The cookie banner is set to "necessary cookies only" before each test, so it doesn't get in the way.
- UK locale and time zone.

## Limitations

- Performance tests run on their own, with a single worker, because timings taken while the other tests are hitting the site aren't reliable. They are lab measurements from one machine, so they show regressions but are not real-user data. In GitHub Actions the performance results are recorded but don't fail the build: the hosted runners are small machines in the US, so their numbers (especially TBT) aren't comparable with the budgets, which were set on a local machine in the UK.
- Automated accessibility checks only catch part of WCAG. Screen reader output and 400% zoom were only checked briefly by hand.
- Product detail pages are sampled (about 15 of 143) to keep the run time reasonable.
- The live site has bot protection, which can sometimes block CI runners.
- Third-party scripts (cookie banner, reCAPTCHA) are left out of the accessibility scans and error checks.
- No visual screenshot comparison, because the menu content changes too often for it to be useful.
- Firefox is not included, but can be added in `playwright.config.ts`.

## What I would add next

- Lighthouse CI to track performance and SEO over time
- Screen reader tests for the filter dialog
- A Firefox run and a 400% zoom check
- Running the smoke tests on a schedule as a simple uptime monitor
