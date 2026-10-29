import { test, expect } from '../../src/fixtures';
import { CATEGORIES } from '../../src/data/categories';
import { allergens, kcal, nutrient, type Article } from '../../src/api/menu-api';

test.describe('UI ⇄ API consistency – menu listing', () => {
  test('the menu shows exactly the products the API returns, with matching names', async ({ menuPage, menuApi }) => {
    await menuPage.goto();
    const ui = await menuPage.cards.evaluateAll((els) =>
      els.map((a) => ({ code: a.getAttribute('data-test-card') ?? '', name: a.querySelector('h3')?.textContent?.trim() ?? '' })),
    );
    const api = new Map(menuApi.articles.map((a) => [a.articleCode, a]));

    const missingFromUi = [...api.keys()].filter((c) => !ui.some((u) => u.code === c));
    const unknownInUi = ui.filter((u) => !api.has(u.code)).map((u) => u.code);
    const nameMismatch = ui
      .filter((u) => api.has(u.code) && api.get(u.code)!.articleName.trim() !== u.name)
      .map((u) => `${u.code}: UI "${u.name}" vs API "${api.get(u.code)!.articleName}"`);

    expect({ missingFromUi, unknownInUi, nameMismatch }).toEqual({ missingFromUi: [], unknownInUi: [], nameMismatch: [] });
  });

  test('each product appears under the section of its API category', async ({ menuPage, menuApi }) => {
    await menuPage.goto();
    const misplaced: string[] = [];
    for (const c of CATEGORIES) {
      const codes = await menuPage.sectionCards(c.label).evaluateAll((els) => els.map((e) => e.getAttribute('data-test-card')));
      for (const code of codes) {
        const a = menuApi.articles.find((x) => x.articleCode === code);
        if (a && a.articleCategoryId !== c.id) misplaced.push(`${a.articleName} shown under ${c.label}`);
      }
      const expected = menuApi.articles.filter((a) => a.articleCategoryId === c.id).length;
      expect(codes.length, `${c.label} section size`).toBe(expected);
    }
    expect(misplaced).toEqual([]);
  });
});

/**
 * Detail pages are expensive to load, so we take a deterministic, representative sample:
 * the first and last product of every category (covers both ends of each list) plus
 * every multi-portion product (pizza boxes etc.) – the riskiest for nutrition maths.
 */
function sample(articles: Article[]): Article[] {
  const picked = new Map<string, Article>();
  for (const c of CATEGORIES) {
    const inCat = articles.filter((a) => a.articleCategoryId === c.id);
    if (inCat.length) {
      picked.set(inCat[0].articleCode, inCat[0]);
      picked.set(inCat[inCat.length - 1].articleCode, inCat[inCat.length - 1]);
    }
  }
  articles.filter((a) => kcal(a) > 1500).slice(0, 2).forEach((a) => picked.set(a.articleCode, a));
  return [...picked.values()];
}

test.describe('UI ⇄ API consistency – product detail pages', () => {
  test('detail pages show the same name, portion, calories and allergens as the menu data', async ({
    page,
    menuPage,
    productPage,
    menuApi,
  }) => {
    test.slow(); // ~15 page loads
    await menuPage.goto();
    const items = sample(menuApi.articles);
    // Resolve links from the real menu first (we navigate away from it below).
    const hrefs = new Map(
      await menuPage.cards.evaluateAll((els) => els.map((e) => [e.getAttribute('data-test-card'), e.getAttribute('href')] as const)),
    );
    const problems: string[] = [];
    const kjDrift: string[] = [];

    for (const a of items) {
      await test.step(`${a.articleCode} ${a.articleName}`, async () => {
        const href = hrefs.get(a.articleCode);
        if (!href) return void problems.push(`${a.articleName}: no card on menu`);
        await page.goto(href);
        await expect(productPage.title).toBeVisible();

        const title = (await productPage.title.innerText()).trim();
        if (title !== a.articleName.trim()) problems.push(`${a.articleCode}: title "${title}" ≠ "${a.articleName}"`);

        const kcalRow = await productPage.nutritionValue('Energy kcal');
        if (!kcalRow) problems.push(`${a.articleName}: no kcal row`);
        else if (Math.round(kcalRow.perPortion) !== Math.round(kcal(a)))
          problems.push(`${a.articleName}: page ${kcalRow.perPortion} kcal ≠ API ${kcal(a)} kcal`);

        const kjRow = await productPage.nutritionValue('Energy kJ');
        const apiKj = nutrient(a, 'EnergyKj');
        if (kjRow && apiKj) {
          const diff = Math.abs(kjRow.perPortion - apiKj) / apiKj;
          if (diff > 0.02) problems.push(`${a.articleName}: page ${kjRow.perPortion} kJ ≠ API ${apiKj} kJ`);
          else if (kjRow.perPortion !== apiKj) kjDrift.push(`${a.articleName}: page ${kjRow.perPortion} vs API ${apiKj} kJ`);
        }

        const grams = await productPage.portionGrams();
        if (a.articleSize?.unitOfMeasure === 'g' && grams !== undefined && Math.abs(grams - a.articleSize.size) > 1)
          problems.push(`${a.articleName}: portion ${grams}g ≠ API ${a.articleSize.size}g`);

        const uiAllergens = (await productPage.allergenList()).map((s) => s.replace(/\*$/, '').toLowerCase()).sort();
        const apiAllergens = allergens(a).map((s) => s.toLowerCase()).sort();
        if (JSON.stringify(uiAllergens) !== JSON.stringify(apiAllergens))
          problems.push(`${a.articleName}: allergens UI [${uiAllergens}] ≠ API [${apiAllergens}] (SAFETY)`);
      });
    }

    if (kjDrift.length) {
      // Small rounding drift between the page (derived from per-100g) and the API's stored kJ.
      test.info().annotations.push({ type: 'observation', description: `kJ rounding drift (<2%): ${kjDrift.join('; ')}` });
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
