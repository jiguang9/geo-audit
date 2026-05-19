'use strict';

const CIRCUMFERENCE = 414.69; // 2π × r(66)

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dimClass(score, max) {
  if (score === null || score === undefined) return 'unknown';
  const p = score / max;
  if (p >= 0.7) return 'ok';
  if (p >= 0.4) return 'warn';
  return 'bad';
}

function scoreClass(score) {
  if (score >= 60) return 'ok';
  if (score >= 35) return 'warn';
  return 'bad';
}

function pct(score, max) {
  if (score === null || score === undefined) return 0;
  return Math.round((score / max) * 100);
}

function robotsRows(crawlers) {
  if (!crawlers || !crawlers.length) return '<tr><td colspan="3" style="color:var(--text-muted)">No data</td></tr>';
  return crawlers.map(c => `
    <tr>
      <td class="crawler-name">${esc(c.name)}</td>
      <td><span class="status-badge ${esc(c.result)}">${esc(c.result)}</span></td>
      <td class="crawler-platform">${esc(c.platform)}${c.confidence === 'likely' ? ' <span style="opacity:.5;font-size:10px">(likely)</span>' : ''}</td>
    </tr>`).join('');
}

function llmsRows(llmsResult) {
  if (!llmsResult || llmsResult.error) return '<div class="llms-row"><span class="llms-filename" style="color:var(--text-muted)">Error fetching llms.txt</span></div>';
  return ['llms.txt', 'llms-full.txt'].map(f => {
    const info = llmsResult[f];
    if (!info) return '';
    const cls = info.exists ? (info.requiredMet ? 'allowed' : 'not-mentioned') : 'unknown';
    const label = info.exists ? (info.requiredMet ? 'valid' : 'incomplete') : 'not found';
    const meta = info.exists ? `${info.sizeBytes}B · fields ${info.completeness}` : '—';
    return `<div class="llms-row">
      <span class="llms-filename">/${esc(f)}</span>
      <span class="status-badge ${cls}">${esc(label)}</span>
      <span class="llms-meta">${esc(meta)}</span>
    </div>`;
  }).join('');
}

function schemaTags(types, cls) {
  if (!types || !types.length) return `<span style="color:var(--text-muted);font-size:12px">—</span>`;
  return types.map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join('');
}

function findingItems(items) {
  if (!items || !items.length) return '<div class="finding-item" style="color:var(--text-muted)">—</div>';
  return items.map(i => `<div class="finding-item">${esc(i)}</div>`).join('');
}

function whenClass(when) {
  const w = (when || '').toLowerCase();
  if (w.includes('week')) return 'week';
  if (w.includes('month')) return 'month';
  return 'long';
}

function actionItems(actions) {
  if (!actions || !actions.length) return '<div style="color:var(--text-muted);font-size:13px;padding:12px 0">No actions needed.</div>';
  return actions.map((a, i) => `
    <div class="action-item">
      <span class="action-num">${String(i + 1).padStart(2, '0')}</span>
      <span class="action-when ${whenClass(a.when)}">${esc(a.when)}</span>
      <span class="action-text">${esc(a.action)}</span>
    </div>`).join('');
}

function metaDot(ok) { return ok ? 'ok' : 'bad'; }

function levelDesc(level) {
  return {
    1: 'AI crawlers blocked or unreachable',
    2: 'Reachable but rarely cited',
    3: 'Occasionally cited',
    4: 'Regularly cited across platforms',
    5: 'High-frequency citation',
  }[level] || '';
}

