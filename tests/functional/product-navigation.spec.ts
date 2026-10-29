import { test, expect } from '../../src/fixtures';
import { ANCHOR_PRODUCTS, CATEGORIES } from '../../src/data/categories';

test.describe('Menu → product detail navigation', () => {
  test('clicking a product card opens its detail page @smoke', async ({ page, menuPage, productPage }) => {
    await menuPage.goto();
    const card = menuPage.cards.first();
    const name = (await menuPage.cardTitle(card).innerText()).trim();
    const href = await card.getAttribute('href');

    await card.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(productPage.title).toHaveText(name);
    await expect(page).toHaveTitle(name);
  });

  test('the first product in every category opens a complete detail page', async ({
    page,
    menuPage,
    productPage,
  }) => {
    for (const category of CATEGORIES) {
      await test.step(category.label, async () => {
        await menuPage.goto(category);
        const card = menuPage.cards.first();
        const name = (await menuPage.cardTitle(card).innerText()).trim();
        await card.click();

        await expect(productPage.title).toHaveText(name);
        await expect(productPage.heroImage).toBeVisible();
        await expect(productPage.nutritionHeading).toBeVisible();
        expect((await productPage.nutritionRows()).length, 'nutrition rows').toBeGreaterThanOrEqual(6);
        await page.goBack();
        await menuPage.waitForGrid();
      });
    }
  });

  test('browser Back from a product returns to the same category view', async ({ page, menuPage }) => {
    await menuPage.goto(CATEGORIES[1]);
    await menuPage.cards.first().click();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`category=${CATEGORIES[1].slug}`));
    await menuPage.waitForGrid();
    expect(await menuPage.visibleSectionLabels(CATEGORIES.map((c) => c.label))).toEqual([CATEGORIES[1].label]);
  });

  for (const p of ANCHOR_PRODUCTS) {
    test(`direct link to "${p.name}" renders title, image, description, nutrition and allergens`, async ({
      page,
      productPage,
    }) => {
      const res = await productPage.goto(p.slug);
      expect(res?.status()).toBe(200);
      await expect(productPage.title).toBeVisible();
      await expect(productPage.heroImage).toHaveAttribute('alt', /\S/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S{10,}/);
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
      await expect(productPage.nutritionHeading).toBeVisible();
      expect(await productPage.portionGrams()).toBeGreaterThan(0);
      expect(await productPage.allergenList()).not.toHaveLength(0);
    });
  }

  test('an unknown product URL returns HTTP 404', async ({ page }) => {
    const res = await page.goto('/menu/product/this-product-does-not-exist-9999999');
    expect(res?.status()).toBe(404);
  });
});
