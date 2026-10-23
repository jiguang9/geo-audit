#!/usr/bin/env node
'use strict';

/**
 * geo-audit — main CLI entry point
 *
 * Usage:
 *   node tools/audit.js <url> [--json]
 *
 * Options:
 *   --json   Output structured JSON (default: Markdown)
 */

const { checkRobots } = require('./robots-checker.js');
const { checkLlmsTxt } = require('./llms-txt-checker.js');
const { inspectSchema } = require('./schema-inspector.js');
const { checkContentStructure } = require('./content-structure.js');
const { checkSitemap } = require('./sitemap-checker.js');
const { computeGeoScore } = require('./score.js');
const { renderReport } = require('./report.js');
const { saveHistory, loadLatestHistory } = require('./history.js');
const { normalizeUrl, isPublicUrl, getHostname } = require('./shared/url.js');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes('--html')) {
    process.stderr.write('Error: --html has been removed. Output is now Markdown (stdout) or --json.\n');
    process.exit(1);
  }

  // Parse named flag-value pairs first, tracking which indices are consumed values
  const NAMED_FLAG_RE = /^--(brand|industry|market|platforms|queries|competitors|lang)$/;
  const namedFlags = {};
  const valueIndices = new Set();
  for (let i = 0; i < args.length; i++) {
    const m = NAMED_FLAG_RE.exec(args[i]);
    if (m && args[i + 1] && !args[i + 1].startsWith('--')) {
      namedFlags[m[1]] = args[i + 1];
      valueIndices.add(i + 1);
      i++;
    }
  }

  // URL: first non-flag, non-flag-value positional argument
  const url = args.find((a, i) => !a.startsWith('--') && !valueIndices.has(i));

  if (namedFlags.lang && !['zh', 'en'].includes(namedFlags.lang.toLowerCase())) {
    process.stderr.write(`Error: --lang must be "zh" or "en" (got "${namedFlags.lang}").\n`);
    process.exit(1);
  }
  if (namedFlags.lang) namedFlags.lang = namedFlags.lang.toLowerCase();

  const json = args.includes('--json');
  const format = json ? 'json' : 'markdown';
  const save = args.includes('--save');

  return { url, format, namedFlags, save };
}

function loadContext(startDir) {
  const candidates = [
    path.join(startDir, '.agents', 'geo-audit-context.json'),
    path.join(startDir, '.agents', 'geo-audit-context.md'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, 'utf8');
    if (p.endsWith('.json')) {
      try { return JSON.parse(raw); } catch (_) { return null; }
    }
    // Markdown: parse key: value lines; collect multiline JSON values
    const ctx = {};
    let jsonKey = null;
    let jsonBuf = '';
    for (const line of raw.split('\n')) {
      // If accumulating JSON, continue until bracket closes
      if (jsonKey) {
        jsonBuf += line;
        const opens = (jsonBuf.match(/[{\[]/g) || []).length;
        const closes = (jsonBuf.match(/[}\]]/g) || []).length;
        if (closes >= opens) {
          try { ctx[jsonKey] = JSON.parse(jsonBuf); } catch (_) {}
          jsonKey = null; jsonBuf = '';
        }
        continue;
      }
      const m = /^[-*]?\s*\*?\*?(\w+)\*?\*?\s*[:：]\s*(.*)/.exec(line.trim());
      if (!m) continue;
      const key = m[1].toLowerCase();
      const val = m[2].trim();
      if (val.startsWith('[') || val.startsWith('{')) {
        const opens = (val.match(/[{\[]/g) || []).length;
        const closes = (val.match(/[}\]]/g) || []).length;
        if (closes >= opens) {
          try { ctx[key] = JSON.parse(val); } catch (_) { ctx[key] = val; }
        } else {
          jsonKey = key; jsonBuf = val;
        }
      } else if (val) {
        ctx[key] = val;
      }
    }
    return ctx;
  }
  return null;
}

