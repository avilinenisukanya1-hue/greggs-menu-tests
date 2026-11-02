import { defineConfig, devices, type PlaywrightTestConfig, type ReporterDescription } from '@playwright/test';

/**
 * Greggs Menu - Playwright configuration
 *
 * Projects are split by concern so each can be run (and reported) independently:
 *   - functional / data  : desktop Chromium, the bulk of the suite
 *   - a11y               : desktop Chromium, axe-core + keyboard checks
 *   - responsive         : runs the layout specs at phone/tablet/desktop sizes
 *   - mobile-android/ios : smoke of the core journeys on device emulation (Pixel 7 + iPhone 14)
 *
 * Performance specs have their own config (playwright.perf.config.ts): timings taken while
 * the functional suite loads the same site in parallel are noise, not signal.
 */
const BASE_URL = process.env.BASE_URL ?? 'https://www.greggs.com';
const isCI = !!process.env.CI;

export const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export function reporters(dir: string): ReporterDescription[] {
  return [
    ['list'],
    ['html', { outputFolder: `${dir}/html`, open: 'never' }],
    ['junit', { outputFile: `${dir}/junit.xml` }],
    ['json', { outputFile: `${dir}/results.json` }],
  ];
}

export const shared: PlaywrightTestConfig = {
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: isCI,
  use: {
    baseURL: BASE_URL,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // A normal desktop UA - some CDNs challenge the default HeadlessChrome UA.
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  },
};

export default defineConfig({
  ...shared,
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  // Production site: keep concurrency low. At 3 workers the menu API slowed to >5s and
  // first-load assertions started timing out.
  workers: 2,
  reporter: reporters('reports'),
  outputDir: 'reports/artifacts',
  projects: [
    {
      name: 'functional',
      testMatch: /(functional|data)\/.*\.spec\.ts/,
      use: desktop,
    },
    {
      name: 'a11y',
      testMatch: /accessibility\/.*\.spec\.ts/,
      use: desktop,
    },
    {
      name: 'responsive',
      testMatch: /responsive\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-android',
      testMatch: /functional\/(menu-page|category-filter|product-navigation)\.spec\.ts/,
      grep: /@smoke/,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-ios',
      testMatch: /functional\/(menu-page|category-filter|product-navigation)\.spec\.ts/,
      grep: /@smoke/,
      use: { ...devices['iPhone 14'] },
    },
  ],
});