// ─── Findings + actions (shared with markdown report) ────────────────────────
function computeFindings(scoreData, schemaResult) {
  const good = [], bad = [], warn = [];
  const d = scoreData.dimensions;

  if (d.structure.breakdown.headingScore >= 6) good.push('Clear H1–H3 heading structure');
  else bad.push('Heading structure incomplete — aim for one H1, multiple H2/H3');

  if (d.structure.breakdown.faqScore >= 6) good.push('FAQ schema or Q&A content detected');
  else warn.push('Add FAQPage schema markup or structured Q&A content');

  if (d.structure.breakdown.listScore >= 4) good.push('Good use of tables and lists');

  if (d.authority.breakdown.authorScore === 6) good.push('Author attribution present');
  else bad.push('No author attribution — add author name and credentials');

  if (d.authority.breakdown.freshnessScore >= 4) good.push('Publication and modification dates present');
  else if (d.authority.breakdown.freshnessScore === 3) warn.push('Add a last-modified date alongside the publish date');
  else bad.push('No publication date — AI platforms favour fresh, dated content');

  if (d.authority.breakdown.citationScore >= 5) good.push('Strong external citation count');
  else if (d.authority.breakdown.citationScore === 0) warn.push('Link to authoritative external sources (statistics, research)');

  if (schemaResult && !schemaResult.error && schemaResult.meta) {
    if (!schemaResult.meta.canonical) bad.push('Missing canonical URL — add <link rel="canonical">');
    if (!schemaResult.meta.description) warn.push('Missing meta description');
  }

  if (d.presence.unknown) warn.push('Third-party presence not assessed — provide evidence to score this dimension');

  return { good: good.slice(0, 4), bad: bad.slice(0, 4), warn: warn.slice(0, 4) };
}

function computeActions(findings, scoreData) {
  const actions = [];
  const d = scoreData.dimensions;
  for (const issue of findings.bad) actions.push({ when: 'This week', action: issue });
  for (const w of findings.warn) actions.push({ when: 'This month', action: w });
  if (d.presence.unknown) actions.push({ when: 'Long term', action: 'Build third-party presence: Zhihu, Wikipedia, Baidu Baike, review platforms' });
  if (d.authority.breakdown.researchScore === 0) actions.push({ when: 'Long term', action: 'Publish original research or statistics to boost authority signals' });
  return actions;
}

