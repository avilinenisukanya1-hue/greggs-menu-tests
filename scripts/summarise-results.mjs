#!/usr/bin/env node
/**
 * Turns Playwright's JSON report into a human-readable Markdown summary
 * (reports/SUMMARY.md). In GitHub Actions it is also appended to the job summary.
 *
 * Usage: node scripts/summarise-results.mjs [reports/results.json]
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const input = process.argv[2] ?? 'reports/results.json';
const report = JSON.parse(readFileSync(input, 'utf8'));

const rows = [];
const walk = (suite, trail = []) => {
  const here = suite.title ? [...trail, suite.title] : trail;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const last = t.results.at(-1) ?? {};
      rows.push({
        project: t.projectName,
        file: spec.file,
        title: [...here.slice(1), spec.title].join(' › '),
        outcome: t.status, // expected | unexpected | flaky | skipped
        status: last.status,
        duration: last.duration ?? 0,
        annotations: t.annotations ?? [],
        error: last.error?.message?.split('\n')[0],
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
};
report.suites.forEach((s) => walk(s));

const by = (k) => rows.reduce((m, r) => ((m[r[k]] ??= []).push(r), m), {});
const count = (list, pred) => list.filter(pred).length;
const passed = (r) => r.outcome === 'expected' && r.status === 'passed';
const knownFail = (r) => r.outcome === 'expected' && r.status === 'failed';
const failed = (r) => r.outcome === 'unexpected';
const flaky = (r) => r.outcome === 'flaky';
const skipped = (r) => r.outcome === 'skipped';

const started = report.stats?.startTime ? new Date(report.stats.startTime).toISOString() : 'n/a';
const lines = [];
lines.push('# Greggs Menu – Test Run Summary', '');
lines.push(`Run started: ${started} · Duration: ${Math.round((report.stats?.duration ?? 0) / 1000)}s`, '');
lines.push(
  `**${rows.length} tests** · ✅ ${count(rows, passed)} passed · 🐞 ${count(rows, knownFail)} known defects (expected failures) · ❌ ${count(rows, failed)} failed · ⚠️ ${count(rows, flaky)} flaky · ⏭️ ${count(rows, skipped)} skipped`,
  '',
);

lines.push('## By project', '', '| Project | Passed | Known defects | Failed | Flaky | Skipped |', '|---|---|---|---|---|---|');
for (const [project, list] of Object.entries(by('project'))) {
  lines.push(`| ${project} | ${count(list, passed)} | ${count(list, knownFail)} | ${count(list, failed)} | ${count(list, flaky)} | ${count(list, skipped)} |`);
}

const unexpected = rows.filter((r) => failed(r) && r.status !== 'passed');
if (unexpected.length) {
  lines.push('', '## ❌ Unexpected failures', '');
  for (const r of unexpected) lines.push(`- **[${r.project}] ${r.title}** — ${r.error ?? r.status}`);
}

const fixedDefects = rows.filter((r) => r.outcome === 'unexpected' && r.status === 'passed');
if (fixedDefects.length) {
  lines.push('', '## 🎉 Known defects that now pass (remove `test.fail`)', '');
  for (const r of fixedDefects) lines.push(`- [${r.project}] ${r.title}`);
}

const defects = new Set(rows.flatMap((r) => r.annotations.filter((a) => a.type === 'known-defect').map((a) => a.description)));
if (defects.size) {
  lines.push('', '## 🐞 Known defects exercised', '');
  for (const d of [...defects].sort()) lines.push(`- ${d}`);
}

const metrics = rows.flatMap((r) => r.annotations.filter((a) => ['metrics', 'observation', 'data'].includes(a.type)).map((a) => a.description));
if (metrics.length) {
  lines.push('', '## 📈 Measurements & observations', '');
  for (const m of [...new Set(metrics)]) lines.push(`- ${m}`);
}

const md = lines.join('\n') + '\n';
writeFileSync('reports/SUMMARY.md', md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
console.log(md);
