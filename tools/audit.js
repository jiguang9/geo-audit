#!/usr/bin/env node
'use strict';

/**
 * geo-audit — main CLI entry point
 *
 * Usage:
 *   node tools/audit.js <url> [--json] [--format markdown]
 *
 * Options:
 *   --json            Output structured JSON (default: Markdown)
 *   --format markdown Explicitly request Markdown output
 */

const { checkRobots } = require('./robots-checker.js');
const { checkLlmsTxt } = require('./llms-txt-checker.js');
const { inspectSchema } = require('./schema-inspector.js');
const { checkContentStructure } = require('./content-structure.js');
const { computeGeoScore } = require('./score.js');
const { renderReport } = require('./report.js');
const { normalizeUrl, isPublicUrl } = require('./shared/url.js');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const url = args.find(a => !a.startsWith('--'));
  const json = args.includes('--json');
  const format = json ? 'json' : 'markdown';
  return { url, format };
}

function loadContext(startDir) {
  const candidates = [
    path.join(startDir, '.agents', 'geo-audit-context.md'),
    path.join(startDir, '.agents', 'geo-audit-context.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      // Parse simple key: value markdown format
      const ctx = {};
      for (const line of raw.split('\n')) {
        const m = /^[-*]?\s*\*?\*?(\w+)\*?\*?\s*[:：]\s*(.+)/.exec(line.trim());
        if (m) ctx[m[1].toLowerCase()] = m[2].trim();
      }
      return ctx;
    }
  }
  return null;
}

async function runAudit(siteUrl, context) {
  if (!isPublicUrl(siteUrl)) {
    throw new Error('URL must be a publicly accessible site (no localhost, private IPs, or .internal domains).');
  }

  const url = normalizeUrl(siteUrl);

  // Run all checks concurrently
  const [robotsResult, llmsResult, schemaResult, contentResult] = await Promise.all([
    checkRobots(url),
    checkLlmsTxt(url),
    inspectSchema(url),
    checkContentStructure(url),
  ]);

  // Third-party presence requires user-provided evidence — not automated
  let presenceEvidence = {};
  if (context?.presence) {
    try {
      presenceEvidence = JSON.parse(context.presence);
    } catch (_) {
      // presence field is free-text (e.g. "有知乎，有媒体报道") — treat as unknown
      presenceEvidence = {};
    }
  }

  const scoreData = computeGeoScore({ robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence });

  return { url, scoreData, robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, context };
}

async function main() {
  const { url, format } = parseArgs(process.argv);

  if (!url) {
    console.error([
      'geo-audit — GEO (Generative Engine Optimization) diagnostic tool',
      '',
      'Usage:',
      '  node tools/audit.js <url>          # Markdown report',
      '  node tools/audit.js <url> --json   # JSON output',
      '',
      'Examples:',
      '  node tools/audit.js https://example.com',
      '  node tools/audit.js https://example.com --json',
    ].join('\n'));
    process.exit(1);
  }

  // Try to load context from the current working directory (user's project)
  const context = loadContext(process.cwd());

  if (!context) {
    process.stderr.write(
      'Note: No .agents/geo-audit-context.md found in current directory.\n' +
      'Third-party presence dimension will be marked as unknown.\n' +
      'See README.md for context file format.\n\n'
    );
  }

  try {
    const result = await runAudit(url, context || {});

    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const report = renderReport(result.scoreData, { ...result, url: result.url });
      console.log(report);
    }
  } catch (err) {
    console.error('Audit failed:', err.message);
    process.exit(1);
  }
}

main();

module.exports = { runAudit, loadContext };