// ─── Main renderer ────────────────────────────────────────────────────────────
function renderHtmlReport(scoreData, { robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, context, url: auditUrl }) {
  const brand = context?.brand || 'Unknown Brand';
  const url   = context?.url || auditUrl || '';
  const date  = new Date().toISOString().slice(0, 10);

  const d       = scoreData.dimensions;
  const score   = scoreData.total;
  const level   = scoreData.level;
  const offset  = (CIRCUMFERENCE * (1 - score / 100)).toFixed(2);
  const sClass  = scoreClass(score);

  const presenceScore = d.presence.raw !== null ? d.presence.raw : '?';
  const presenceNote  = scoreData.presenceUnknown
    ? `<div class="presence-note">Presence not assessed — max without presence: <strong>75/100</strong></div>`
    : '';

  const findings = computeFindings(scoreData, schemaResult);
  const actions  = computeActions(findings, scoreData);

  const robotsAccessible = robotsResult && robotsResult.accessible
    ? `<div class="robots-url">${esc(robotsResult.url)}</div>`
    : `<div class="robots-url" style="color:var(--bad)">Not accessible</div>`;

  const meta = schemaResult?.meta || {};

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO Audit — ${esc(brand)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:            #060b14;
      --surface:       #0c1526;
      --surface2:      #111e35;
      --border:        rgba(0,212,255,.07);
      --border-strong: rgba(0,212,255,.2);
      --cyan:          #00d4ff;
      --cyan-dim:      rgba(0,212,255,.12);
      --ok:            #00e87a;
      --ok-dim:        rgba(0,232,122,.12);
      --warn:          #ffb020;
      --warn-dim:      rgba(255,176,32,.12);
      --bad:           #ff3366;
      --bad-dim:       rgba(255,51,102,.12);
      --unk:           #5a7090;
      --unk-dim:       rgba(90,112,144,.12);
      --text:          #b8cde8;
      --text-muted:    #3e5470;
      --text-bright:   #e4f0ff;
    }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      overflow-x: hidden;
      line-height: 1.6;
    }

    body::before {
      content: '';
      position: fixed; inset: 0;
      background-image:
        linear-gradient(rgba(0,212,255,.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,212,255,.018) 1px, transparent 1px);
      background-size: 44px 44px;
      pointer-events: none;
      z-index: 0;
    }

    body::after {
      content: '';
      position: fixed;
      top: -30%; left: 50%;
      transform: translateX(-50%);
      width: 70vw; height: 60vh;
      background: radial-gradient(ellipse, rgba(0,60,110,.35) 0%, transparent 68%);
      pointer-events: none;
      z-index: 0;
    }

    .container {
      position: relative; z-index: 1;
      max-width: 980px;
      margin: 0 auto;
      padding: 40px 24px 100px;
    }

    /* ── HERO ── */
    .hero {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 48px;
      align-items: center;
      padding: 56px 0 52px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 52px;
      animation: fadeUp .7s ease both;
    }

    .hero-eyebrow {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: var(--cyan);
      opacity: .75;
      margin-bottom: 10px;
    }

    .hero-brand {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(26px, 4.5vw, 50px);
      font-weight: 900;
      color: var(--text-bright);
      letter-spacing: -.02em;
      line-height: 1.08;
      margin-bottom: 8px;
    }

    .hero-url {
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      margin-bottom: 20px;
    }
    .hero-url a { color: var(--cyan); text-decoration: none; opacity: .65; }
    .hero-url a:hover { opacity: 1; }

    .level-badge {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 6px 14px;
      border: 1px solid var(--border-strong);
      border-radius: 4px;
      background: var(--cyan-dim);
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: var(--cyan);
      margin-bottom: 10px;
    }

    .level-num { font-weight: 700; font-size: 12px; }

    .presence-note {
      margin-top: 10px;
      font-size: 11px;
      font-family: 'DM Mono', monospace;
      color: var(--warn);
      opacity: .8;
    }

    .hero-date {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: .06em;
      margin-top: 12px;
    }

    /* Score ring */
    .score-ring-wrap { display: flex; flex-direction: column; align-items: center; gap: 8px; }

    .score-ring-svg {
      width: 172px; height: 172px;
      filter: drop-shadow(0 0 24px rgba(0,212,255,.2));
    }

    .ring-track { fill: none; stroke: rgba(255,255,255,.04); stroke-width: 9; }

    .ring-fill {
      fill: none; stroke-width: 9; stroke-linecap: round;
      transform: rotate(-90deg); transform-origin: center;
      stroke-dasharray: ${CIRCUMFERENCE};
      stroke-dashoffset: ${CIRCUMFERENCE};
      transition: stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1);
    }
    .ring-fill.ok   { stroke: var(--ok);   filter: drop-shadow(0 0 8px var(--ok)); }
    .ring-fill.warn { stroke: var(--warn); filter: drop-shadow(0 0 8px var(--warn)); }
    .ring-fill.bad  { stroke: var(--bad);  filter: drop-shadow(0 0 8px var(--bad)); }

    .ring-score {
      font-family: 'Orbitron', sans-serif;
      font-size: 38px; font-weight: 900;
      fill: var(--text-bright);
      dominant-baseline: middle; text-anchor: middle;
    }
    .ring-denom {
      font-family: 'DM Mono', monospace;
      font-size: 11px; fill: var(--text-muted);
      dominant-baseline: middle; text-anchor: middle;
    }
    .score-label {
      font-family: 'DM Mono', monospace;
      font-size: 10px; letter-spacing: .14em;
      text-transform: uppercase; color: var(--text-muted);
    }

    /* ── SECTION HEADER ── */
    .section-header {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 20px;
    }
    .section-header::after {
      content: ''; flex: 1; height: 1px;
      background: linear-gradient(90deg, var(--border-strong), transparent);
    }
    .section-title {
      font-family: 'DM Mono', monospace;
      font-size: 10px; letter-spacing: .18em;
      text-transform: uppercase; color: var(--cyan);
      white-space: nowrap;
    }

    /* ── DIMENSIONS ── */
    .dimensions-section { margin-bottom: 52px; animation: fadeUp .7s ease .1s both; }

    .dimensions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }

    .dim-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px 16px 18px;
      position: relative; overflow: hidden;
      transition: border-color .2s, transform .2s;
    }
    .dim-card:hover { border-color: var(--border-strong); transform: translateY(-3px); }
    .dim-card::before {
      content: ''; position: absolute;
      top: 0; left: 0; right: 0; height: 2px;
    }
    .dim-card.ok::before   { background: linear-gradient(90deg, var(--ok),   transparent); }
    .dim-card.warn::before { background: linear-gradient(90deg, var(--warn), transparent); }
    .dim-card.bad::before  { background: linear-gradient(90deg, var(--bad),  transparent); }
    .dim-card.unknown::before { background: linear-gradient(90deg, var(--unk), transparent); }

    .dim-label {
      font-size: 10px; letter-spacing: .07em;
      text-transform: uppercase; color: var(--text-muted);
      margin-bottom: 14px; line-height: 1.4;
    }

    .dim-score-row { display: flex; align-items: baseline; gap: 3px; margin-bottom: 14px; }

    .dim-score {
      font-family: 'Orbitron', sans-serif;
      font-size: 30px; font-weight: 700; line-height: 1;
    }
    .dim-card.ok      .dim-score { color: var(--ok); }
    .dim-card.warn    .dim-score { color: var(--warn); }
    .dim-card.bad     .dim-score { color: var(--bad); }
    .dim-card.unknown .dim-score { color: var(--unk); }

    .dim-max { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--text-muted); }

    .dim-bar-track { height: 3px; background: rgba(255,255,255,.05); border-radius: 2px; overflow: hidden; }
    .dim-bar-fill  { height: 100%; border-radius: 2px; width: 0; transition: width 1.3s cubic-bezier(.16,1,.3,1); }
    .dim-card.ok      .dim-bar-fill { background: linear-gradient(90deg, var(--ok), #00ffaa); box-shadow: 0 0 8px var(--ok); }
    .dim-card.warn    .dim-bar-fill { background: linear-gradient(90deg, var(--warn), #ffd060); box-shadow: 0 0 8px var(--warn); }
    .dim-card.bad     .dim-bar-fill { background: linear-gradient(90deg, var(--bad), #ff6688); box-shadow: 0 0 8px var(--bad); }
    .dim-card.unknown .dim-bar-fill { background: linear-gradient(90deg, var(--unk), #7a90b0); }

    /* ── TECH CHECKS ── */
    .tech-section { margin-bottom: 52px; animation: fadeUp .7s ease .2s both; }

    .tech-blocks { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .tech-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px; padding: 22px 20px;
    }
    .tech-block.wide { grid-column: span 2; }

    .tech-block-title {
      font-family: 'DM Mono', monospace;
      font-size: 10px; letter-spacing: .12em;
      text-transform: uppercase; color: var(--cyan);
      opacity: .75; margin-bottom: 18px;
    }

    .robots-url {
      font-family: 'DM Mono', monospace;
      font-size: 11px; color: var(--text-muted);
      margin-bottom: 14px;
    }

    .robots-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .robots-table th {
      font-family: 'DM Mono', monospace;
      font-size: 9px; letter-spacing: .1em;
      text-transform: uppercase; color: var(--text-muted);
      text-align: left; padding: 0 8px 10px;
      border-bottom: 1px solid var(--border);
    }
    .robots-table td { padding: 8px 8px; border-bottom: 1px solid rgba(255,255,255,.025); }
    .robots-table tr:last-child td { border-bottom: none; }
    .robots-table tr:hover td { background: rgba(255,255,255,.015); }

    .crawler-name { font-family: 'DM Mono', monospace; color: var(--text-bright); }
    .crawler-platform { color: var(--text-muted); font-size: 11px; }

    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 8px; border-radius: 3px;
      font-family: 'DM Mono', monospace;
      font-size: 10px; letter-spacing: .04em; font-weight: 500;
      white-space: nowrap;
    }
    .status-badge.allowed       { background: var(--ok-dim);  color: var(--ok);   border: 1px solid rgba(0,232,122,.22); }
    .status-badge.blocked       { background: var(--bad-dim); color: var(--bad);  border: 1px solid rgba(255,51,102,.22); }
    .status-badge.not-mentioned { background: var(--warn-dim);color: var(--warn); border: 1px solid rgba(255,176,32,.22); }
    .status-badge.unknown       { background: var(--unk-dim); color: var(--unk);  border: 1px solid rgba(90,112,144,.22); }
    .status-badge.valid         { background: var(--ok-dim);  color: var(--ok);   border: 1px solid rgba(0,232,122,.22); }
    .status-badge.incomplete    { background: var(--warn-dim);color: var(--warn); border: 1px solid rgba(255,176,32,.22); }
    .status-badge.missing       { background: var(--unk-dim); color: var(--unk);  border: 1px solid rgba(90,112,144,.22); }

    .llms-row {
      display: flex; align-items: center;
      justify-content: space-between; gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255,255,255,.025);
      flex-wrap: wrap;
    }
    .llms-row:last-child { border-bottom: none; }
    .llms-filename { font-family: 'DM Mono', monospace; color: var(--text-bright); font-size: 12px; }
    .llms-meta { font-family: 'DM Mono', monospace; color: var(--text-muted); font-size: 11px; }

    .schema-section { margin-top: 12px; }
    .schema-label {
      font-size: 9px; letter-spacing: .1em;
      text-transform: uppercase; color: var(--text-muted);
      margin-bottom: 8px;
    }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      display: inline-block; padding: 3px 9px;
      border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 11px;
    }
    .tag.found   { background: var(--ok-dim);  color: var(--ok);  border: 1px solid rgba(0,232,122,.2); }
    .tag.missing { background: rgba(255,255,255,.03); color: var(--text-muted); border: 1px solid rgba(255,255,255,.07); text-decoration: line-through; }

    .meta-row { display: flex; gap: 14px; margin-top: 18px; flex-wrap: wrap; }
    .meta-item { display: flex; align-items: center; gap: 7px; font-family: 'DM Mono', monospace; font-size: 11px; }
    .meta-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .meta-dot.ok  { background: var(--ok);  box-shadow: 0 0 6px var(--ok); }
    .meta-dot.bad { background: var(--bad); box-shadow: 0 0 6px var(--bad); }

    /* ── FINDINGS ── */
    .findings-section { margin-bottom: 52px; animation: fadeUp .7s ease .3s both; }
    .findings-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }
    .findings-col { display: flex; flex-direction: column; gap: 8px; }
    .findings-col-header {
      display: flex; align-items: center; gap: 8px;
      font-family: 'DM Mono', monospace;
      font-size: 10px; letter-spacing: .12em;
      text-transform: uppercase; margin-bottom: 4px;
    }
    .findings-col.good .findings-col-header { color: var(--ok); }
    .findings-col.bad  .findings-col-header { color: var(--bad); }
    .findings-col.warn .findings-col-header { color: var(--warn); }

    .finding-item {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 6px; padding: 12px 14px;
      font-size: 13px; line-height: 1.55; color: var(--text);
      transition: border-color .2s;
    }
    .findings-col.good .finding-item { border-left: 2px solid var(--ok); }
    .findings-col.bad  .finding-item { border-left: 2px solid var(--bad); }
    .findings-col.warn .finding-item { border-left: 2px solid var(--warn); }
    .finding-item:hover { border-color: var(--border-strong); }

    /* ── ACTIONS ── */
    .actions-section { margin-bottom: 72px; animation: fadeUp .7s ease .4s both; }
    .actions-list { display: flex; flex-direction: column; gap: 8px; }

    .action-item {
      display: grid; grid-template-columns: 32px auto 1fr;
      align-items: start; gap: 18px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 6px; padding: 14px 20px;
      transition: border-color .2s;
    }
    .action-item:hover { border-color: var(--border-strong); }

    .action-num {
      font-family: 'Orbitron', sans-serif;
      font-size: 12px; font-weight: 700;
      color: var(--text-muted); padding-top: 2px;
    }
    .action-when {
      font-family: 'DM Mono', monospace;
      font-size: 10px; letter-spacing: .08em;
      text-transform: uppercase; padding: 3px 10px;
      border-radius: 3px; white-space: nowrap;
    }
    .action-when.week  { background: var(--bad-dim);  color: var(--bad);  border: 1px solid rgba(255,51,102,.2); }
    .action-when.month { background: var(--warn-dim); color: var(--warn); border: 1px solid rgba(255,176,32,.2); }
    .action-when.long  { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0,212,255,.2); }
    .action-text { font-size: 13px; color: var(--text); line-height: 1.55; }

    /* ── FOOTER ── */
    footer {
      border-top: 1px solid var(--border);
      padding-top: 24px;
      display: flex; justify-content: space-between; align-items: center;
      font-family: 'DM Mono', monospace; font-size: 11px; color: var(--text-muted);
    }
    footer a { color: var(--cyan); text-decoration: none; opacity: .65; }
    footer a:hover { opacity: 1; }

    /* ── RESPONSIVE ── */
    @media (max-width: 800px) {
      .hero { grid-template-columns: 1fr; }
      .score-ring-wrap { align-self: flex-start; margin-top: 24px; }
      .dimensions-grid { grid-template-columns: 1fr 1fr; }
      .tech-blocks { grid-template-columns: 1fr; }
      .tech-block.wide { grid-column: span 1; }
      .findings-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 500px) {
      .dimensions-grid { grid-template-columns: 1fr; }
      .action-item { grid-template-columns: 28px 1fr; }
      .action-when { grid-column: span 1; }
      .action-text { grid-column: span 2; }
    }

    /* ── ANIMATIONS ── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(18px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
<div class="container">

  <!-- HERO -->
  <header class="hero">
    <div class="hero-meta">
      <div class="hero-eyebrow">Generative Engine Optimization · Diagnostic Report</div>
      <h1 class="hero-brand">${esc(brand)}</h1>
      <div class="hero-url"><a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a></div>
      <div class="level-badge">
        <span class="level-num">LEVEL ${esc(level)}</span>
        <span>${esc(levelDesc(level))}</span>
      </div>
      ${presenceNote}
      <div class="hero-date">AUDITED ${esc(date)}</div>
    </div>

    <div class="score-ring-wrap">
      <svg class="score-ring-svg" viewBox="0 0 172 172">
        <circle class="ring-track" cx="86" cy="86" r="66"/>
        <circle class="ring-fill ${esc(sClass)}" cx="86" cy="86" r="66"
          data-offset="${offset}"/>
        <text class="ring-score" x="86" y="80">${esc(score)}</text>
        <text class="ring-denom" x="86" y="101">/100</text>
      </svg>
      <div class="score-label">GEO Score</div>
    </div>
  </header>

  <!-- DIMENSIONS -->
  <section class="dimensions-section">
    <div class="section-header"><span class="section-title">Dimension Scores</span></div>
    <div class="dimensions-grid">

      <div class="dim-card ${dimClass(d.structure.raw, d.structure.max)}">
        <div class="dim-label">Structure<br>Extractability</div>
        <div class="dim-score-row">
          <span class="dim-score">${d.structure.raw}</span>
          <span class="dim-max">/${d.structure.max}</span>
        </div>
        <div class="dim-bar-track"><div class="dim-bar-fill" data-width="${pct(d.structure.raw, d.structure.max)}"></div></div>
      </div>

      <div class="dim-card ${dimClass(d.authority.raw, d.authority.max)}">
        <div class="dim-label">Authority &amp;<br>Credibility</div>
        <div class="dim-score-row">
          <span class="dim-score">${d.authority.raw}</span>
          <span class="dim-max">/${d.authority.max}</span>
        </div>
        <div class="dim-bar-track"><div class="dim-bar-fill" data-width="${pct(d.authority.raw, d.authority.max)}"></div></div>
      </div>

      <div class="dim-card ${dimClass(d.presence.raw, d.presence.max)}">
        <div class="dim-label">Third-Party<br>Presence</div>
        <div class="dim-score-row">
          <span class="dim-score">${esc(presenceScore)}</span>
          <span class="dim-max">/${d.presence.max}</span>
        </div>
        <div class="dim-bar-track"><div class="dim-bar-fill" data-width="${pct(d.presence.raw, d.presence.max)}"></div></div>
      </div>

      <div class="dim-card ${dimClass(d.technical.raw, d.technical.max)}">
        <div class="dim-label">Technical<br>Accessibility</div>
        <div class="dim-score-row">
          <span class="dim-score">${d.technical.raw}</span>
          <span class="dim-max">/${d.technical.max}</span>
        </div>
        <div class="dim-bar-track"><div class="dim-bar-fill" data-width="${pct(d.technical.raw, d.technical.max)}"></div></div>
      </div>

    </div>
  </section>

  <!-- TECH CHECKS -->
  <section class="tech-section">
    <div class="section-header"><span class="section-title">Technical Checks</span></div>
    <div class="tech-blocks">

      <div class="tech-block wide">
        <div class="tech-block-title">robots.txt</div>
        ${robotsAccessible}
        <table class="robots-table">
          <thead><tr><th>Crawler</th><th>Status</th><th>Platform</th></tr></thead>
          <tbody>${robotsRows(robotsResult?.crawlers)}</tbody>
        </table>
      </div>

      <div class="tech-block">
        <div class="tech-block-title">llms.txt</div>
        ${llmsRows(llmsResult)}
      </div>

      <div class="tech-block">
        <div class="tech-block-title">Schema Markup</div>
        <div class="schema-section">
          <div class="schema-label">Found</div>
          <div class="tag-list">${schemaTags(schemaResult?.schema?.found, 'found')}</div>
        </div>
        <div class="schema-section" style="margin-top:14px">
          <div class="schema-label">Missing / Recommended</div>
          <div class="tag-list">${schemaTags(schemaResult?.schema?.missing?.slice(0,5), 'missing')}</div>
        </div>
        <div class="meta-row">
          <div class="meta-item"><div class="meta-dot ${metaDot(meta.title)}"></div><span>Title</span></div>
          <div class="meta-item"><div class="meta-dot ${metaDot(meta.description)}"></div><span>Description</span></div>
          <div class="meta-item"><div class="meta-dot ${metaDot(meta.canonical)}"></div><span>Canonical</span></div>
        </div>
      </div>

    </div>
  </section>

  <!-- FINDINGS -->
  <section class="findings-section">
    <div class="section-header"><span class="section-title">Key Findings</span></div>
    <div class="findings-grid">
      <div class="findings-col good">
        <div class="findings-col-header">✓&nbsp; Doing Well</div>
        ${findingItems(findings.good)}
      </div>
      <div class="findings-col bad">
        <div class="findings-col-header">✕&nbsp; Fix Now</div>
        ${findingItems(findings.bad)}
      </div>
      <div class="findings-col warn">
        <div class="findings-col-header">△&nbsp; Improve</div>
        ${findingItems(findings.warn)}
      </div>
    </div>
  </section>

  <!-- ACTIONS -->
  <section class="actions-section">
    <div class="section-header"><span class="section-title">Priority Action List</span></div>
    <div class="actions-list">
      ${actionItems(actions)}
    </div>
  </section>

  <footer>
    <span>Generated by <a href="https://github.com/jiguang9/geo-audit" target="_blank" rel="noopener">geo-audit</a></span>
    <span>${esc(date)}</span>
  </footer>

</div>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    // Animate score ring
    const ring = document.querySelector('.ring-fill');
    if (ring) {
      const target = ring.getAttribute('data-offset');
      requestAnimationFrame(() => {
        setTimeout(() => { ring.style.strokeDashoffset = target; }, 80);
      });
    }
    // Animate dimension bars
    document.querySelectorAll('.dim-bar-fill').forEach((bar, i) => {
      const w = bar.getAttribute('data-width') + '%';
      setTimeout(() => { bar.style.width = w; }, 300 + i * 120);
    });
  });
</script>
</body>
</html>`;
}

module.exports = { renderHtmlReport };
