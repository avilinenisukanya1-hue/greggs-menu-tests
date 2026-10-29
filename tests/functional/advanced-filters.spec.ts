import { test, expect } from '../../src/fixtures';
import { CATEGORIES, FILTERABLE_ALLERGENS } from '../../src/data/categories';
import { DEFECTS, defectAnnotation } from '../../src/data/known-defects';
import { hasAllergen, kcal } from '../../src/api/menu-api';

/**
 * The "Filter results" modal: allergen exclusions ("No Milk" etc.), a calorie ceiling
 * slider and category checkboxes. Allergen filtering is safety-relevant, so every
 * allergen is checked against the API's own allergen data – the UI must hide every
 * product containing it, and must not hide anything that doesn't.
 */
test.describe('Advanced filters – allergens', () => {
  for (const allergen of FILTERABLE_ALLERGENS) {
    test(`"No ${allergen}" hides every product containing ${allergen} – and only those`, async ({
      menuPage,
      menuApi,
    }) => {
      const expected = menuApi.articles
        .filter((a) => !hasAllergen(a, allergen))
        .map((a) => a.articleCode)
        .sort();

      await menuPage.goto();
      await menuPage.openFilters();
      await menuPage.excludeAllergen(allergen);
      await menuPage.applyFilters();

      await expect(menuPage.cards).toHaveCount(expected.length);
      const shown = (await menuPage.cardCodes()).sort();
      const leaked = shown.filter((c) => !expected.includes(c));
      const wronglyHidden = expected.filter((c) => !shown.includes(c));
      expect(leaked, `Products containing ${allergen} still shown (SAFETY): ${leaked.join(', ')}`).toEqual([]);
      expect(wronglyHidden, `Products without ${allergen} wrongly hidden`).toEqual([]);
    });
  }

  test('multiple allergen exclusions combine (product must be free of all of them)', async ({
    menuPage,
    menuApi,
  }) => {
    const excluded = ['Milk', 'Wheat'];
    const expected = menuApi.articles
      .filter((a) => excluded.every((al) => !hasAllergen(a, al)))
      .map((a) => a.articleCode)
      .sort();

    await menuPage.goto();
    await menuPage.openFilters();
    for (const al of excluded) await menuPage.excludeAllergen(al);
    await menuPage.applyFilters();

    expect(await menuPage.activeFilterCount()).toBe(excluded.length);
    await expect(menuPage.cards).toHaveCount(expected.length);
    expect((await menuPage.cardCodes()).sort()).toEqual(expected);
  });

  test('"Clear all" removes every filter and restores the full menu', async ({ menuPage, menuApi }) => {
    await menuPage.goto();
    await menuPage.openFilters();
    await menuPage.excludeAllergen('Milk');
    await menuPage.applyFilters();
    expect(await menuPage.activeFilterCount()).toBe(1);

    await menuPage.openFilters();
    await menuPage.clearFiltersButton.click();
    // "Clear all" may or may not close the modal – handle both.
    if (await menuPage.filterDialog.isVisible()) await menuPage.applyFilters();

    await expect(menuPage.cards).toHaveCount(menuApi.articles.length);
    expect(await menuPage.activeFilterCount()).toBe(0);
  });
});

test.describe('Advanced filters – calories & categories', () => {
  test('calorie ceiling shows only products at or under the limit', async ({ menuPage, menuApi }) => {
    const limit = 300;
    const expected = menuApi.articles
      .filter((a) => kcal(a) <= limit)
      .map((a) => a.articleCode)
      .sort();

    await menuPage.goto();
    await menuPage.openFilters();
    await menuPage.setMaxCalories(limit);
    await menuPage.applyFilters();

    await expect(menuPage.cards).toHaveCount(expected.length);
    expect((await menuPage.cardCodes()).sort()).toEqual(expected);
  });

  test('calorie slider range covers every product on the menu', async ({ menuPage, menuApi }) => {
    const max = Math.max(...menuApi.articles.map(kcal));
    await menuPage.goto();
    await menuPage.openFilters();
    const sliderMax = Number(await menuPage.calorieSlider.getAttribute('max'));
    test.info().annotations.push({ type: 'data', description: `slider max=${sliderMax}, highest product=${max} kcal` });

    test.info().annotations.push(defectAnnotation(DEFECTS.CALORIE_SLIDER_MAX));
    test.fail(max > sliderMax, DEFECTS.CALORIE_SLIDER_MAX.id);
    expect(sliderMax).toBeGreaterThanOrEqual(max);
  });

  test('moving the calorie slider back to its maximum shows the whole menu again', async ({ menuPage, menuApi }) => {
    const max = Math.max(...menuApi.articles.map(kcal));
    await menuPage.goto();
    await menuPage.openFilters();
    const sliderMax = Number(await menuPage.calorieSlider.getAttribute('max'));
    test.info().annotations.push(defectAnnotation(DEFECTS.CALORIE_SLIDER_MAX));
    test.fail(max > sliderMax, DEFECTS.CALORIE_SLIDER_MAX.id);

    await menuPage.setMaxCalories(500);
    await menuPage.setMaxCalories(sliderMax);
    await menuPage.applyFilters();
    await expect(menuPage.cards).toHaveCount(menuApi.articles.length);
  });

  test('category checkboxes show product counts that match the menu data', async ({ menuPage, menuApi }) => {
    await menuPage.goto();
    await menuPage.openFilters();
    for (const c of CATEGORIES) {
      const expected = menuApi.articles.filter((a) => a.articleCategoryId === c.id).length;
      await expect(
        menuPage.filterDialog.getByLabel(`${c.label} (${expected})`, { exact: true }),
        `checkbox label for ${c.label}`,
      ).toHaveCount(1);
    }
  });
});
