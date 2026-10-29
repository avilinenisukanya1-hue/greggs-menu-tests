import { test, expect } from '../../src/fixtures';
import { BUDGETS, measure, medianMetrics, type PageMetrics } from '../../src/perf';
import { MENU_API_PATTERN } from '../../src/api/menu-api';

/**
 * Lab performance checks against a live production site.
 * Each page is loaded RUNS times from a cold cache and the median is asserted, which
 * smooths out network noise. Results are attached as JSON for trend tracking.
 * Lab numbers on a CI runner are not field data – see README "Limitations".
 */
const RUNS = Number(process.env.PERF_RUNS ?? 3);

async function assertBudgets(name: string, runs: PageMetrics[]) {
  const m = medianMetrics(runs);
  await test.info().attach(`${name}-metrics.json`, {
    body: JSON.stringify({ median: m, runs, budgets: BUDGETS }, null, 2),
    contentType: 'application/json',
  });
  test.info().annotations.push({
    type: 'metrics',
    description: `${name}: TTFB ${m.ttfb}ms · DCL ${m.domContentLoaded}ms · LCP ${m.lcp}ms · CLS ${m.cls} · TBT ${m.tbt}ms · ${m.transferKB}KB / ${m.requests} req`,
  });
  expect.soft(m.ttfb, 'TTFB (ms)').toBeLessThanOrEqual(BUDGETS.ttfb);
  expect.soft(m.domContentLoaded, 'DOMContentLoaded (ms)').toBeLessThanOrEqual(BUDGETS.domContentLoaded);
  expect.soft(m.load, 'load (ms)').toBeLessThanOrEqual(BUDGETS.load);
  expect.soft(m.lcp, 'LCP (ms)').toBeLessThanOrEqual(BUDGETS.lcp);
  expect.soft(m.cls, 'CLS').toBeLessThanOrEqual(BUDGETS.cls);
  expect.soft(m.tbt, 'TBT (ms)').toBeLessThanOrEqual(BUDGETS.tbt);
}

test.describe('Performance – page load (median of cold loads)', () => {
  test('menu page meets load and Core Web Vitals budgets', async ({ browser }) => {
    test.setTimeout(RUNS * 45_000);
    const runs: PageMetrics[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, '/menu'));
    await assertBudgets('menu', runs);
  });

  test('product detail page meets load and Core Web Vitals budgets', async ({ browser }) => {
    test.setTimeout(RUNS * 45_000);
    const runs: PageMetrics[] = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, '/menu/product/sausage-roll-1000446'));
    await assertBudgets('product', runs);
  });
});

test.describe('Performance – behaviour', () => {
  test('menu API responds quickly', async ({ page }) => {
    const start = Date.now();
    const [res] = await Promise.all([page.waitForResponse(MENU_API_PATTERN), page.goto('/menu')]);
    const timing = res.request().timing();
    const ms = timing.responseEnd > 0 ? timing.responseEnd - timing.requestStart : Date.now() - start;
    const kb = Math.round((await res.body()).length / 1024);
    test.info().annotations.push({ type: 'metrics', description: `menu API: ${Math.round(ms)}ms, ${kb}KB uncompressed` });
    expect(ms).toBeLessThan(2000);
  });

  test('below-the-fold product images are lazy-loaded', async ({ page, menuPage }) => {
    const requested = new Set<string>();
    page.on('request', (r) => {
      if (/articles\.greggs\.co\.uk\/images\/\d+-thumb/.test(r.url())) requested.add(r.url());
    });
    await menuPage.goto();
    await page.waitForLoadState('networkidle').catch(() => {});
    const total = await menuPage.cards.count();
    test.info().annotations.push({ type: 'metrics', description: `${requested.size}/${total} thumbnails fetched before scrolling` });
    // Only roughly the first screenful should be fetched up-front.
    expect(requested.size).toBeLessThan(total * 0.5);
  });

  test('switching category is client-side and fast (no full page reload)', async ({ page, menuPage }) => {
    await menuPage.goto();
    let documentRequests = 0;
    page.on('request', (r) => {
      if (r.resourceType() === 'document') documentRequests++;
    });
    const t0 = Date.now();
    await menuPage.pill('Sweet Treats').click();
    await expect(menuPage.sectionHeading('Breakfast')).toBeHidden();
    const elapsed = Date.now() - t0;
    test.info().annotations.push({ type: 'metrics', description: `category switch rendered in ${elapsed}ms` });
    expect(documentRequests).toBe(0);
    expect(elapsed).toBeLessThan(1000);
  });

  test('product thumbnails are reasonably sized for a grid', async ({ menuApi, request }) => {
    const sample = menuApi.articles.filter((_, i) => i % 10 === 0); // every 10th product
    const sizes: { name: string; kb: number }[] = [];
    for (const a of sample) {
      const r = await request.get(a.thumbnailUri);
      sizes.push({ name: a.articleName, kb: Math.round((await r.body()).length / 1024) });
    }
    sizes.sort((x, y) => y.kb - x.kb);
    test.info().annotations.push({ type: 'metrics', description: `largest thumbnails: ${sizes.slice(0, 3).map((s) => `${s.name} ${s.kb}KB`).join(', ')}` });
    const tooBig = sizes.filter((s) => s.kb > 250);
    expect.soft(tooBig, 'thumbnails over 250KB').toEqual([]);
  });
});
