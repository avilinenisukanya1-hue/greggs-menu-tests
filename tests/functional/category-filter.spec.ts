import { test, expect } from '../../src/fixtures';
import { CATEGORIES } from '../../src/data/categories';
import { DEFECTS, defectAnnotation } from '../../src/data/known-defects';

const LABELS = CATEGORIES.map((c) => c.label);

test.describe('Category filtering', () => {
  for (const category of CATEGORIES) {
    test(`selecting "${category.label}" shows only that category's products`, async ({ page, menuPage, menuApi }) => {
      const expectedCodes = menuApi.articles
        .filter((a) => a.articleCategoryId === category.id)
        .map((a) => a.articleCode)
        .sort();

      await menuPage.goto();
      await menuPage.selectCategory(category.label);

      await expect(page).toHaveURL(new RegExp(`[?&]category=${category.slug}(&|$)`));
      expect(await menuPage.visibleSectionLabels(LABELS)).toEqual([category.label]);
      await expect(menuPage.cards).toHaveCount(expectedCodes.length);
      expect((await menuPage.cardCodes()).sort()).toEqual(expectedCodes);
    });
  }

  test('deep-linking to ?category=<slug> pre-selects that category @smoke', async ({ menuPage, menuApi }) => {
    for (const category of CATEGORIES) {
      await test.step(category.label, async () => {
        await menuPage.goto(category);
        expect(await menuPage.visibleSectionLabels(LABELS)).toEqual([category.label]);
        const expected = menuApi.articles.filter((a) => a.articleCategoryId === category.id).length;
        await expect(menuPage.cards).toHaveCount(expected);
      });
    }
  });

  test('"All" restores every category and the full product list', async ({ page, menuPage, menuApi }) => {
    await menuPage.goto(CATEGORIES[0]);
    await menuPage.selectCategory('All');
    await expect(page).not.toHaveURL(new RegExp(`category=${CATEGORIES[0].slug}`));
    expect(await menuPage.visibleSectionLabels(LABELS)).toEqual(LABELS);
    await expect(menuPage.cards).toHaveCount(menuApi.articles.length);
  });

  test('an unknown ?category value falls back gracefully to the full menu', async ({ menuPage, menuApi }) => {
    await menuPage.page.goto('/menu?category=not-a-real-category');
    await menuPage.waitForGrid();
    expect(await menuPage.visibleSectionLabels(LABELS)).toEqual(LABELS);
    await expect(menuPage.cards).toHaveCount(menuApi.articles.length);
  });

  test('the sliding highlight sits behind the selected pill', async ({ menuPage }) => {
    // The active state is drawn by a single animated element ([data-test-active]) that slides
    // under the chosen pill – the pills themselves have no state of their own (see GM-002).
    await menuPage.goto();
    await expect.poll(() => menuPage.highlightedPill()).toBe('All');
    for (const label of ['Hot Food', 'Breakfast', 'All']) {
      await menuPage.selectCategory(label);
      await expect.poll(() => menuPage.highlightedPill(), { message: `after selecting ${label}` }).toBe(label);
    }
  });

  test('browser Back returns to the previously selected category', async ({ page, menuPage }) => {
    test.info().annotations.push(defectAnnotation(DEFECTS.CATEGORY_HISTORY));
    test.fail(true, DEFECTS.CATEGORY_HISTORY.id);

    await menuPage.goto();
    await menuPage.selectCategory('Breakfast');
    await menuPage.selectCategory('Hot Food');
    await page.goBack();
    await expect(page).toHaveURL(/category=breakfast/, { timeout: 5_000 });
  });

  test('category selection survives a page reload', async ({ page, menuPage }) => {
    await menuPage.goto();
    await menuPage.selectCategory('Sweet Treats');
    await page.reload();
    await menuPage.waitForGrid();
    expect(await menuPage.visibleSectionLabels(LABELS)).toEqual(['Sweet Treats']);
  });
});
