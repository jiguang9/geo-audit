'use strict';

/**
 * Pure report renderer. Accepts a GEO score object and raw tool results,
 * returns a Markdown string. Does not perform I/O.
 */

function levelLabel(level) {
  return {
    1: 'Level 1 — AI crawlers blocked or unreachable',
    2: 'Level 2 — Reachable but rarely cited',
    3: 'Level 3 — Occasionally cited',
    4: 'Level 4 — Regularly cited across platforms',
    5: 'Level 5 — High-frequency citation, strong authority',
  }[level] || 'Unknown';
}

function statusIcon(score, max) {
  if (score === null) return '❓';
  const pct = score / max;
  if (pct >= 0.7) return '🟢';
  if (pct >= 0.4) return '🟡';
  return '🔴';
}

function renderRobots(robotsResult) {
  if (!robotsResult || robotsResult.error) return `robots.txt   Error: ${robotsResult?.error || 'no result'}`;
  if (!robotsResult.accessible) return `robots.txt   Not accessible (HTTP ${robotsResult.httpStatus || 'N/A'})`;

  const icon = { allowed: '✅', blocked: '❌', 'not-mentioned': '⚠️', unknown: '❓' };
  const lines = robotsResult.crawlers.map(c =>
    `  ${icon[c.result] || '❓'} ${c.name.padEnd(22)} ${c.result.padEnd(15)} ${c.platform}`
  );
  return `robots.txt   ${robotsResult.url}\n${lines.join('\n')}`;
}

function renderLlms(llmsResult) {
  if (!llmsResult || llmsResult.error) return `llms.txt     Error: ${llmsResult?.error || 'no result'}`;
  const parts = [];
  for (const [file, info] of Object.entries(llmsResult)) {
    if (info.error) parts.push(`  ❓ /${file} — ${info.error}`);
    else if (!info.exists) parts.push(`  ⬜ /${file} — not found`);
    else parts.push(`  ${info.requiredMet ? '✅' : '⚠️'} /${file} — ${info.sizeBytes}B, fields: ${info.completeness}`);
  }
  return `llms.txt\n${parts.join('\n')}`;
}

function renderSchema(schemaResult) {
  if (!schemaResult || schemaResult.error) return `Schema       Error: ${schemaResult?.error || 'no result'}`;
  const s = schemaResult.schema || {};
  const m = schemaResult.meta || {};
  return [
    `Schema markup`,
    `  Found:      ${s.found && s.found.length ? s.found.join(', ') : '— none'}`,
    `  Missing:    ${s.missing && s.missing.length ? s.missing.slice(0, 4).join(', ') : '— none'}`,
    `  Title:      ${m.title ? '✅' : '❌'}  Description: ${m.description ? '✅' : '❌'}  Canonical: ${m.canonical ? '✅' : '❌'}`,
  ].join('\n');
}

function renderFindings(scoreData, schemaResult, contentResult, presenceEvidence) {
  const good = [];
  const bad = [];
  const warn = [];

  const d = scoreData.dimensions;

  // Structure
  if (d.structure.breakdown.headingScore >= 6) good.push('Clear H1–H3 heading structure');
  else bad.push('Heading structure is incomplete (aim for one H1, multiple H2/H3)');

  if (d.structure.breakdown.faqScore >= 6) good.push('FAQ schema or Q&A content detected');
  else warn.push('Add FAQ schema markup (FAQPage) or structured Q&A content');

  if (d.structure.breakdown.listScore >= 4) good.push('Good use of tables and lists for structured data');

  // Authority
  if (d.authority.breakdown.authorScore === 6) good.push('Author attribution present');
  else bad.push('No author attribution detected — add author name and credentials');

  if (d.authority.breakdown.freshnessScore >= 4) good.push('Publication and modification dates present');
  else if (d.authority.breakdown.freshnessScore === 3) warn.push('Add a last-modified date alongside the publish date');
  else bad.push('No publication date detected — AI platforms favour fresh, dated content');

  if (d.authority.breakdown.citationScore >= 5) good.push('Strong external citation count');
  else if (d.authority.breakdown.citationScore === 0) warn.push('Add links to authoritative external sources (statistics, research)');

  // Technical
  if (schemaResult && !schemaResult.error && schemaResult.meta) {
    if (!schemaResult.meta.canonical) bad.push('Missing canonical URL — add <link rel="canonical">');
    if (!schemaResult.meta.description) warn.push('Missing meta description — helps AI summarise your page');
  }

  // Presence
  if (d.presence.unknown) warn.push('Third-party presence not assessed — provide evidence to score this dimension');

  return { good: good.slice(0, 4), bad: bad.slice(0, 4), warn: warn.slice(0, 4) };
}

