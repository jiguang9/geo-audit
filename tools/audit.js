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
const { checkSitemap } = require('./sitemap-checker.js');
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
        `**GEO Score: ${result.scoreData.total}/${result.scoreData.totalMax}${presenceNote} · Level ${result.scoreData.level}**`,
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
