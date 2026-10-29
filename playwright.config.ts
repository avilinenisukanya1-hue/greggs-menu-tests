import { defineConfig, devices } from '@playwright/test';

/**
 * Greggs Menu – Playwright configuration
 *
 * Projects are split by concern so each can be run (and reported) independently:
 *   - functional / data  : desktop Chromium, the bulk of the suite
 *   - a11y               : desktop Chromium, axe-core + keyboard checks
 *   - responsive         : runs the layout specs at phone/tablet/desktop sizes
 *   - mobile-functional  : smoke of the core journeys on real device emulation (Pixel 7 + iPhone 14)
 *   - performance        : single worker, no retries, so timings aren't skewed by parallel load
 */
const BASE_URL = process.env.BASE_URL ?? 'https://www.greggs.com';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  // Be a polite guest on a production site.
  workers: isCI ? 2 : 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit.xml' }],
    ['json', { outputFile: 'reports/results.json' }],
  ],
  outputDir: 'reports/artifacts',
  use: {
    baseURL: BASE_URL,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // A normal desktop UA – some CDNs challenge the default HeadlessChrome UA.
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  },
  projects: [
    {
      name: 'functional',
      testMatch: /(functional|data)\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'a11y',
      testMatch: /accessibility\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
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
    {
      name: 'performance',
      testMatch: /performance\/.*\.spec\.ts/,
      fullyParallel: false,
      retries: 0,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
});