function renderActionList(findings, scoreData) {
  const actions = [];
  const d = scoreData.dimensions;

  // Immediate (this week)
  for (const issue of findings.bad) actions.push({ when: 'This week', action: issue });

  // Medium term (this month)
  for (const w of findings.warn) actions.push({ when: 'This month', action: w });

  // Long term
  if (d.presence.unknown) {
    actions.push({ when: 'Long term', action: 'Build third-party presence: Zhihu, Wikipedia, Baidu Baike, review platforms' });
  }
  if (d.authority.breakdown.researchScore === 0) {
    actions.push({ when: 'Long term', action: 'Publish original research or statistics to boost authority signals' });
  }

  return actions;
}

function renderReport(scoreData, { robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, context, url: auditUrl }) {
  const brand = context?.brand || 'Unknown brand';
  const url = context?.url || auditUrl || '';
  const date = new Date().toISOString().slice(0, 10);

  const d = scoreData.dimensions;
  const findings = renderFindings(scoreData, schemaResult, contentResult, presenceEvidence);
  const actions = renderActionList(findings, scoreData);

  const presenceDisplay = d.presence.raw !== null
    ? `${d.presence.raw}/${d.presence.max}`
    : `unknown/${d.presence.max}`;

  const scoreNote = scoreData.presenceUnknown
    ? ` (presence not assessed — max without presence: 75/100)`
    : '';

  const lines = [
    `## GEO Diagnostic Report — ${brand} (${date})`,
    url ? `> ${url}` : '',
    '',
    `### GEO Score: ${scoreData.total}/100${scoreNote}`,
    `**${levelLabel(scoreData.level)}**`,
    '',
    '| Dimension | Score | Status |',
    '|-----------|-------|--------|',
    `| Structure extractability | ${d.structure.raw}/${d.structure.max} | ${statusIcon(d.structure.raw, d.structure.max)} |`,
    `| Authority / credibility  | ${d.authority.raw}/${d.authority.max} | ${statusIcon(d.authority.raw, d.authority.max)} |`,
    `| Third-party presence     | ${presenceDisplay} | ${statusIcon(d.presence.raw, d.presence.max)} |`,
    `| Technical accessibility  | ${d.technical.raw}/${d.technical.max} | ${statusIcon(d.technical.raw, d.technical.max)} |`,
    '',
    '### Technical Checks',
    '',
    renderRobots(robotsResult),
    '',
    renderLlms(llmsResult),
    '',
    renderSchema(schemaResult),
    '',
    '### Key Findings',
    '',
    ...findings.good.map(g => `✅ ${g}`),
    ...findings.bad.map(b => `❌ ${b}`),
    ...findings.warn.map(w => `⚠️  ${w}`),
    '',
    '### Priority Action List',
    '',
    ...actions.map((a, i) => `${i + 1}. **[${a.when}]** ${a.action}`),
    '',
    '---',
    '*Generated by [geo-audit](https://github.com/jiguang9/geo-audit)*',
  ].filter(l => l !== null);

  return lines.join('\n');
}

module.exports = { renderReport };
