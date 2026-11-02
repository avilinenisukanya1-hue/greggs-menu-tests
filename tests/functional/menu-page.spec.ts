import { test, expect } from '../../src/fixtures';
import { CATEGORIES } from '../../src/data/categories';

const LABELS = CATEGORIES.map((c) => c.label);

test.describe('Menu page - rendering', () => {
  test('loads successfully with correct document metadata @smoke', async ({ page, menuPage }) => {
    const response = await page.goto('/menu');
    expect(response?.status(), 'HTTP status of /menu').toBe(200);
    await menuPage.waitForGrid();

    await expect(page).toHaveTitle('Greggs | Menu');
    await expect(menuPage.heading).toContainText(/our menu/i);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://www.greggs.com/menu');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/);
  });

  test('shows the "All" pill followed by every category pill, in menu order @smoke', async ({ menuPage }) => {
    await menuPage.goto();
    // Pills are horizontally scrollable on small screens, so assert presence + order, not visibility of all.
    const pillLabels = await menuPage.pills.evaluateAll((els) => els.map((e) => e.getAttribute('data-test-filter')));
    expect(pillLabels).toEqual(['All', ...LABELS]);
    await expect(menuPage.pill('All')).toBeVisible();
  });

  test('renders one section per category, in menu order, on the "All" view', async ({ menuPage }) => {
    await menuPage.goto();
    expect(await menuPage.visibleSectionLabels(LABELS)).toEqual(LABELS);
  });

  test('every product card has a title, an image with alt text, and a well-formed product link @smoke', async ({
    menuPage,
  }) => {
    await menuPage.goto();
    const cards = await menuPage.cards.evaluateAll((els) =>
      els.map((a) => ({
        code: a.getAttribute('data-test-card'),
        href: a.getAttribute('href'),
        title: a.querySelector('h3')?.textContent?.trim() ?? '',
        // src is only set once the card scrolls into view (IntersectionObserver), so it isn't
        // checked here - "all product images actually load once scrolled into view" covers it.
        imgAlt: a.querySelector('img')?.getAttribute('alt') ?? null,
      })),
    );
    expect(cards.length).toBeGreaterThan(0);

    const problems: string[] = [];
    for (const c of cards) {
      if (!c.title) problems.push(`${c.code}: empty title`);
      if (!c.imgAlt) problems.push(`${c.code}: image missing alt`);
      // Slug format: /menu/product/<kebab-name>-<articleCode>
      if (!c.href?.match(new RegExp(`^/menu/product/[a-z0-9-]+-${c.code}$`))) {
        problems.push(`${c.code}: unexpected href ${c.href}`);
      }
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });

  test('does not render duplicate products', async ({ menuPage }) => {
    await menuPage.goto();
    const codes = await menuPage.cardCodes();
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });

  test('all product images actually load once scrolled into view', async ({ menuPage }) => {
    test.slow(); // ~140 images over the network
    await menuPage.goto();
    // src is only assigned when a card intersects the viewport, so every card must be scrolled to.
    const total = await menuPage.cards.count();
    for (let i = 0; i < total; i++) {
      await menuPage.cards.nth(i).scrollIntoViewIfNeeded();
    }
    const pending = () =>
      menuPage.cards.evaluateAll((els) =>
        els.map((a) => a.querySelector('img')).filter((img) => !img?.getAttribute('src') || !img.complete).length,
      );
    await expect.poll(pending, { message: 'images still without src or loading', timeout: 30_000 }).toBe(0);

    const broken = await menuPage.cards.evaluateAll((els) =>
      els
        .map((a) => a.querySelector('img'))
        .filter((img): img is HTMLImageElement => !!img && img.naturalWidth === 0)
        .map((img) => img.currentSrc || img.src),
    );
    expect(broken, `Broken images:\n${broken.join('\n')}`).toEqual([]);
  });

  test('loads without first-party JavaScript errors or failed first-party requests', async ({ page, menuPage }) => {
    const jsErrors: string[] = [];
    const failed: string[] = [];
    // Cross-origin (third-party) script errors surface as an opaque "Script error." - not ours to own.
    page.on('pageerror', (e) => {
      if (!/^Script error\.?$/.test(e.message)) jsErrors.push(e.message);
    });
    page.on('response', (r) => {
      const host = new URL(r.url()).hostname;
      if (/greggs\.(com|co\.uk)$/.test(host) && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });

    await menuPage.goto();
    await page.waitForLoadState('networkidle').catch(() => {});

    expect(jsErrors, `Uncaught errors:\n${jsErrors.join('\n')}`).toEqual([]);
    expect(failed, `Failed requests:\n${failed.join('\n')}`).toEqual([]);
  });
});
