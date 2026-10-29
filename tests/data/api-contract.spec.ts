import { test, expect } from '../../src/fixtures';
import { CATEGORIES } from '../../src/data/categories';
import { kcal, nutrient } from '../../src/api/menu-api';

/**
 * Contract & data-quality checks on the menu API the page is built from.
 * The snapshot is captured from a real page load (see fixtures.ts).
 */
test.describe('Menu API – contract', () => {
  test('responds 200 with JSON', async ({ menuApi }) => {
    test.info().annotations.push({ type: 'endpoint', description: menuApi.url });
    expect(menuApi.status).toBe(200);
    expect(menuApi.contentType).toContain('application/json');
  });

  test('every record matches the schema the UI depends on', async ({ menuApi }) => {
    expect(menuApi.schemaErrors, menuApi.schemaErrors.join('\n')).toEqual([]);
    expect(menuApi.articles.length).toBeGreaterThan(50);
  });

  test('honours its own query filters (no unpublished / hidden / duplicate records)', async ({ menuApi }) => {
    const unpublished = menuApi.articles.filter((a) => !a.isPublished).map((a) => a.articleCode);
    const hidden = menuApi.articles.filter((a) => a.isHiddenInMenu).map((a) => a.articleCode);
    const codes = menuApi.articles.map((a) => a.articleCode);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect({ unpublished, hidden, dupes }).toEqual({ unpublished: [], hidden: [], dupes: [] });
  });

  test('every product belongs to a known category, and no category is empty', async ({ menuApi }) => {
    const known = new Set(CATEGORIES.map((c) => c.id));
    const orphans = menuApi.articles.filter((a) => !known.has(a.articleCategoryId));
    expect(orphans.map((a) => `${a.articleCode} (cat ${a.articleCategoryId})`)).toEqual([]);
    for (const c of CATEGORIES) {
      expect(menuApi.articles.some((a) => a.articleCategoryId === c.id), `${c.label} has products`).toBe(true);
    }
  });
});

test.describe('Menu API – data quality', () => {
  test('every product has the core nutrients needed for the front-of-pack label', async ({ menuApi }) => {
    const required = ['Calories', 'EnergyKj', 'Fat', 'Saturates', 'Sugar', 'Salt'];
    const missing = menuApi.articles.flatMap((a) =>
      required.filter((n) => nutrient(a, n) === undefined).map((n) => `${a.articleCode} ${a.articleName}: ${n}`),
    );
    expect(missing, missing.join('\n')).toEqual([]);
  });

  test('energy values are internally consistent (kJ ≈ kcal × 4.184, ±5%)', async ({ menuApi }) => {
    const bad = menuApi.articles
      .map((a) => ({ a, kj: nutrient(a, 'EnergyKj') ?? 0, kc: kcal(a) }))
      .filter(({ kj, kc }) => kc > 10 && Math.abs(kj - kc * 4.184) / (kc * 4.184) > 0.05)
      .map(({ a, kj, kc }) => `${a.articleCode} ${a.articleName}: ${kc} kcal vs ${kj} kJ`);
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('saturates never exceed fat, and sugar never exceeds carbohydrate', async ({ menuApi }) => {
    const bad: string[] = [];
    for (const a of menuApi.articles) {
      const fat = nutrient(a, 'Fat');
      const sat = nutrient(a, 'Saturates');
      const carbs = nutrient(a, 'Carbohydrates');
      const sugar = nutrient(a, 'Sugar');
      // +0.5 g tolerance for label rounding.
      if (fat !== undefined && sat !== undefined && sat > fat + 0.5) bad.push(`${a.articleName}: sat ${sat} > fat ${fat}`);
      if (carbs !== undefined && sugar !== undefined && sugar > carbs + 0.5)
        bad.push(`${a.articleName}: sugar ${sugar} > carbs ${carbs}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('product names are clean (no stray whitespace, no placeholder text)', async ({ menuApi }) => {
    const bad = menuApi.articles
      .filter((a) => a.articleName !== a.articleName.trim() || /\s{2,}|lorem|todo|test\b|tbc/i.test(a.articleName))
      .map((a) => `${a.articleCode}: "${a.articleName}"`);
    expect(bad).toEqual([]);
  });

  test('every product has a customer-facing description', async ({ menuApi }) => {
    const bad = menuApi.articles
      .filter((a) => !(a.menuDescription?.trim() || a.customerDescription?.trim()))
      .map((a) => `${a.articleCode} ${a.articleName}`);
    expect(bad).toEqual([]);
  });

  test('every product thumbnail URL serves an image', async ({ menuApi, request }) => {
    const urls = menuApi.articles.map((a) => ({ name: a.articleName, url: a.thumbnailUri }));
    const failures: string[] = [];
    // Small batches – polite to the CDN, still fast.
    for (let i = 0; i < urls.length; i += 8) {
      await Promise.all(
        urls.slice(i, i + 8).map(async ({ name, url }) => {
          const r = await request.get(url, { failOnStatusCode: false, timeout: 20_000 });
          const type = r.headers()['content-type'] ?? '';
          if (r.status() !== 200 || !type.startsWith('image/')) failures.push(`${name}: ${r.status()} ${type} ${url}`);
        }),
      );
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
