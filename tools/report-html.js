'use strict';

const RING_SM = { r: 38, c: 238.76 }; // small dimension rings
const RING_LG = { r: 52, c: 326.73 }; // overall score ring

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pct(score, max) {
  if (score === null || score === undefined) return 0;
  return Math.round((score / max) * 100);
}

function ringColor(p) {
  if (p === null) return '#cbd5e1';
  if (p >= 0.7) return '#16a34a';
  if (p >= 0.4) return '#d97706';
  return '#dc2626';
}

function ringOffset(score, max, ring) {
  if (score === null || score === undefined) return ring.c;
  return (ring.c * (1 - score / max)).toFixed(2);
}

function smallRing(score, max, label, subLabel) {
  const p = score !== null && score !== undefined ? score / max : null;
  const color = ringColor(p);
  const offset = ringOffset(score, max, RING_SM);
  const display = score !== null && score !== undefined ? score : '?';
  return `
  <div class="score-card">
    <svg viewBox="0 0 90 90" width="90" height="90" class="ring-svg">
      <circle cx="45" cy="45" r="${RING_SM.r}" fill="none" stroke="#e5e7eb" stroke-width="7"/>
      <circle cx="45" cy="45" r="${RING_SM.r}" fill="none" stroke="${color}" stroke-width="7"
        stroke-linecap="round" stroke-dasharray="${RING_SM.c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 45 45)" class="ring-arc" data-offset="${offset}"/>
      <text x="45" y="41" font-family="Orbitron,sans-serif" font-weight="700" font-size="16"
        fill="#1a2535" text-anchor="middle" dominant-baseline="middle">${esc(display)}</text>
      <text x="45" y="57" font-family="system-ui,sans-serif" font-size="9"
        fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">/${max}</text>
    </svg>
    <div class="score-card-label">${esc(label)}</div>
    ${subLabel ? `<div class="score-card-sub">${esc(subLabel)}</div>` : ''}
  </div>`;
}

function overallRing(score, max, level, presenceUnknown) {
  const p = score / 100;
  const color = ringColor(p >= 0.6 ? p : p >= 0.35 ? 0.5 : 0);
  const offset = (RING_LG.c * (1 - score / 100)).toFixed(2);
  const note = presenceUnknown ? '（存在感待评估）' : '';
  return `
  <div class="overall-card">
    <svg viewBox="0 0 120 120" width="120" height="120" class="ring-svg">
      <circle cx="60" cy="60" r="${RING_LG.r}" fill="none" stroke="#e5e7eb" stroke-width="8"/>
      <circle cx="60" cy="60" r="${RING_LG.r}" fill="none" stroke="${color}" stroke-width="8"
        stroke-linecap="round" stroke-dasharray="${RING_LG.c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 60 60)" class="ring-arc" data-offset="${offset}"/>
      <text x="60" y="54" font-family="Orbitron,sans-serif" font-weight="900" font-size="26"
        fill="#1a2535" text-anchor="middle" dominant-baseline="middle">${score}</text>
      <text x="60" y="73" font-family="system-ui,sans-serif" font-size="10"
        fill="#9ca3af" text-anchor="middle" dominant-baseline="middle">/100</text>
    </svg>
    <div class="overall-label">综合 GEO 评分</div>
    <div class="overall-level">Level ${level}${note}</div>
  </div>`;
}

function priorityBadge(when) {
  const w = (when || '').toLowerCase();
  if (w.includes('week'))  return { cls: 'high', text: '高' };
  if (w.includes('month')) return { cls: 'mid',  text: '中' };
  return { cls: 'low', text: '低' };
}

function actionCards(actions) {
  if (!actions || !actions.length) return '<p class="empty-note">暂无需修复项目。</p>';
  return actions.map((a, i) => {
    const { cls, text } = priorityBadge(a.when);
    return `
  <div class="fix-card fix-${cls}">
    <div class="fix-header">
      <div class="fix-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="fix-title">${esc(a.action)}</div>
      <span class="priority-badge ${cls}">${text}</span>
    </div>
    <div class="fix-meta">
      <span class="fix-when">${esc(a.when)}</span>
    </div>
  </div>`;
  }).join('');
}

