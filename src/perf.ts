import type { Browser, Page } from '@playwright/test';
import { autoDismissCookieBanner } from './fixtures';

export interface PageMetrics {
  ttfb: number;
  domContentLoaded: number;
  load: number;
  lcp: number;
  cls: number;
  /** Sum of main-thread blocking time (long tasks beyond 50ms) up to load – a lab proxy for TBT. */
  tbt: number;
  transferKB: number;
  requests: number;
}

/** Budgets are lab-oriented and overridable from the environment for different runners. */
export const BUDGETS = {
  ttfb: Number(process.env.BUDGET_TTFB ?? 800),
  domContentLoaded: Number(process.env.BUDGET_DCL ?? 3000),
  load: Number(process.env.BUDGET_LOAD ?? 8000),
  lcp: Number(process.env.BUDGET_LCP ?? 4000), // Core Web Vitals "poor" threshold
  cls: Number(process.env.BUDGET_CLS ?? 0.1), // Core Web Vitals "good" threshold
  tbt: Number(process.env.BUDGET_TBT ?? 600),
};

/** Install observers before any page script runs so nothing is missed. */
const OBSERVERS = () => {
  const w = window as unknown as { __perf: { lcp: number; cls: number; tbt: number } };
  w.__perf = { lcp: 0, cls: 0, tbt: 0 };
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) w.__perf.lcp = Math.max(w.__perf.lcp, e.startTime);
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
      if (!e.hadRecentInput) w.__perf.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) w.__perf.tbt += Math.max(0, e.duration - 50);
  }).observe({ type: 'longtask', buffered: true });
};

export async function measure(browser: Browser, path: string): Promise<PageMetrics> {
  // Fresh context each time = cold cache, like a first-time visitor.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-GB' });
  const page: Page = await context.newPage();
  await autoDismissCookieBanner(page);
  await page.addInitScript(OBSERVERS);
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForTimeout(2500); // let LCP/CLS settle after load
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const res = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const p = (window as unknown as { __perf: { lcp: number; cls: number; tbt: number } }).__perf;
    return {
      ttfb: nav.responseStart - nav.startTime,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      load: nav.loadEventEnd - nav.startTime,
      lcp: p.lcp,
      cls: p.cls,
      tbt: p.tbt,
      transferKB: Math.round((nav.transferSize + res.reduce((s, r) => s + (r.transferSize || 0), 0)) / 1024),
      requests: res.length + 1,
    };
  });
  await context.close();
  return m;
}

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function medianMetrics(runs: PageMetrics[]): PageMetrics {
  const keys = Object.keys(runs[0]) as (keyof PageMetrics)[];
  return Object.fromEntries(keys.map((k) => [k, Math.round(median(runs.map((r) => r[k])) * 1000) / 1000])) as unknown as PageMetrics;
}
