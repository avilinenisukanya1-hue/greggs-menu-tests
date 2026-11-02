import { test, expect } from '../../src/fixtures';
import { scanA11y, expectNoNewViolations } from '../../src/a11y';
import { SAUSAGE_ROLL, categoryBySlug } from '../../src/data/categories';

/**
 * Automated WCAG 2.2 AA scans. Policy:
 *   - Any violation NOT already logged in known-defects.ts fails the test (regression gate).
 *   - Known violations are attached + annotated so they stay visible in the report.
 * axe only detects a subset of WCAG issues - keyboard-and-semantics.spec.ts covers more.
 */
test.describe('Accessibility - axe-core scans (WCAG 2.2 AA)', () => {
  test('menu - "All" view', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto();
    expectNoNewViolations(await scanA11y(page, testInfo));
  });

  test('menu - single category view', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto(categoryBySlug('hot-food'));
    expectNoNewViolations(await scanA11y(page, testInfo));
  });

  test('menu - search empty state', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto();
    await menuPage.search('zzqxjv');
    await expect(menuPage.emptyState).toBeVisible();
    expectNoNewViolations(await scanA11y(page, testInfo));
  });

  test('filters dialog', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto();
    await menuPage.openFilters();
    expectNoNewViolations(await scanA11y(page, testInfo, 'dialog[open]'));
  });

  test('product detail page', async ({ page, productPage }, testInfo) => {
    await productPage.goto(SAUSAGE_ROLL.slug);
    expectNoNewViolations(await scanA11y(page, testInfo));
  });
});
