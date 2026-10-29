import { test, expect } from '../../src/fixtures';
import { DEFECTS, defectAnnotation } from '../../src/data/known-defects';

test.describe('Accessibility – keyboard operation', () => {
  test('category pills can be reached with Tab and activated with Enter', async ({ page, menuPage }) => {
    await menuPage.goto();
    const target = menuPage.pill('Sweet Treats');
    // Tab through the page until the pill receives focus (bounded so a trap fails fast).
    for (let i = 0; i < 60 && !(await target.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press('Tab');
    }
    await expect(target).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/category=sweet-treats/);
  });

  test('product cards are focusable and show a visible focus indicator', async ({ page, menuPage }) => {
    await menuPage.goto();
    // Reach the first card by real keyboard navigation so :focus-visible applies.
    await menuPage.pill('Hot Food').focus();
    const isCardFocused = () => page.evaluate(() => !!document.activeElement?.hasAttribute('data-test-card'));
    for (let i = 0; i < 25 && !(await isCardFocused()); i++) await page.keyboard.press('Tab');
    expect(await isCardFocused(), 'a product card received keyboard focus').toBe(true);

    // The ring may be drawn on the link itself or on its inner card wrapper.
    const hasIndicator = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return [el, ...Array.from(el.querySelectorAll<HTMLElement>('*')).slice(0, 3)].some((n) => {
        const s = getComputedStyle(n);
        return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none';
      });
    });
    expect(hasIndicator, 'visible focus outline or ring on the focused product card').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/menu\/product\//);
  });

  test('filters dialog: opens from keyboard, Escape closes it, focus returns to the trigger', async ({
    page,
    menuPage,
  }) => {
    await menuPage.goto();
    await menuPage.filterButton.focus();
    await page.keyboard.press('Enter');
    await expect(menuPage.filterDialog).toBeVisible();
    // Focus must move inside the modal.
    expect(await menuPage.filterDialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(menuPage.filterDialog).toBeHidden();
    await expect(menuPage.filterButton).toBeFocused();
  });
});

test.describe('Accessibility – semantics', () => {
  test('menu page has exactly one h1 and no skipped heading levels in the main content', async ({ page, menuPage }) => {
    await menuPage.goto();
    const levels = await page
      .locator('main')
      .locator('h1,h2,h3,h4,h5,h6')
      .evaluateAll((hs) => hs.map((h) => Number(h.tagName[1])));
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    const skips = levels.filter((l, i) => i > 0 && l - levels[i - 1] > 1);
    expect(skips, `heading sequence: ${levels.join(',')}`).toEqual([]);
  });

  test('search field has an accessible label', async ({ page, menuPage }) => {
    await menuPage.goto();
    await expect(page.getByRole('searchbox', { name: /search for a product/i })).toBeVisible();
  });

  test('selected category pill exposes its state to assistive technology', async ({ menuPage }) => {
    test.info().annotations.push(defectAnnotation(DEFECTS.PILL_STATE_NOT_EXPOSED));
    test.fail(true, DEFECTS.PILL_STATE_NOT_EXPOSED.id);
    await menuPage.goto();
    await menuPage.selectCategory('Hot Food');
    const pill = menuPage.pill('Hot Food');
    const state = await pill.evaluate((el) => ({
      pressed: el.getAttribute('aria-pressed'),
      current: el.getAttribute('aria-current'),
      selected: el.getAttribute('aria-selected'),
    }));
    expect(state.pressed === 'true' || state.selected === 'true' || !!state.current).toBe(true);
  });

  test('calorie slider has an accessible name', async ({ page, menuPage }) => {
    test.info().annotations.push(defectAnnotation(DEFECTS.SLIDER_NO_NAME));
    test.fail(true, DEFECTS.SLIDER_NO_NAME.id);
    await menuPage.goto();
    await menuPage.openFilters();
    await expect(page.getByRole('slider', { name: /calor/i })).toBeVisible({ timeout: 3_000 });
  });

  test('filters dialog close button has an accessible name', async ({ menuPage }) => {
    test.info().annotations.push(defectAnnotation(DEFECTS.DIALOG_CLOSE_NO_NAME));
    test.fail(true, DEFECTS.DIALOG_CLOSE_NO_NAME.id);
    await menuPage.goto();
    await menuPage.openFilters();
    await expect(menuPage.filterDialog.getByRole('button', { name: /close/i })).toBeVisible({ timeout: 3_000 });
  });

  test('product nutrition table exposes header cells', async ({ productPage }) => {
    test.info().annotations.push(defectAnnotation(DEFECTS.NUTRITION_TABLE_HEADERS));
    test.fail(true, DEFECTS.NUTRITION_TABLE_HEADERS.id);
    await productPage.goto('sausage-roll-1000446');
    await expect(productPage.nutritionTable.locator('th')).not.toHaveCount(0, { timeout: 3_000 });
  });
});
