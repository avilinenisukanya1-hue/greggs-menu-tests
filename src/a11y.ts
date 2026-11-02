import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type TestInfo } from '@playwright/test';
import { KNOWN_AXE_RULES } from './data/known-defects';

export const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

export interface AxeSummary {
  id: string;
  impact: string | null | undefined;
  help: string;
  nodes: number;
  examples: string[];
  knownDefect?: string;
}

/**
 * Runs axe-core (WCAG 2.2 AA rule set) against `include` and attaches the full
 * result to the test report. Third-party widgets we don't own (OneTrust cookie
 * centre, reCAPTCHA) are excluded so findings are actionable by the Greggs team.
 */
export async function scanA11y(page: Page, testInfo: TestInfo, include = 'main'): Promise<AxeSummary[]> {
  const results = await new AxeBuilder({ page })
    .include(include)
    .exclude('#onetrust-consent-sdk')
    .exclude('iframe[src*="recaptcha"]')
    .withTags(WCAG_TAGS)
    .analyze();

  const summary: AxeSummary[] = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    examples: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    knownDefect: KNOWN_AXE_RULES.get(v.id),
  }));

  await testInfo.attach(`axe-${include.replace(/\W+/g, '_')}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: 'application/json',
  });
  for (const s of summary.filter((x) => x.knownDefect)) {
    testInfo.annotations.push({ type: 'known-defect', description: `${s.knownDefect}: axe "${s.id}" (${s.nodes} nodes)` });
  }
  return summary;
}

/** Fails on any violation not already logged as a known defect. */
export function expectNoNewViolations(summary: AxeSummary[]): void {
  const fresh = summary.filter((v) => !v.knownDefect);
  expect(fresh, JSON.stringify(fresh, null, 2)).toEqual([]);
}
