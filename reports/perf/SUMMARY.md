# Greggs Menu - Test Run Summary

Run started: 2026-11-02T14:40:10.753Z | Duration: 33s

**6 tests**: 4 passed, 2 known defects (expected failures), 0 failed, 0 flaky, 0 skipped

## By project

| Project | Passed | Known defects | Failed | Flaky | Skipped |
|---|---|---|---|---|---|
| performance | 4 | 2 | 0 | 0 | 0 |

## Known defects exercised

- GM-009: Product thumbnails are up to 860KB (512px PNGs shown at ~190px) (see docs/FINDINGS.md)
- GM-013: Menu page CLS ~0.13: the product grid renders without reserved space and pushes content below it off-screen (see docs/FINDINGS.md)

## Measurements & observations

- menu: TTFB 190.4ms | DCL 650.7ms | LCP 672ms | CLS 0.134 | TBT 6ms | 5329KB / 109 req
- product: TTFB 155.9ms | DCL 1032.1ms | LCP 616ms | CLS 0.053 | TBT 15ms | 5061KB / 82 req
- menu API: 847ms, 473KB uncompressed
- 8/143 thumbnails fetched before scrolling
- category switch rendered in 140ms
- largest thumbnails: 6 Slice Pepperoni Pizza with Hot Honey Pizza Box 860KB, Large Salted Caramel Latte 740KB, Spooky Bun (4 pack) 700KB
