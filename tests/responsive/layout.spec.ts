import { test, expect } from '../../src/fixtures';
import type { Page } from '@playwright/test';

/**
 * Layout checks across breakpoints. The grid is Tailwind:
 *   grid-cols-2  (<640px) · sm:grid-cols-3 (640–767px) · md:grid-cols-4 (≥768px)
 * Assertions measure rendered geometry, never class names.
 */
const VIEWPORTS = [
  { name: 'small phone (WCAG reflow width)', width: 320, height: 640, cols: 2 },
  { name: 'phone', width: 390, height: 844, cols: 2 },
  { name: 'large phone / small tablet', width: 700, height: 1000, cols: 3 },
  { name: 'tablet', width: 1024, height: 768, cols: 4 },
  { name: 'desktop', width: 1440, height: 900, cols: 4 },
] as const;

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function columnsInFirstRow(page: Page): Promise<number> {
  return page.locator('[data-test-card]').evaluateAll((els) => {
    const top = Math.round(els[0].getBoundingClientRect().top);
    return els.filter((e) => Math.abs(Math.round(e.getBoundingClientRect().top) - top) <= 2).length;
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} – ${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test(`menu has no horizontal scroll and shows ${vp.cols} product columns`, async ({ page, menuPage }) => {
      await menuPage.goto();
      expect(await horizontalOverflow(page), 'px of horizontal overflow').toBeLessThanOrEqual(1);
      expect(await columnsInFirstRow(page)).toBe(vp.cols);
    });

    test('product cards are evenly sized and images keep their aspect ratio', async ({ menuPage }) => {
      await menuPage.goto();
      const boxes = await menuPage.cards.evaluateAll((els) =>
        els.slice(0, 8).map((e) => {
          const img = e.querySelector('img')!;
          const r = img.getBoundingClientRect();
          return { cardW: Math.round(e.getBoundingClientRect().width), ratio: r.width / Math.max(r.height, 1) };
        }),
      );
      const widths = new Set(boxes.map((b) => b.cardW));
      expect(Math.max(...widths) - Math.min(...widths), 'card width variance (px)').toBeLessThanOrEqual(2);
      for (const b of boxes) expect(b.ratio).toBeGreaterThan(0.5);
    });

    test('every category pill can be reached and used', async ({ page, menuPage }) => {
      await menuPage.goto();
      // On narrow screens the pill bar scrolls horizontally – the last pill must still be usable.
      const last = menuPage.pill('Hot Food');
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      await last.click();
      await expect(page).toHaveURL(/category=hot-food/);
      await expect(menuPage.filterButton).toBeVisible();
    });

    test('product detail page has no horizontal scroll', async ({ page, productPage }) => {
      await productPage.goto('sausage-roll-1000446');
      await expect(productPage.nutritionTable).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  });
}

test.describe('Touch targets (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('pills, filter button and cards meet the WCAG 2.2 minimum target size (24×24px)', async ({ menuPage }) => {
    await menuPage.goto();
    const small = await menuPage.page
      .locator('[data-test-filter], [data-test="filterButton"], [data-test-card]')
      .evaluateAll((els) =>
        els
          .map((e) => ({ id: e.getAttribute('data-test-filter') ?? e.getAttribute('data-test-card') ?? 'filterButton', r: e.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.width < 24 || r.height < 24))
          .map(({ id, r }) => `${id}: ${Math.round(r.width)}×${Math.round(r.height)}`),
      );
    expect(small).toEqual([]);
  });
});
