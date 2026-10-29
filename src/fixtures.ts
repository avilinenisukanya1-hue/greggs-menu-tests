import { test as base, expect, type Page } from '@playwright/test';
import { MENU_API_PATTERN, MenuResponseSchema, type Article } from './api/menu-api';
import { MenuPage } from './pages/menu-page';
import { ProductPage } from './pages/product-page';

const FALLBACK_API_URL =
  'https://production-digital.greggs.co.uk/api/v1.0/articles/masters' +
  '?ExcludeUnpublished=true&ExcludeDuplicates=true&ExcludeHiddenFromMenu=true';

export interface MenuApiSnapshot {
  url: string;
  status: number;
  contentType: string;
  /** Raw JSON as returned – used for schema validation. */
  raw: unknown;
  /** Parsed articles (only populated when the schema validates). */
  articles: Article[];
  schemaErrors: string[];
}

/**
 * OneTrust cookie banner: appears on the first visit in every fresh context and
 * intercepts clicks. We register a locator handler so it is dismissed (choosing
 * "Reject all" – the privacy-preserving option) whenever it shows up, at any point
 * in a test, without every spec having to remember it.
 */
export async function autoDismissCookieBanner(page: Page): Promise<void> {
  const reject = page.locator('#onetrust-reject-all-handler');
  await page.addLocatorHandler(reject, async () => {
    await reject.click();
    await expect(page.locator('#onetrust-banner-sdk')).toBeHidden();
  });
}

type TestFixtures = {
  menuPage: MenuPage;
  productPage: ProductPage;
};

type WorkerFixtures = {
  /** One live snapshot of the menu API per worker, captured from a real page load. */
  menuApi: MenuApiSnapshot;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  page: async ({ page }, use) => {
    await autoDismissCookieBanner(page);
    await use(page);
  },

  menuPage: async ({ page }, use) => use(new MenuPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),

  menuApi: [
    async ({ browser }, use) => {
      const context = await browser.newContext({ locale: 'en-GB' });
      const page = await context.newPage();
      await autoDismissCookieBanner(page);

      // Capture the exact request the menu page makes, so we test what users get.
      const responsePromise = page
        .waitForResponse((r) => MENU_API_PATTERN.test(r.url()) && r.request().method() === 'GET', {
          timeout: 30_000,
        })
        .catch(() => null);
      await page.goto('/menu');
      const response = await responsePromise;

      let url: string;
      let status: number;
      let contentType: string;
      let raw: unknown;
      if (response) {
        url = response.url();
        status = response.status();
        contentType = response.headers()['content-type'] ?? '';
        raw = await response.json();
      } else {
        // The page may serve the menu from the SSR payload only; fall back to a direct call.
        const r = await context.request.get(FALLBACK_API_URL);
        url = r.url();
        status = r.status();
        contentType = r.headers()['content-type'] ?? '';
        raw = await r.json();
      }

      const parsed = MenuResponseSchema.safeParse(raw);
      const schemaErrors = parsed.success
        ? []
        : parsed.error.issues.slice(0, 25).map((i) => `${i.path.join('.')}: ${i.message}`);
      // Even if a few records are malformed, keep the rest usable for other tests.
      const articles = parsed.success ? parsed.data : (Array.isArray(raw) ? (raw as Article[]) : []);

      await context.close();
      await use({ url, status, contentType, raw, articles, schemaErrors });
    },
    { scope: 'worker' },
  ],
});

export { expect };
