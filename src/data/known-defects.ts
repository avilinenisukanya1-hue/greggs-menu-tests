/**
 * Defects found while building this suite (exploratory session, 29 Oct 2026).
 *
 * Tests that exercise a known defect are written to assert the CORRECT behaviour
 * and are marked with `test.fail()` + an annotation pointing here. That means:
 *   - the suite stays green while the defect exists (it is "expected to fail"),
 *   - the moment Greggs fixes it, Playwright reports "unexpectedly passed",
 *     prompting us to remove the marker – the test then guards against regression.
 *
 * Full write-ups (steps, evidence, impact) are in docs/FINDINGS.md.
 */
export interface KnownDefect {
  id: string;
  title: string;
  severity: 'High' | 'Medium' | 'Low';
  /** axe-core rule ids this defect accounts for, if any. */
  axeRules?: string[];
}

export const DEFECTS = {
  CALORIE_SLIDER_MAX: {
    id: 'GM-001',
    title: 'Calorie slider max (4000 kcal) is below the highest-calorie product; at max it hides that product',
    severity: 'Medium',
  },
  PILL_STATE_NOT_EXPOSED: {
    id: 'GM-002',
    title: 'Selected category pill is not exposed to assistive tech (no aria-pressed / aria-current)',
    severity: 'Medium',
  },
  SLIDER_NO_NAME: {
    id: 'GM-003',
    title: 'Calorie range slider has no accessible name',
    severity: 'High',
    axeRules: ['label'],
  },
  DIALOG_CLOSE_NO_NAME: {
    id: 'GM-004',
    title: 'Filter dialog close (X) button has no accessible name',
    severity: 'High',
    axeRules: ['button-name'],
  },
  COLOUR_CONTRAST: {
    id: 'GM-005',
    title: 'Text fails WCAG AA colour contrast (e.g. "Delivery" promo 2.52:1, slider value label)',
    severity: 'Medium',
    axeRules: ['color-contrast'],
  },
  CATEGORY_HISTORY: {
    id: 'GM-006',
    title: 'Category changes replace history – browser Back leaves the menu instead of the previous category',
    severity: 'Low',
  },
  NUTRITION_TABLE_HEADERS: {
    id: 'GM-007',
    title: 'Nutrition table has no header cells (<th>), so values are not associated with their column/row',
    severity: 'Medium',
  },
} as const satisfies Record<string, KnownDefect>;

/** axe rule ids already covered by a logged defect – reported, but not failed on twice. */
export const KNOWN_AXE_RULES: ReadonlyMap<string, string> = new Map(
  Object.values(DEFECTS).flatMap((d) => ('axeRules' in d ? d.axeRules.map((r) => [r, d.id] as const) : [])),
);

export function defectAnnotation(d: KnownDefect) {
  return { type: 'known-defect', description: `${d.id}: ${d.title} (see docs/FINDINGS.md)` };
}
