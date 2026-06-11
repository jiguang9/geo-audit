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
const { renderHtmlReport } = require('./report-html.js');
const { normalizeUrl, isPublicUrl, getHostname } = require('./shared/url.js');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  const url = args.find(a => !a.startsWith('--'));
  const json = args.includes('--json');
  const html = args.includes('--html');
  const format = json ? 'json' : html ? 'html' : 'markdown';

  // Named flags: --brand "深信服" --industry SaaS --market China
  const namedFlags = {};
  for (let i = 0; i < args.length; i++) {
    const m = /^--(brand|industry|market|platforms|queries|competitors)$/.exec(args[i]);
    if (m && args[i + 1] && !args[i + 1].startsWith('--')) {
      namedFlags[m[1]] = args[i + 1];
      i++;
    }
  }

  return { url, format, namedFlags };
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
  const { url, format, namedFlags } = parseArgs(process.argv);

  if (!url) {
    console.error([
      'geo-audit — GEO (Generative Engine Optimization) diagnostic tool',
      '',
      'Usage:',
      '  node tools/audit.js <url>                        # Markdown report',
      '  node tools/audit.js <url> --html                 # HTML report (file)',
      '  node tools/audit.js <url> --html --brand "深信服" # HTML with brand name',
      '  node tools/audit.js <url> --json                 # JSON output',
      '',
      'Named flags (all optional):',
      '  --brand <name>       Brand name shown in the report',
      '  --industry <type>    SaaS / ecommerce / media / B2B / local',
      '  --market <market>    China / US / global',
      '',
      'Examples:',
      '  node tools/audit.js https://example.com --html --brand "Acme"',
    ].join('\n'));
    process.exit(1);
  }

  // Load context file, then overlay any CLI-provided named flags
  const fileContext = loadContext(process.cwd());
  const context = { ...(fileContext || {}), ...namedFlags };

  if (!fileContext && Object.keys(namedFlags).length === 0) {
    process.stderr.write(
      'Note: No .agents/geo-audit-context.md found and no --brand flag provided.\n' +
      'Third-party presence dimension will be marked as unknown.\n' +
      'See README.md for context file format.\n\n'
    );
  }

  try {
    const result = await runAudit(url, context);

    if (format === 'json') {
      console.log(JSON.stringify(result, null, 2));
    } else if (format === 'html') {
      const html = renderHtmlReport(result.scoreData, { ...result, url: result.url });
      const domain = getHostname(result.url).replace(/[^a-z0-9.-]/gi, '-');
      const date = new Date().toISOString().slice(0, 10);
      const outFile = path.join(process.cwd(), `geo-audit-${domain}-${date}.html`);
      fs.writeFileSync(outFile, html, 'utf8');

      // Print compact summary to stdout so Agent can show key results inline
      const d = result.scoreData.dimensions;
      const presenceNote = result.scoreData.presenceUnknown ? ' (presence not assessed)' : '';
      console.log([
        `## GEO Audit — ${result.context?.brand || result.url}`,
        `**GEO Score: ${result.scoreData.total}/100${presenceNote} · Level ${result.scoreData.level}**`,
        '',
        `| Dimension | Score |`,
        `|-----------|-------|`,
        `| Structure extractability | ${d.structure.raw}/${d.structure.max} |`,
        `| Authority / credibility  | ${d.authority.raw}/${d.authority.max} |`,
        `| Third-party presence     | ${d.presence.raw !== null ? d.presence.raw : '?'}/${d.presence.max} |`,
        `| Technical accessibility  | ${d.technical.raw}/${d.technical.max} |`,
      ].join('\n'));
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
