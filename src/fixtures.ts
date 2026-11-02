import { test as base, expect } from '@playwright/test';
import { MENU_API_PATTERN, MenuResponseSchema, type Article } from './api/menu-api';
import { autoDismissCookieBanner, presetCookieConsent } from './cookie-banner';
import { MenuPage } from './pages/menu-page';
import { ProductPage } from './pages/product-page';

const FALLBACK_API_URL =
  'https://production-digital.greggs.co.uk/api/v1.0/articles/masters' +
  '?ExcludeUnpublished=true&ExcludeDuplicates=true&ExcludeHiddenFromMenu=true';

export interface MenuApiSnapshot {
  url: string;
  status: number;
  contentType: string;
  /** Raw JSON as returned - used for schema validation. */
  raw: unknown;
  /** Parsed articles (falls back to the raw array if a few records fail the schema). */
  articles: Article[];
  schemaErrors: string[];
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
    await presetCookieConsent(page.context());
    await autoDismissCookieBanner(page);
    await use(page);
  },

  menuPage: async ({ page }, use) => use(new MenuPage(page)),
  productPage: async ({ page }, use) => use(new ProductPage(page)),

  menuApi: [
    async ({ browser }, use, workerInfo) => {
      // Worker-scoped contexts don't get the project's `use` options, so pass the ones we rely on.
      const { baseURL, userAgent, locale } = workerInfo.project.use;
      const context = await browser.newContext({ baseURL, userAgent, locale });
      await presetCookieConsent(context);

      let snapshot: MenuApiSnapshot;
      try {
        const page = await context.newPage();
        await autoDismissCookieBanner(page);

        // Capture the exact request the menu page makes, so we test what users actually get.
        const responsePromise = page
          .waitForResponse((r) => MENU_API_PATTERN.test(r.url()) && r.request().method() === 'GET', {
            timeout: 30_000,
          })
          .catch(() => null);
        await page.goto('/menu');
        // The page may serve the menu from the SSR payload only; if so, call the API directly.
        const response = (await responsePromise) ?? (await context.request.get(FALLBACK_API_URL));

        const raw: unknown = await response.json();
        const parsed = MenuResponseSchema.safeParse(raw);
        snapshot = {
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type'] ?? '',
          raw,
          // Keep the data usable for other specs even if a few records are malformed;
          // the contract spec reports the schema errors.
          articles: parsed.success ? parsed.data : Array.isArray(raw) ? (raw as Article[]) : [],
          schemaErrors: parsed.success
            ? []
            : parsed.error.issues.slice(0, 25).map((i) => `${i.path.join('.')}: ${i.message}`),
        };
      } finally {
        await context.close();
      }
      await use(snapshot);
    },
    { scope: 'worker' },
  ],
});

export { expect };