function checkRow(ok, label, detail) {
  const icon = ok === true ? '✓' : ok === false ? '✗' : '?';
  const cls  = ok === true ? 'check-ok' : ok === false ? 'check-bad' : 'check-unk';
  return `
  <div class="check-row ${cls}">
    <span class="check-icon">${icon}</span>
    <span class="check-label">${esc(label)}</span>
    ${detail ? `<span class="check-detail">${esc(detail)}</span>` : ''}
  </div>`;
}

function crawlerRows(crawlers) {
  if (!crawlers || !crawlers.length) return '<p class="empty-note">robots.txt 不可访问</p>';
  const icon = { allowed: '✓', blocked: '✗', 'not-mentioned': '—', unknown: '?' };
  const cls  = { allowed: 'check-ok', blocked: 'check-bad', 'not-mentioned': 'check-warn', unknown: 'check-unk' };
  return crawlers.map(c => `
  <div class="check-row ${cls[c.result] || 'check-unk'}">
    <span class="check-icon">${icon[c.result] || '?'}</span>
    <span class="check-label" style="font-family:'DM Mono',monospace;font-size:12px">${esc(c.name)}</span>
    <span class="check-detail">${esc(c.platform)}</span>
    <span class="status-badge ${esc(c.result)}" style="margin-left:auto">${esc(c.result)}</span>
  </div>`).join('');
}

function llmsSection(llmsResult) {
  if (!llmsResult || llmsResult.error) return checkRow(null, 'llms.txt 检查失败', '');
  return ['llms.txt', 'llms-full.txt'].map(f => {
    const info = llmsResult[f];
    if (!info) return '';
    const ok = info.exists ? info.requiredMet : false;
    const detail = info.exists
      ? `${info.sizeBytes}B · 字段完整度 ${info.completeness}`
      : '文件不存在（不扣分，存在则加分）';
    return checkRow(info.exists ? (info.requiredMet ? true : null) : null, `/${f}`, detail);
  }).join('');
}

function schemaBadges(types, cls, emptyText) {
  if (!types || !types.length) return `<span class="empty-note">${emptyText}</span>`;
  return types.map(t => `<span class="tag ${cls}">${esc(t)}</span>`).join('');
}

// ─── Findings + actions ───────────────────────────────────────────────────────
function computeFindings(scoreData, schemaResult) {
  const good = [], bad = [], warn = [];
  const d = scoreData.dimensions;

  if (d.structure.breakdown.headingScore >= 6) good.push('标题层级（H1-H3）结构完整');
  else bad.push('标题层级不完整，建议设置唯一 H1 及多个 H2/H3');

  if (d.structure.breakdown.faqScore >= 6) good.push('已检测到 FAQ Schema 或问答内容');
  else warn.push('建议添加 FAQPage Schema 或结构化问答内容');

  if (d.structure.breakdown.listScore >= 4) good.push('合理使用表格和列表，结构清晰');

  if (d.authority.breakdown.authorScore === 6) good.push('页面包含作者署名');
  else bad.push('未检测到作者署名，建议添加作者姓名与资质说明');

  if (d.authority.breakdown.freshnessScore >= 4) good.push('发布时间和更新时间均已标注');
  else if (d.authority.breakdown.freshnessScore === 3) warn.push('建议同时标注发布时间和最后更新时间');
  else bad.push('未检测到发布日期，AI 平台偏好标注时间的内容');

  if (d.authority.breakdown.citationScore >= 5) good.push('外部权威来源引用数量充足');
  else if (d.authority.breakdown.citationScore === 0) warn.push('建议添加指向权威外部来源的链接');

  if (schemaResult && !schemaResult.error && schemaResult.meta) {
    if (!schemaResult.meta.canonical) bad.push('缺少 canonical 标签，建议添加 <link rel="canonical">');
    if (!schemaResult.meta.description) warn.push('缺少 meta description，有助于 AI 准确摘要页面内容');
  }

  if (d.presence.unknown) warn.push('第三方存在感维度待评估，请提供知乎/百科/评测平台等证明材料');

  return { good: good.slice(0, 4), bad: bad.slice(0, 4), warn: warn.slice(0, 4) };
}

function computeActions(findings, scoreData) {
  const actions = [];
  const d = scoreData.dimensions;
  for (const issue of findings.bad) actions.push({ when: 'This week', action: issue });
  for (const w of findings.warn) actions.push({ when: 'This month', action: w });
  if (d.presence.unknown) actions.push({ when: 'Long term', action: '建设第三方存在感：知乎、维基百科、百度百科、评测平台' });
  if (d.authority.breakdown.researchScore === 0) actions.push({ when: 'Long term', action: '发布原创研究或数据报告，提升权威信号' });
  return actions;
}

