import { test, expect } from '../../src/fixtures';
import { scanA11y, newViolations } from '../../src/a11y';
import { CATEGORIES } from '../../src/data/categories';

/**
 * Automated WCAG 2.2 AA scans. Policy:
 *   - Any violation NOT already logged in known-defects.ts fails the test (regression gate).
 *   - Known violations are attached + annotated so they stay visible in the report.
 * Automated rules detect only a subset of WCAG issues – keyboard-and-semantics.spec.ts covers more.
 */
test.describe('Accessibility – axe-core scans (WCAG 2.2 AA)', () => {
  test('menu – "All" view', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto();
    const v = await scanA11y(page, testInfo);
    expect(newViolations(v), JSON.stringify(newViolations(v), null, 2)).toEqual([]);
  });

  test('menu – single category view', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto(CATEGORIES[5]);
    const v = await scanA11y(page, testInfo);
    expect(newViolations(v), JSON.stringify(newViolations(v), null, 2)).toEqual([]);
  });

  test('menu – search empty state', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto();
    await menuPage.search('zzqxjv');
    await expect(menuPage.emptyState).toBeVisible();
    const v = await scanA11y(page, testInfo);
    expect(newViolations(v), JSON.stringify(newViolations(v), null, 2)).toEqual([]);
  });

  test('filters dialog', async ({ page, menuPage }, testInfo) => {
    await menuPage.goto();
    await menuPage.openFilters();
    const v = await scanA11y(page, testInfo, 'dialog[open]');
    expect(newViolations(v), JSON.stringify(newViolations(v), null, 2)).toEqual([]);
  });

  test('product detail page', async ({ page, productPage }, testInfo) => {
    await productPage.goto('sausage-roll-1000446');
    const v = await scanA11y(page, testInfo);
    expect(newViolations(v), JSON.stringify(newViolations(v), null, 2)).toEqual([]);
  });
});
