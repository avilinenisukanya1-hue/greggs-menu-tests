# Greggs Menu - Test Run Summary

Run started: 2026-11-02T14:40:53.439Z | Duration: 158s

**113 tests**: 101 passed, 12 known defects (expected failures), 0 failed, 0 flaky, 0 skipped

## By project

| Project | Passed | Known defects | Failed | Flaky | Skipped |
|---|---|---|---|---|---|
| functional | 61 | 7 | 0 | 0 | 0 |
| mobile-android | 5 | 0 | 0 | 0 | 0 |
| mobile-ios | 5 | 0 | 0 | 0 | 0 |
| a11y | 10 | 4 | 0 | 0 | 0 |
| responsive | 20 | 1 | 0 | 0 | 0 |

## Known defects exercised

- GM-001: Calorie slider max (4000 kcal) is below the highest-calorie product; at max it hides that product (see docs/FINDINGS.md)
- GM-002: Selected category pill is not exposed to assistive tech (no aria-pressed / aria-current) (see docs/FINDINGS.md)
- GM-003: Calorie range slider has no accessible name (see docs/FINDINGS.md)
- GM-003: axe "label" (1 nodes)
- GM-004: Filter dialog close (X) button has no accessible name (see docs/FINDINGS.md)
- GM-004: axe "button-name" (1 nodes)
- GM-005: axe "color-contrast" (1 nodes)
- GM-005: axe "color-contrast" (8 nodes)
- GM-006: Category changes replace history - browser Back leaves the menu instead of the previous category (see docs/FINDINGS.md)
- GM-007: Nutrition table has no header cells (<th>), so values are not associated with their column/row (see docs/FINDINGS.md)
- GM-008: Product page scrolls horizontally at 320px (decorative SVG overflows the viewport by 68px) (see docs/FINDINGS.md)
- GM-010: Product names in the menu data carry trailing whitespace (leaks into card titles and image alt text) (see docs/FINDINGS.md)
- GM-011: Some products have sortOrder: null in the menu data, so their position in the grid is undefined (see docs/FINDINGS.md)
- GM-012: Product images are served as application/octet-stream instead of image/png (see docs/FINDINGS.md)

## Measurements & observations

- kJ rounding drift (within 2% / 10 kJ): Bacon Breakfast Roll: page 1348 vs API 1349 kJ; Apple & Cinnamon Flavour Porridge (Ready to eat): page 974 vs API 971 kJ; Sausage Roll: page 1457 vs API 1446 kJ; Spicy Chicken Pizza: page 2885 vs API 2880 kJ; Regular Americano: page 38 vs API 40 kJ; Free Range Egg Pot: page 533 vs API 527 kJ; Roast Chicken Mayonnaise Baguette: page 1924 vs API 1928 kJ; BBQ Chicken & Bacon Pasta: page 2045 vs API 2046 kJ; Caramel Custard Doughnut (New Recipe): page 1189 vs API 1188 kJ; Pineapple Fruit Pot: page 231 vs API 233 kJ; 6 Slice Margherita Pizza Box: page 14759 vs API 14717 kJ; Hot Chocolate Brownies : page 3184 vs API 3168 kJ; 6 Slice Pepperoni Pizza Box: page 16124 vs API 16058 kJ
- slider max=4000, highest product=4012 kcal
