import { expect, type Locator, type Page } from '@playwright/test';

export interface NutritionRow {
  label: string;
  per100g: number;
  perPortion: number;
  unit: string;
}

/** Page object for https://www.greggs.com/menu/product/<slug>-<articleCode> */
export class ProductPage {
  readonly page: Page;
  readonly title: Locator;
  readonly heroImage: Locator;
  readonly allergens: Locator;
  readonly nutritionHeading: Locator;
  readonly nutritionTable: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByRole('heading', { level: 1 });
    this.heroImage = page.locator('main img').first();
    this.allergens = page.locator('[data-test-nutrition="allergens"]');
    this.nutritionHeading = page.getByRole('heading', { level: 2, name: 'Nutritional Information' });
    this.nutritionTable = page.locator('main table').first();
  }

  async goto(slug: string) {
    const response = await this.page.goto(`/menu/product/${slug}`);
    await expect(this.title).toBeVisible();
    return response;
  }

  async allergenList(): Promise<string[]> {
    if ((await this.allergens.count()) === 0) return [];
    const text = (await this.allergens.innerText()).trim();
    // Products with no allergens show "n/a" rather than an empty list.
    if (/^n\/?a$/i.test(text)) return [];
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** Portion weight from the "Per portion (103g)" column header. */
  async portionGrams(): Promise<number | undefined> {
    const header = await this.nutritionTable.locator('tr').first().innerText();
    const m = header.match(/Per portion\s*\(([\d.]+)\s*g\)/i);
    return m ? Number(m[1]) : undefined;
  }

  /**
   * Parses the nutrition table into rows. Real markup is a <table> of <td>s only
   * (no <th>) - rows look like: "Energy kcal | 337kcal | 347kcal".
   */
  async nutritionRows(): Promise<NutritionRow[]> {
    const rows = await this.nutritionTable
      .locator('tr')
      .evaluateAll((trs) =>
        trs.map((tr) => Array.from(tr.querySelectorAll('td,th')).map((c) => (c.textContent ?? '').trim())),
      );
    const out: NutritionRow[] = [];
    for (const cells of rows) {
      const nonEmpty = cells.filter(Boolean);
      if (nonEmpty.length < 3) continue;
      const [label, a, b] = nonEmpty;
      const ma = a.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
      const mb = b.match(/^([\d.]+)\s*([a-zA-Z]+)$/);
      if (!ma || !mb) continue; // header row
      out.push({ label, per100g: Number(ma[1]), perPortion: Number(mb[1]), unit: mb[2] });
    }
    return out;
  }

  async nutritionValue(label: string): Promise<NutritionRow | undefined> {
    return (await this.nutritionRows()).find((r) => r.label.toLowerCase() === label.toLowerCase());
  }
}
