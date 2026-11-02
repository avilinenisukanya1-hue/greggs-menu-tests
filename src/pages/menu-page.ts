import { expect, type Locator, type Page } from '@playwright/test';
import type { Category } from '../data/categories';

/**
 * Page object for https://www.greggs.com/menu
 *
 * Selector strategy (in priority order):
 *   1. The site's own `data-test*` hooks (data-test-card, data-test-filter, data-test="filterButton")
 *   2. Accessible roles/names (headings, dialog)
 *   3. Structural CSS only where nothing better exists (documented inline)
 */
export class MenuPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly cards: Locator;
  readonly pills: Locator;
  readonly filterButton: Locator;
  readonly filterDialog: Locator;
  readonly calorieSlider: Locator;
  readonly applyFiltersButton: Locator;
  readonly clearFiltersButton: Locator;
  readonly searchInput: Locator;
  readonly searchChip: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { level: 1 });
    this.cards = page.locator('[data-test-card]');
    this.pills = page.locator('[data-test-filter]');
    this.filterButton = page.locator('[data-test="filterButton"]');
    // The filters modal is a native <dialog>.
    this.filterDialog = page.locator('dialog[open]');
    this.calorieSlider = this.filterDialog.locator('input[type="range"]');
    this.applyFiltersButton = this.filterDialog.locator('[data-test="modalApply"]');
    this.clearFiltersButton = this.filterDialog.locator('[data-test="modalClear"]');
    this.searchInput = page.getByLabel('Search for a product');
    this.searchChip = page.locator('[data-test-pill="search"]');
    this.emptyState = page.getByText(/could not find any products/i);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async goto(category?: Category): Promise<void> {
    await this.page.goto(category ? `/menu?category=${category.slug}` : '/menu');
    await this.waitForGrid();
  }

  async waitForGrid(): Promise<void> {
    // The grid hydrates from the menu API; allow for a slow first response from production.
    await expect(this.cards.first()).toBeVisible({ timeout: 20_000 });
  }

  pill(label: string): Locator {
    return this.page.locator(`[data-test-filter="${label}"]`);
  }

  card(articleCode: string): Locator {
    return this.page.locator(`[data-test-card="${articleCode}"]`);
  }

  cardTitle(card: Locator): Locator {
    return card.locator('h3');
  }

  sectionHeading(label: string): Locator {
    return this.page.getByRole('heading', { level: 2, name: label, exact: true });
  }

  /** Cards belonging to one category section. Each section is <div><div><h2/></div>...grid...</div>. */
  sectionCards(label: string): Locator {
    return this.sectionHeading(label).locator('xpath=../..').locator('[data-test-card]');
  }

  /**
   * Category section headings currently rendered, in DOM order.
   * Uses textContent, not innerText: headings are uppercased with CSS text-transform.
   */
  async visibleSectionLabels(knownLabels: readonly string[]): Promise<string[]> {
    const all = await this.page.getByRole('heading', { level: 2 }).allTextContents();
    return all.map((t) => t.trim()).filter((t) => knownLabels.includes(t));
  }

  async cardCodes(): Promise<string[]> {
    return this.cards.evaluateAll((els) => els.map((e) => e.getAttribute('data-test-card') ?? ''));
  }

  /** Label of the pill the sliding [data-test-active] highlight is currently centred under. */
  async highlightedPill(): Promise<string | null> {
    return this.page.evaluate(() => {
      const hl = document.querySelector('[data-test-active]');
      if (!hl) return null;
      const r = hl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const hit = Array.from(document.querySelectorAll('[data-test-filter]')).find((p) => {
        const b = p.getBoundingClientRect();
        return cx >= b.left && cx <= b.right;
      });
      return hit?.getAttribute('data-test-filter') ?? null;
    });
  }

  async selectCategory(label: string): Promise<void> {
    await this.pill(label).click();
    await this.waitForGrid();
  }

  // ---------- advanced filters (modal) ----------

  async openFilters(): Promise<void> {
    await this.filterButton.click();
    await expect(this.filterDialog).toBeVisible();
  }

  allergenCheckbox(allergen: string): Locator {
    // Inputs are visually hidden (opacity:0) behind a custom checkbox; name/id = allergen.
    return this.filterDialog.locator(`input[type="checkbox"][name="${allergen}"]`);
  }

  /** Upper bound of the calorie slider - the modal applies it as a ceiling even when untouched (GM-001). */
  async calorieCeiling(): Promise<number> {
    return Number(await this.calorieSlider.getAttribute('max'));
  }

  async excludeAllergen(allergen: string): Promise<void> {
    await this.allergenCheckbox(allergen).check({ force: true });
  }

  async setMaxCalories(kcal: number): Promise<void> {
    await this.calorieSlider.fill(String(kcal));
  }

  async applyFilters(): Promise<void> {
    await this.applyFiltersButton.click();
    await expect(this.filterDialog).toBeHidden();
  }

  async closeFilters(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await expect(this.filterDialog).toBeHidden();
  }

  /** "Clear all" takes effect immediately but leaves the modal open with Apply disabled. */
  async clearAllFilters(): Promise<void> {
    await this.clearFiltersButton.click();
    await this.closeFilters();
  }

  /** Number shown in the badge on the "Filter results" button (0 when none). */
  async activeFilterCount(): Promise<number> {
    const text = await this.filterButton.innerText();
    const m = text.match(/(\d+)\s*$/);
    return m ? Number(m[1]) : 0;
  }
}