async function runAudit(siteUrl, context) {
  if (!isPublicUrl(siteUrl)) {
    throw new Error('URL must be a publicly accessible site (no localhost, private IPs, or .internal domains).');
  }

  const url = normalizeUrl(siteUrl);

  // Run all homepage checks concurrently
  const [robotsResult, llmsResult, schemaResult, contentResult] = await Promise.all([
    checkRobots(url),
    checkLlmsTxt(url),
    inspectSchema(url),
    checkContentStructure(url),
  ]);

  // Auto-check one article page for authority signals (author, dates)
  // These signals are article-level, not homepage-level
  let articleSchemaResult = null;
  let articleUrl = null;
  let sitemapResult = { found: false };
  try {
    sitemapResult = await checkSitemap(url);
    if (sitemapResult.found && sitemapResult.sampleUrls) {
      const candidate = sitemapResult.sampleUrls.find(u =>
        /\/blog\/|\/post\/|\/article\/|\/news\//.test(u)
      );
      if (candidate && isPublicUrl(candidate)) {
        articleUrl = candidate;
        articleSchemaResult = await inspectSchema(candidate);
      }
    }
  } catch (_) { /* sitemap or article fetch failed — proceed without */ }

  // Third-party presence: user-provided evidence (structured object or JSON string)
  let presenceEvidence = {};
  const rawPresence = context?.presence || context?.presenceevidence;
  if (rawPresence) {
    if (typeof rawPresence === 'object') {
      presenceEvidence = rawPresence;
    } else {
      try { presenceEvidence = JSON.parse(rawPresence); } catch (_) {}
    }
  }

  // Citation evidence: query×platform matrix from context
  let citationEvidence = null;
  const rawCitation = context?.citationevidence || context?.citationEvidence;
  if (rawCitation) {
    if (Array.isArray(rawCitation)) {
      citationEvidence = rawCitation;
    } else {
      try { citationEvidence = JSON.parse(rawCitation); } catch (_) {}
    }
  }

  const scoreData = computeGeoScore({ robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, articleSchemaResult });

  return { url, scoreData, robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, citationEvidence, sitemapResult, articleSchemaResult, articleUrl, context };
}

async function main() {
  const { url, format, namedFlags, save } = parseArgs(process.argv);

  if (!url) {
    console.error([
      'geo-audit — GEO (Generative Engine Optimization) diagnostic tool',
      '',
      'Usage:',
      '  node tools/audit.js <url>                    # Markdown report (stdout)',
      '  node tools/audit.js <url> --json             # JSON output',
      '  node tools/audit.js <url> --brand "Brand"    # Include brand name',
      '',
      'Named flags (all optional):',
      '  --brand <name>       Brand name shown in the report',
      '  --industry <type>    SaaS / ecommerce / media / B2B / local',
      '  --market <market>    China / US / global',
      '  --lang <zh|en>       Report language (default: zh)',
      '',
      'Other flags:',
      '  --save               Save a score snapshot to .agents/geo-audit-history/',
      '                       (future runs auto-show a score trend section)',
      '',
      'Examples:',
      '  node tools/audit.js https://example.com --brand "Acme" --save',
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

    // History: load the latest snapshot for trend display, then save if asked
    let previousAudit = null;
    const domain = getHostname(result.url);
    try { previousAudit = loadLatestHistory(domain, process.cwd()); } catch (_) {}

    if (format === 'json') {
      console.log(JSON.stringify({ ...result, previousAudit }, null, 2));
    } else {
      const report = renderReport(result.scoreData, { ...result, url: result.url, previousAudit });
      console.log(report);
    }

    if (save) {
      const file = saveHistory(result, process.cwd(), domain);
      process.stderr.write(`Saved score snapshot: ${file}\n`);
    }
  } catch (err) {
    console.error('Audit failed:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { runAudit, loadContext, parseArgs };
