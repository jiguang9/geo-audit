#!/usr/bin/env node
'use strict';

/**
 * ci-check — run a GEO audit in CI and optionally fail below a score threshold.
 *
 * Designed for the bundled GitHub Action (action.yml), but works anywhere:
 *
 *   node tools/ci-check.js <url> [--min-score 60] [--brand "Brand"] [--lang en]
 *
 * Env vars (take precedence, used by action.yml): GEO_URL, GEO_BRAND,
 * GEO_MIN_SCORE, GEO_LANG.
 *
 * Behaviour:
 *   - prints the normalized GEO score (0-100) and per-dimension results
 *   - appends a Markdown summary to $GITHUB_STEP_SUMMARY when set
 *   - exits 1 if the normalized score is below --min-score (default 0 = never fail)
 */

const { runAudit } = require('./audit.js');
const { renderReport } = require('./report.js');
const fs = require('fs');

function parseCliArgs(argv) {
  const args = argv.slice(2);
  const flags = {};
  const valueIndices = new Set();
  for (let i = 0; i < args.length; i++) {
    const m = /^--(min-score|brand|lang)$/.exec(args[i]);
    if (m && args[i + 1] !== undefined) {
      flags[m[1]] = args[i + 1];
      valueIndices.add(i + 1);
      i++;
    }
  }
  const url = args.find((a, i) => !a.startsWith('--') && !valueIndices.has(i));
  return { url, flags };
}

async function main() {
  const { url: cliUrl, flags } = parseCliArgs(process.argv);

  const url = process.env.GEO_URL || cliUrl;
  const brand = process.env.GEO_BRAND || flags.brand || '';
  const lang = (process.env.GEO_LANG || flags.lang || 'en').toLowerCase();
  const minScore = parseInt(process.env.GEO_MIN_SCORE || flags['min-score'] || '0', 10);

  if (!url) {
    console.error('Usage: node tools/ci-check.js <url> [--min-score N] [--brand "Brand"] [--lang en|zh]');
    console.error('   or: GEO_URL=... GEO_MIN_SCORE=... node tools/ci-check.js');
    process.exit(2);
  }

  const context = {};
  if (brand) context.brand = brand;
  if (['zh', 'en'].includes(lang)) context.lang = lang;

  const result = await runAudit(url, context);
  const s = result.scoreData;
  const normalized = Math.round((s.total / s.totalMax) * 100);
  const d = s.dimensions;

  // A `block` verdict (e.g. AI crawlers blocked / page unreachable) means the
  // page cannot be cited at all — fail CI regardless of the numeric threshold.
  const blocked = s.verdict === 'block';
  const pass = normalized >= minScore && !blocked;
  const statusLine = blocked
    ? `GEO score: ${normalized}/100 — FAIL ❌ (verdict: blocked${s.capped ? `, raw ${s.rawTotal}` : ''})`
    : minScore > 0
      ? `GEO score: ${normalized}/100 (threshold: ${minScore}) — ${pass ? 'PASS ✅' : 'FAIL ❌'}`
      : `GEO score: ${normalized}/100 (raw: ${s.total}/${s.totalMax}, Level ${s.level})`;

  console.log(statusLine);
  console.log(`  Structure:  ${d.structure.raw}/${d.structure.max}`);
  console.log(`  Authority:  ${d.authority.raw}/${d.authority.max}`);
  console.log(`  Presence:   ${d.presence.raw !== null ? d.presence.raw + '/' + d.presence.max : 'unknown'}`);
  console.log(`  Technical:  ${d.technical.raw}/${d.technical.max}`);

  // Full Markdown report into the GitHub Actions job summary
  if (process.env.GITHUB_STEP_SUMMARY) {
    const report = renderReport(s, { ...result, url: result.url, lang: context.lang });
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${statusLine}\n\n${report}\n`, 'utf8');
  }

  if (!pass) {
    if (blocked) {
      console.error(`\nVerdict is "blocked": AI systems cannot currently fetch or cite this page.`);
    } else {
      console.error(`\nGEO score ${normalized} is below the required minimum of ${minScore}.`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('ci-check failed:', err.message);
    process.exit(2);
  });
}

module.exports = { parseCliArgs };