function levelDesc(level) {
  return { 1: 'AI 爬虫被拦截', 2: '可访问，极少被引用', 3: '偶尔被引用', 4: '稳定出现在 AI 引用中', 5: '高频引用，行业权威' }[level] || '';
}

// ─── Main renderer ────────────────────────────────────────────────────────────
function renderHtmlReport(scoreData, { robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, context, url: auditUrl }) {
  const brand = context?.brand || 'Unknown Brand';
  const url   = context?.url || auditUrl || '';
  const date  = new Date().toISOString().slice(0, 10);
  const d     = scoreData.dimensions;
  const score = scoreData.total;
  const level = scoreData.level;

  const findings = computeFindings(scoreData, schemaResult);
  const actions  = computeActions(findings, scoreData);
  const meta     = schemaResult?.meta || {};
  const cs       = schemaResult?.schema || {};

  const presenceScore = d.presence.raw !== null ? d.presence.raw : null;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO 诊断报告 — ${esc(brand)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #f5f0e8;
      --surface:  #ffffff;
      --border:   rgba(0,0,0,.08);
      --text:     #1a2535;
      --muted:    #6b7280;
      --navy:     #1a1e2e;
      --ok:       #16a34a;
      --warn:     #d97706;
      --bad:      #dc2626;
      --ok-bg:    #f0fdf4;
      --warn-bg:  #fffbeb;
      --bad-bg:   #fef2f2;
      --high:     #dc2626;
      --mid:      #d97706;
      --low:      #2563eb;
      --low-bg:   #eff6ff;
    }

    body {
      font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      font-size: 14px;
    }

    a { color: inherit; }

    /* ── REPORT HEADER ── */
    .report-header {
      background: var(--navy);
      color: #ffffff;
      padding: 36px 48px 32px;
    }

    .report-tag {
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: rgba(255,255,255,.45);
      margin-bottom: 10px;
    }

    .report-brand {
      font-family: 'Orbitron', sans-serif;
      font-size: clamp(22px, 4vw, 38px);
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -.01em;
      line-height: 1.1;
      margin-bottom: 10px;
    }

    .url-bar {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,.07);
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 6px;
      padding: 7px 14px;
      font-family: 'DM Mono', monospace;
      font-size: 12px;
      color: rgba(255,255,255,.65);
      margin-bottom: 16px;
    }

    .url-bar::before { content: '🌐'; font-size: 13px; }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .header-date {
      font-size: 12px;
      color: rgba(255,255,255,.4);
      font-family: 'DM Mono', monospace;
    }

    .level-tag {
      padding: 3px 10px;
      border-radius: 20px;
      background: rgba(255,255,255,.1);
      border: 1px solid rgba(255,255,255,.15);
      font-size: 11px;
      color: rgba(255,255,255,.75);
      font-family: 'DM Mono', monospace;
      letter-spacing: .05em;
    }

    /* ── MAIN CONTAINER ── */
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px 80px;
    }

    /* ── SECTION TITLE ── */
    .section-wrap { margin-bottom: 40px; }

    .section-title-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid rgba(0,0,0,.08);
    }

    .section-num {
      font-family: 'Orbitron', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: rgba(0,0,0,.15);
      letter-spacing: .08em;
    }

    .section-name {
      font-size: 16px;
      font-weight: 700;
      color: var(--text);
      letter-spacing: -.01em;
    }

    /* ── SCORE SECTION ── */
    .score-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .score-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px 12px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
      transition: transform .2s, box-shadow .2s;
    }
    .score-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }

    .score-card-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text);
      text-align: center;
      line-height: 1.3;
    }

    .score-card-sub {
      font-size: 10px;
      color: var(--muted);
      text-align: center;
    }

    .ring-svg { display: block; overflow: visible; }

    .overall-row {
      display: flex;
      justify-content: center;
    }

    .overall-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 24px 32px;
      display: flex;
      align-items: center;
      gap: 20px;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
    }

    .overall-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }

    .overall-level {
      font-size: 12px;
      color: var(--muted);
    }

    /* ── PRESENCE NOTE ── */
    .info-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: #1e40af;
      margin-top: 12px;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .info-box::before { content: 'ℹ'; font-weight: bold; flex-shrink: 0; }

    /* ── FIX CARDS ── */
    .fix-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 10px;
      border-left: 4px solid transparent;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
      transition: box-shadow .2s;
    }
    .fix-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,.1); }
    .fix-high { border-left-color: var(--high); }
    .fix-mid  { border-left-color: var(--mid); }
    .fix-low  { border-left-color: var(--low); }

    .fix-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .fix-num {
      font-family: 'Orbitron', sans-serif;
      font-size: 11px;
      font-weight: 700;
      color: rgba(0,0,0,.2);
      padding-top: 2px;
      flex-shrink: 0;
    }

    .fix-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text);
      flex: 1;
      line-height: 1.5;
    }

    .priority-badge {
      flex-shrink: 0;
      padding: 2px 9px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }
    .priority-badge.high { background: #fef2f2; color: var(--high); border: 1px solid #fecaca; }
    .priority-badge.mid  { background: #fffbeb; color: var(--mid);  border: 1px solid #fed7aa; }
    .priority-badge.low  { background: var(--low-bg); color: var(--low); border: 1px solid #bfdbfe; }

    .fix-meta {
      margin-top: 8px;
      padding-left: 32px;
    }

    .fix-when {
      font-size: 11px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }

    /* ── DIAGNOSTICS ── */
    .diag-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
      box-shadow: 0 1px 4px rgba(0,0,0,.05);
    }

    .diag-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      cursor: pointer;
      user-select: none;
      background: var(--surface);
      border-bottom: 1px solid transparent;
      transition: background .15s;
    }
    .diag-header:hover { background: #fafafa; }
    .diag-header.open { border-bottom-color: var(--border); }

    .diag-header-left { display: flex; align-items: center; gap: 10px; }
    .diag-header-icon { font-size: 16px; }
    .diag-header-title { font-size: 14px; font-weight: 600; color: var(--text); }

    .diag-header-right { display: flex; align-items: center; gap: 10px; }
    .diag-score-tag {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 10px;
      border-radius: 20px;
    }
    .diag-score-tag.ok   { background: var(--ok-bg);   color: var(--ok); }
    .diag-score-tag.warn { background: var(--warn-bg);  color: var(--warn); }
    .diag-score-tag.bad  { background: var(--bad-bg);   color: var(--bad); }
    .diag-score-tag.unk  { background: #f1f5f9; color: var(--muted); }

    .chevron {
      color: var(--muted);
      font-size: 12px;
      transition: transform .2s;
    }
    .diag-header.open .chevron { transform: rotate(180deg); }

    .diag-body { padding: 6px 0; display: none; }
    .diag-body.open { display: block; }

    /* ── CHECK ROWS ── */
    .check-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 20px;
      border-bottom: 1px solid rgba(0,0,0,.04);
      font-size: 13px;
    }
    .check-row:last-child { border-bottom: none; }
    .check-row:hover { background: #fafafa; }

    .check-icon {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .check-ok  .check-icon { background: var(--ok-bg);   color: var(--ok); }
    .check-bad .check-icon { background: var(--bad-bg);  color: var(--bad); }
    .check-warn .check-icon { background: var(--warn-bg); color: var(--warn); }
    .check-unk .check-icon { background: #f1f5f9; color: var(--muted); }

    .check-label { font-weight: 500; color: var(--text); flex-shrink: 0; }
    .check-detail { color: var(--muted); font-size: 12px; margin-left: 4px; }

    /* ── STATUS BADGES ── */
    .status-badge {
      padding: 1px 7px;
      border-radius: 3px;
      font-family: 'DM Mono', monospace;
      font-size: 10px;
      font-weight: 600;
      white-space: nowrap;
    }
    .status-badge.allowed       { background: var(--ok-bg);  color: var(--ok);   border: 1px solid #bbf7d0; }
    .status-badge.blocked       { background: var(--bad-bg); color: var(--bad);  border: 1px solid #fecaca; }
    .status-badge.not-mentioned { background: var(--warn-bg);color: var(--warn); border: 1px solid #fed7aa; }
    .status-badge.unknown       { background: #f1f5f9;       color: var(--muted);border: 1px solid #e2e8f0; }
    .status-badge.valid         { background: var(--ok-bg);  color: var(--ok);   border: 1px solid #bbf7d0; }
    .status-badge.incomplete    { background: var(--warn-bg);color: var(--warn); border: 1px solid #fed7aa; }
    .status-badge.missing       { background: #f1f5f9;       color: var(--muted);border: 1px solid #e2e8f0; }

    /* ── SCHEMA TAGS ── */
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 20px 16px; }
    .tag {
      padding: 3px 10px;
      border-radius: 4px;
      font-family: 'DM Mono', monospace;
      font-size: 11px;
    }
    .tag.found   { background: var(--ok-bg);  color: var(--ok);  border: 1px solid #bbf7d0; }
    .tag.missing { background: #f1f5f9; color: var(--muted); border: 1px solid #e2e8f0; text-decoration: line-through; }

    /* ── FINDINGS ── */
    .findings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

    .findings-col { display: flex; flex-direction: column; gap: 8px; }

    .findings-col-header {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .06em;
      text-transform: uppercase;
      padding: 8px 0 6px;
      border-bottom: 2px solid;
      margin-bottom: 4px;
    }
    .findings-col.good .findings-col-header { color: var(--ok);   border-color: var(--ok); }
    .findings-col.bad  .findings-col-header { color: var(--bad);  border-color: var(--bad); }
    .findings-col.warn .findings-col-header { color: var(--warn); border-color: var(--warn); }

    .finding-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.55;
      box-shadow: 0 1px 3px rgba(0,0,0,.05);
    }
    .findings-col.good .finding-card { border-left: 3px solid var(--ok); }
    .findings-col.bad  .finding-card { border-left: 3px solid var(--bad); }
    .findings-col.warn .finding-card { border-left: 3px solid var(--warn); }

    .empty-note { color: var(--muted); font-size: 13px; font-style: italic; padding: 8px 0; }

    /* ── FOOTER ── */
    .report-footer {
      border-top: 1px solid var(--border);
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: var(--muted);
      font-family: 'DM Mono', monospace;
    }
    .report-footer a { color: #2563eb; text-decoration: none; }

    /* ── RESPONSIVE ── */
    @media (max-width: 700px) {
      .report-header { padding: 24px 20px; }
      .score-grid { grid-template-columns: 1fr 1fr; }
      .findings-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 460px) {
      .score-grid { grid-template-columns: 1fr 1fr; }
    }

    /* ── ANIMATIONS ── */
    @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
    .container > .section-wrap { animation: fadeUp .5s ease both; }
    .container > .section-wrap:nth-child(1) { animation-delay: .05s; }
    .container > .section-wrap:nth-child(2) { animation-delay: .12s; }
    .container > .section-wrap:nth-child(3) { animation-delay: .19s; }
    .container > .section-wrap:nth-child(4) { animation-delay: .26s; }
  </style>
</head>
<body>

<!-- ── HEADER ── -->
<header class="report-header">
  <div class="report-tag">Generative Engine Optimization · 诊断报告</div>
  <div class="report-brand">${esc(brand)}</div>
  <div class="url-bar">${esc(url)}</div>
  <div class="header-meta">
    <span class="header-date">诊断日期 ${esc(date)}</span>
    <span class="level-tag">Level ${level} · ${esc(levelDesc(level))}</span>
  </div>
</header>

<div class="container">

  <!-- ── 01 综合评分 ── -->
  <div class="section-wrap">
    <div class="section-title-row">
      <span class="section-num">01</span>
      <span class="section-name">综合评分</span>
    </div>

    <div class="score-grid">
      ${smallRing(d.structure.raw, d.structure.max, '结构可提取性', `满分 ${d.structure.max}`)}
      ${smallRing(d.authority.raw, d.authority.max, '权威性 / 可信度', `满分 ${d.authority.max}`)}
      ${smallRing(presenceScore, d.presence.max, '第三方存在感', presenceScore === null ? '待评估' : `满分 ${d.presence.max}`)}
      ${smallRing(d.technical.raw, d.technical.max, '技术可访问性', `满分 ${d.technical.max}`)}
    </div>

    <div class="overall-row">
      ${overallRing(score, 100, level, scoreData.presenceUnknown)}
    </div>

    ${scoreData.presenceUnknown ? `<div class="info-box">第三方存在感（知乎、维基百科、评测平台等）需人工提供证明材料后才能评分，当前综合分满分上限为 75/100。</div>` : ''}
  </div>

  <!-- ── 02 优先修复清单 ── -->
  <div class="section-wrap">
    <div class="section-title-row">
      <span class="section-num">02</span>
      <span class="section-name">优先修复清单</span>
    </div>
    ${actionCards(actions)}
  </div>

  <!-- ── 03 关键发现 ── -->
  <div class="section-wrap">
    <div class="section-title-row">
      <span class="section-num">03</span>
      <span class="section-name">关键发现</span>
    </div>
    <div class="findings-grid">
      <div class="findings-col good">
        <div class="findings-col-header">✓ 做得好</div>
        ${findings.good.length ? findings.good.map(i => `<div class="finding-card">${esc(i)}</div>`).join('') : '<p class="empty-note">—</p>'}
      </div>
      <div class="findings-col bad">
        <div class="findings-col-header">✗ 需修复</div>
        ${findings.bad.length ? findings.bad.map(i => `<div class="finding-card">${esc(i)}</div>`).join('') : '<p class="empty-note">—</p>'}
      </div>
      <div class="findings-col warn">
        <div class="findings-col-header">△ 建议改进</div>
        ${findings.warn.length ? findings.warn.map(i => `<div class="finding-card">${esc(i)}</div>`).join('') : '<p class="empty-note">—</p>'}
      </div>
    </div>
  </div>

  <!-- ── 04 各模块详细诊断 ── -->
  <div class="section-wrap">
    <div class="section-title-row">
      <span class="section-num">04</span>
      <span class="section-name">各模块详细诊断</span>
    </div>

    <!-- robots.txt -->
    <div class="diag-block">
      <div class="diag-header open" onclick="toggle(this)">
        <div class="diag-header-left">
          <span class="diag-header-icon">🤖</span>
          <span class="diag-header-title">AI 爬虫访问（robots.txt）</span>
        </div>
        <div class="diag-header-right">
          <span class="diag-score-tag ${robotsResult?.accessible ? 'ok' : 'bad'}">${robotsResult?.accessible ? '可访问' : '不可访问'}</span>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="diag-body open">
        ${robotsResult?.url ? `<div style="padding:8px 20px 4px;font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${esc(robotsResult.url)}</div>` : ''}
        ${crawlerRows(robotsResult?.crawlers)}
      </div>
    </div>

    <!-- llms.txt -->
    <div class="diag-block">
      <div class="diag-header" onclick="toggle(this)">
        <div class="diag-header-left">
          <span class="diag-header-icon">📄</span>
          <span class="diag-header-title">llms.txt</span>
        </div>
        <div class="diag-header-right">
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="diag-body">
        ${llmsSection(llmsResult)}
      </div>
    </div>

    <!-- Schema -->
    <div class="diag-block">
      <div class="diag-header" onclick="toggle(this)">
        <div class="diag-header-left">
          <span class="diag-header-icon">🏷</span>
          <span class="diag-header-title">Schema 标记（JSON-LD）</span>
        </div>
        <div class="diag-header-right">
          <span class="diag-score-tag ${cs.found && cs.found.length ? 'ok' : 'bad'}">${cs.found && cs.found.length ? `${cs.found.length} 项` : '未发现'}</span>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="diag-body">
        <div style="padding:10px 20px 4px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">已发现</div>
        <div class="tag-list">${schemaBadges(cs.found, 'found', '未发现任何 Schema 标记')}</div>
        <div style="padding:4px 20px 4px;font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.06em">缺失 / 推荐</div>
        <div class="tag-list">${schemaBadges(cs.missing?.slice(0,6), 'missing', '—')}</div>
        ${checkRow(!!meta.title, 'title 标签', meta.title ? meta.title.slice(0,60) : '未检测到')}
        ${checkRow(!!meta.description, 'meta description', meta.description ? '已配置' : '未检测到')}
        ${checkRow(!!meta.canonical, 'canonical 标签', meta.canonical || '未检测到')}
      </div>
    </div>

    <!-- 内容结构 -->
    <div class="diag-block">
      <div class="diag-header" onclick="toggle(this)">
        <div class="diag-header-left">
          <span class="diag-header-icon">📐</span>
          <span class="diag-header-title">内容结构可提取性</span>
        </div>
        <div class="diag-header-right">
          <span class="diag-score-tag ${['ok','warn','bad'][d.structure.raw/d.structure.max >= 0.7 ? 0 : d.structure.raw/d.structure.max >= 0.4 ? 1 : 2]}">${d.structure.raw}/${d.structure.max}</span>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="diag-body">
        ${checkRow(d.structure.breakdown.headingScore >= 6, 'H1-H3 标题层级', `得分 ${d.structure.breakdown.headingScore}/8`)}
        ${checkRow(d.structure.breakdown.faqScore >= 6, 'FAQ Schema 或问答内容', `得分 ${d.structure.breakdown.faqScore}/8`)}
        ${checkRow(d.structure.breakdown.listScore >= 4, '表格与列表使用', `得分 ${d.structure.breakdown.listScore}/6`)}
        ${checkRow(d.structure.breakdown.paraScore > 0, '段落独立性（启发式）', `得分 ${d.structure.breakdown.paraScore}/5`)}
        ${checkRow(d.structure.breakdown.canonicalScore > 0, 'Canonical URL', `得分 ${d.structure.breakdown.canonicalScore}/3`)}
      </div>
    </div>

    <!-- 权威性 -->
    <div class="diag-block">
      <div class="diag-header" onclick="toggle(this)">
        <div class="diag-header-left">
          <span class="diag-header-icon">🏅</span>
          <span class="diag-header-title">权威性 / 可信度</span>
        </div>
        <div class="diag-header-right">
          <span class="diag-score-tag ${['ok','warn','bad'][d.authority.raw/d.authority.max >= 0.7 ? 0 : d.authority.raw/d.authority.max >= 0.4 ? 1 : 2]}">${d.authority.raw}/${d.authority.max}</span>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="diag-body">
        ${checkRow(d.authority.breakdown.authorScore === 6, '作者署名', `得分 ${d.authority.breakdown.authorScore}/6`)}
        ${checkRow(d.authority.breakdown.freshnessScore >= 4, '发布与更新日期', `得分 ${d.authority.breakdown.freshnessScore}/6`)}
        ${checkRow(d.authority.breakdown.citationScore >= 5, '外部权威引用', `得分 ${d.authority.breakdown.citationScore}/8`)}
        ${checkRow(d.authority.breakdown.schemaAuthorityScore > 0, 'Schema 权威信号', `得分 ${d.authority.breakdown.schemaAuthorityScore}/5`)}
      </div>
    </div>

    <!-- 第三方存在感 -->
    <div class="diag-block">
      <div class="diag-header" onclick="toggle(this)">
        <div class="diag-header-left">
          <span class="diag-header-icon">🌐</span>
          <span class="diag-header-title">第三方存在感</span>
        </div>
        <div class="diag-header-right">
          <span class="diag-score-tag unk">${presenceScore !== null ? `${presenceScore}/25` : '待评估'}</span>
          <span class="chevron">▾</span>
        </div>
      </div>
      <div class="diag-body">
        ${presenceScore === null
          ? `<div class="check-row check-unk"><span class="check-icon">?</span><span class="check-label">需人工提供证明材料</span><span class="check-detail">参见 references/presence.md 收集清单</span></div>`
          : [
              checkRow(presenceEvidence?.hasWikipedia, 'Wikipedia（英文）', ''),
              checkRow(presenceEvidence?.hasBaiduBaike, '百度百科', ''),
              checkRow(presenceEvidence?.hasZhihu, '知乎话题/回答', ''),
              checkRow((presenceEvidence?.reviewPlatformCount || 0) > 0, '评测平台（G2/Capterra 等）', `${presenceEvidence?.reviewPlatformCount || 0} 个平台`),
            ].join('')
        }
      </div>
    </div>

  </div><!-- /section-wrap -->

  <footer class="report-footer">
    <span>由 <a href="https://github.com/jiguang9/geo-audit" target="_blank" rel="noopener">geo-audit</a> 生成</span>
    <span>${esc(date)}</span>
  </footer>

</div>

<script>
  function toggle(header) {
    header.classList.toggle('open');
    const body = header.nextElementSibling;
    body.classList.toggle('open');
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Animate rings
    document.querySelectorAll('.ring-arc').forEach((arc, i) => {
      const target = arc.getAttribute('data-offset');
      arc.style.strokeDashoffset = arc.getAttribute('stroke-dasharray');
      setTimeout(() => {
        arc.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)';
        arc.style.strokeDashoffset = target;
      }, 150 + i * 100);
    });
  });
</script>
</body>
</html>`;
}

module.exports = { renderHtmlReport };
