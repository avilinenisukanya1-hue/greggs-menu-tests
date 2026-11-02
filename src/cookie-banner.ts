import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * Pre-sets OneTrust's own consent cookies ("necessary only" - the same state as clicking
 * "Reject all") so the banner never renders. This matters for keyboard tests: OneTrust
 * loads late, and if the banner appears mid-test, Tab walks into it.
 */
export async function presetCookieConsent(context: BrowserContext): Promise<void> {
  const now = new Date().toISOString();
  const groups = encodeURIComponent('C0001:1,C0002:0,C0003:0,C0004:0');
  await context.addCookies(
    ['.greggs.com', '.greggs.co.uk'].flatMap((domain) => [
      { name: 'OptanonAlertBoxClosed', value: now, domain, path: '/' },
      {
        name: 'OptanonConsent',
        value: `isGpcEnabled=0&datestamp=${encodeURIComponent(now)}&interactionCount=1&landingPath=NotLandingPage&groups=${groups}&AwaitingReconsent=false`,
        domain,
        path: '/',
      },
    ]),
  );
}

/**
 * Fallback in case OneTrust ignores the preset cookies (e.g. after a consent version bump):
 * dismisses the banner with "Reject all" whenever it blocks a Playwright action.
 */
export async function autoDismissCookieBanner(page: Page): Promise<void> {
  const reject = page.locator('#onetrust-reject-all-handler');
  await page.addLocatorHandler(reject, async () => {
    await reject.click();
    await expect(page.locator('#onetrust-banner-sdk')).toBeHidden();
  });
}
