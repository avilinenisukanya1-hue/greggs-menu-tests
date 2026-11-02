import { defineConfig } from '@playwright/test';
import { desktop, reporters, shared } from './playwright.config';

/**
 * Performance run: one worker, no retries, nothing else hitting the site at the same time.
 * Kept out of the main config so `npm test` timings can't skew the budgets (and vice versa).
 * Reports go to reports/perf/ so they don't overwrite the functional run's.
 */
export default defineConfig({
  ...shared,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: reporters('reports/perf'),
  outputDir: 'reports/perf/artifacts',
  projects: [
    {
      name: 'performance',
      testMatch: /performance\/.*\.spec\.ts/,
      use: desktop,
    },
  ],
});
