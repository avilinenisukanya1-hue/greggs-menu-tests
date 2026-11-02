# Reports

Each run writes here (`npm test` → `reports/`, `npm run test:perf` → `reports/perf/`):

- `html/` - Playwright HTML report (open with `npm run report` / `npm run report:perf`)
- `junit.xml` - JUnit results
- `results.json` - raw Playwright JSON
- `SUMMARY.md` - readable summary (`npm run summary` / `npm run summary:perf`): counts per project, known defects exercised, Web Vitals and other measurements

Only the two `SUMMARY.md` files from the latest local run are committed, so the results can be read without running the suite. Everything else is regenerated per run; CI uploads it as a build artifact and publishes the HTML report to GitHub Pages.
