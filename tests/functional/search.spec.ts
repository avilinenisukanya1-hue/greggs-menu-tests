import { test, expect } from '../../src/fixtures';
import { kcal, type Article } from '../../src/api/menu-api';
import { categoryBySlug } from '../../src/data/categories';
import { DEFECTS, knownDefect } from '../../src/data/known-defects';

/**
 * Observed search semantics (exploratory session): case-insensitive match on the
 * product NAME, where every word of the query must appear in order
 * ("sausage roll" matches "Sausage Breakfast Roll"; "roll cheese" matches nothing).
 * Descriptions are not searched. The oracle below encodes that, so the UI result
 * set is checked against the live API rather than against hard-coded counts.
 */
function expectedMatches(articles: Article[], query: string): string[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(words.map(escape).join('.*'));
  return articles.filter((a) => re.test(a.articleName.toLowerCase())).map((a) => a.articleCode).sort();
}

test.describe('Product search', () => {
  for (const query of ['latte', 'chicken', 'bake', 'Steak', 'SAUSAGE ROLL', '  pizza  ']) {
    test(`"${query}" returns exactly the products whose name matches`, async ({ menuPage, menuApi }) => {
      const expected = expectedMatches(menuApi.articles, query);
      test.skip(expected.length === 0, `No live products match "${query}" - menu has changed`);

      await menuPage.goto();
      // Search results are also capped by the calorie slider's ceiling, even untouched (GM-001).
      await menuPage.openFilters();
      const ceiling = await menuPage.calorieCeiling();
      await menuPage.closeFilters();
      const overCeiling = menuApi.articles.filter((a) => expected.includes(a.articleCode) && kcal(a) > ceiling);
      knownDefect(DEFECTS.CALORIE_SLIDER_MAX, overCeiling.length > 0);

      await menuPage.search(query);

      await expect(menuPage.cards).toHaveCount(expected.length);
      expect((await menuPage.cardCodes()).sort()).toEqual(expected);
    });
  }

  test('a query with no matches shows an empty state and a removable search chip', async ({ menuPage, menuApi }) => {
    await menuPage.goto();
    await menuPage.search('zzqxjv');

    await expect(menuPage.cards).toHaveCount(0);
    await expect(menuPage.emptyState).toBeVisible();
    await expect(menuPage.searchChip).toBeVisible();

    await menuPage.searchChip.click();
    await expect(menuPage.searchInput).toHaveValue('');
    await expect(menuPage.cards).toHaveCount(menuApi.articles.length);
  });

  test('clearing the search input restores the full menu', async ({ menuPage, menuApi }) => {
    await menuPage.goto();
    await menuPage.search('latte');
    await expect(menuPage.cards).not.toHaveCount(menuApi.articles.length);
    await menuPage.search('');
    await expect(menuPage.cards).toHaveCount(menuApi.articles.length);
  });

  test('search combines with the category filter', async ({ menuPage, menuApi }) => {
    // "chicken" appears in several categories; restricting to Hot Food must intersect the two.
    const hotFood = categoryBySlug('hot-food');
    const expected = expectedMatches(
      menuApi.articles.filter((a) => a.articleCategoryId === hotFood.id),
      'chicken',
    );
    test.skip(expected.length === 0, 'No hot-food chicken products on the live menu');

    await menuPage.goto();
    await menuPage.selectCategory(hotFood.label);
    await menuPage.search('chicken');
    await expect(menuPage.cards).toHaveCount(expected.length);
    expect((await menuPage.cardCodes()).sort()).toEqual(expected);
  });

  test('search input is safe against markup / script injection', async ({ page, menuPage }) => {
    let dialogFired = false;
    page.on('dialog', async (d) => {
      dialogFired = true;
      await d.dismiss();
    });
    await menuPage.goto();
    await menuPage.search('<img src=x onerror=alert(1)>');
    await expect(menuPage.cards).toHaveCount(0);
    // If echoed back (e.g. in the chip) it must be rendered as text, not parsed.
    await expect(page.locator('main img[src="x"]')).toHaveCount(0);
    expect(dialogFired).toBe(false);
  });
});
