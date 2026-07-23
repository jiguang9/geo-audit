'use strict';

const STRINGS = require('./report-strings.js');
const { computeTrend } = require('./history.js');

function deltaLabel(delta) {
  if (delta === null || delta === undefined) return '—';
  if (delta > 0) return `+${delta} ↑`;
  if (delta < 0) return `${delta} ↓`;
  return '±0';
}

function renderTrend(previousAudit, scoreData, L) {
  const trend = computeTrend(previousAudit, scoreData);
  if (!trend) return null;
  const T = L.trend;
  const R = L.report;

  function dimRow(name, t) {
    if (!t) return null;
    const prev = t.prev === null ? T.unknown : `${t.prev}/${t.max}`;
    const curr = t.curr === null ? T.unknown : `${t.curr}/${t.max}`;
    return `| ${name} | ${prev} | ${curr} | ${deltaLabel(t.delta)} |`;
  }

  const lines = [
    T.header(trend.prevDate),
    '',
    T.tableHead,
    '|------|-----:|-----:|:----:|',
    dimRow(R.dims.technical, trend.dims.technical),
    dimRow(R.dims.structure, trend.dims.structure),
    dimRow(R.dims.authority, trend.dims.authority),
    dimRow(R.dims.presence, trend.dims.presence),
    `| **${T.totalRow}** | ${trend.total.prevNormalized ?? '—'} | ${trend.total.currNormalized ?? '—'} | **${deltaLabel(trend.total.deltaNormalized)}** |`,
  ].filter(l => l !== null);
  return lines.join('\n');
}

function confidenceSymbol(c) {
  if (c === 'high') return '●';
  if (c === 'medium') return '◐';
  if (c === 'low') return '○';
  return '—';
}

function statusIcon(score, max) {
  if (score === null) return '❓';
  const pct = score / max;
  if (pct >= 0.7) return '🟢';
  if (pct >= 0.4) return '🟡';
  return '🔴';
}

function renderRobots(robotsResult, L) {
  if (!robotsResult || robotsResult.error) return L.robotsError(robotsResult?.error || 'no result');
  if (!robotsResult.accessible) return L.robotsInaccessible(robotsResult.httpStatus || 'N/A');
  const icon = { allowed: '✅', blocked: '❌', 'not-mentioned': '⚠️', unknown: '❓' };
  const lines = robotsResult.crawlers.map(c =>
    `  ${icon[c.result] || '❓'} ${c.name.padEnd(22)} ${c.result.padEnd(15)} ${c.platform}`
  );
  return `robots.txt   ${robotsResult.url}\n${lines.join('\n')}`;
}

function citationRiskWarning(robotsResult, L) {
  if (!robotsResult || !robotsResult.crawlers) return null;
  const highRisk = robotsResult.crawlers.filter(c => c.citationRisk === 'high');
  if (highRisk.length === 0) return null;
  return L.citationRiskWarning(highRisk.map(c => c.name).join(', '));
}

function renderLlms(llmsResult, L) {
  if (!llmsResult || llmsResult.error) return L.llmsError(llmsResult?.error || 'no result');
  const parts = [];
  for (const [file, info] of Object.entries(llmsResult)) {
    if (info.error) parts.push(`  ❓ /${file} — ${info.error}`);
    else if (!info.exists) parts.push(`  ⬜ /${file} — ${L.llmsNotFound}`);
    else parts.push(`  ${info.requiredMet ? '✅' : '⚠️'} /${file} — ${info.sizeBytes}B, ${L.llmsFields}: ${info.completeness}`);
  }
  return `llms.txt\n${parts.join('\n')}`;
}

function renderSchema(schemaResult, L) {
  if (!schemaResult || schemaResult.error) return L.schemaError(schemaResult?.error || 'no result');
  const s = schemaResult.schema || {};
  const m = schemaResult.meta || {};
  const lines = [
    L.schemaTitle,
    `  ${L.schemaFound}:   ${s.found && s.found.length ? s.found.join(', ') : L.none}`,
    `  ${L.schemaMissingTypes}: ${s.missing && s.missing.length ? s.missing.slice(0, 5).join(', ') : L.none}`,
    `  Title: ${m.title ? '✅' : '❌'}   Description: ${m.description ? '✅' : '❌'}   Canonical: ${m.canonical ? '✅' : '❌'}`,
  ];
  if (s.missingProperties && s.missingProperties.length > 0) {
    lines.push(`  ${L.schemaMissingProps}:  ${s.missingProperties.slice(0, 8).map(p => `${p.type}.${p.property}`).join(', ')}`);
  }
  return lines.join('\n');
}

function renderContentEvidence(contentResult, L) {
  if (!contentResult || contentResult.error) return null;
  const lines = [];
  if (contentResult.quotableBlocks && contentResult.quotableBlocks.length > 0) {
    lines.push(L.quotableHeader);
    contentResult.quotableBlocks.slice(0, 5).forEach((b, i) => {
      const excerpt = b.text.length > 120 ? b.text.slice(0, 120) + '…' : b.text;
      lines.push(`  ${i + 1}. [${b.type}] "${excerpt}"`);
    });
  }
  if (contentResult.missingBlocks && contentResult.missingBlocks.length > 0) {
    lines.push(L.missingBlocksLine(contentResult.missingBlocks.join(', ')));
  }
  return lines.length > 0 ? lines.join('\n') : null;
}

function renderVerdict(scoreData, V) {
  const state = V[scoreData.verdict] || V.fix;
  const desc = scoreData.verdict === 'block' ? V.blockDesc
    : scoreData.verdict === 'ship' ? V.shipDesc
    : V.fixDesc;

  let badge = `${V.header}: ${state.icon} ${state.label} — ${desc}`;
  if (scoreData.capped) {
    badge += ' ' + V.cappedNote(scoreData.rawTotal, scoreData.total);
  }

  const out = [badge];
  if (scoreData.vetoes && scoreData.vetoes.length > 0) {
    out.push('', V.reasonsHeader);
    for (const veto of scoreData.vetoes) {
      const reason = V.reasons[veto.code];
      if (!reason) continue;
      const names = (veto.blockedCrawlers || []).join(', ');
      out.push(`- **[${veto.code}]** ${reason(names)}`);
    }
  }
  return out.join('\n');
}

function diagnoseFailureCodes(scoreData, robotsResult, sitemapResult, L) {
  const d = scoreData.dimensions;
  const F = L.failureCodes;
  const codes = [];

  // T-ACCESS: search/indexing/general crawlers are blocked
  if (robotsResult && robotsResult.crawlers) {
    const blocked = robotsResult.crawlers.filter(c => c.citationRisk === 'high');
    if (blocked.length > 0) {
      codes.push({
        code: 'T-ACCESS',
        label: F.T_ACCESS.label,
        detail: F.T_ACCESS.detail(blocked.map(c => c.name).join(', ')),
        fix: F.T_ACCESS.fix,
      });
    }
  }

  // T-INDEX: no llms.txt and/or no sitemap
  const noLlms = !scoreData._llmsExists;
  const noSitemap = sitemapResult && !sitemapResult.found;
  if (noLlms || noSitemap) {
    codes.push({
      code: 'T-INDEX',
      label: F.T_INDEX.label,
      detail: [noLlms ? F.T_INDEX.detailLlms : '', noSitemap ? F.T_INDEX.detailSitemap : '']
        .filter(Boolean).join(F.T_INDEX.joiner),
      fix: [noLlms ? F.T_INDEX.fixLlms : '', noSitemap ? F.T_INDEX.fixSitemap : '']
        .filter(Boolean).join(F.T_INDEX.joiner),
    });
  }

  // C-MATCH: structure score < 40% of max (12/30)
  if (d.structure.raw < 12) {
    codes.push({
      code: 'C-MATCH',
      label: F.C_MATCH.label,
      detail: F.C_MATCH.detail(d.structure.raw, d.structure.max),
      fix: F.C_MATCH.fix,
    });
  }

  // C-ANSWER: no FAQ schema and low question count
  if (d.structure.breakdown && d.structure.breakdown.faqScore === 0 && d.structure.breakdown.headingScore < 4) {
    codes.push({ code: 'C-ANSWER', label: F.C_ANSWER.label, detail: F.C_ANSWER.detail, fix: F.C_ANSWER.fix });
  }

  // A-AUTH: authority < 32% of max (8/25)
  if (d.authority.raw < 8) {
    codes.push({
      code: 'A-AUTH',
      label: F.A_AUTH.label,
      detail: F.A_AUTH.detail(d.authority.raw, d.authority.max),
      fix: F.A_AUTH.fix,
    });
  }

  // A-FRESH: no publish or modified date
  if (d.authority.breakdown && d.authority.breakdown.freshnessScore === 0) {
    codes.push({ code: 'A-FRESH', label: F.A_FRESH.label, detail: F.A_FRESH.detail, fix: F.A_FRESH.fix });
  }

  // P-ABSENCE: presence unknown
  if (d.presence.unknown) {
    codes.push({ code: 'P-ABSENCE', label: F.P_ABSENCE.label, detail: F.P_ABSENCE.detail, fix: F.P_ABSENCE.fix });
  }

  return codes;
}

function buildActions(scoreData, schemaResult, url, L) {
  const d = scoreData.dimensions;
  const m = schemaResult?.meta || {};
  const s = schemaResult?.schema || {};
  const domain = url ? url.replace(/\/$/, '') : 'https://example.com';
  const A = L.actions;

  const p0 = [];
  const p1 = [];
  const p2 = [];

  // Technical — P0 priority
  const llmsExists = scoreData._llmsExists;
  if (!llmsExists) {
    p0.push({
      title: A.llms.title,
      body: [
        A.llms.intro,
        '',
        A.llms.generatorNote,
        '',
        '```bash',
        `node tools/llms-txt-generator.js ${domain} > llms.txt`,
        '```',
        '',
        A.llms.manualNote,
        '',
        '```txt',
        `# ${domain.replace(/https?:\/\//, '')}`,
        '',
        A.llms.placeholderDesc,
        '',
        '## Key pages',
        `- Home: ${domain}/`,
        `- About: ${domain}/about`,
        `- Blog: ${domain}/blog`,
        '',
        '## Core topics',
        ...A.llms.topics,
        '```',
      ].join('\n'),
    });
  }

  if (!m.canonical) {
    p0.push({
      title: A.canonical.title,
      body: [
        A.canonical.intro,
        '',
        '```html',
        `<link rel="canonical" href="${domain}/">`,
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "Organization",',
        `  "name": "${A.canonical.brandName}",`,
        `  "url": "${domain}/",`,
        `  "description": "${A.canonical.brandDesc}",`,
        '  "founder": {',
        '    "@type": "Person",',
        `    "name": "${A.canonical.founderName}"`,
        '  },',
        `  "knowsAbout": [${A.canonical.topics.map(t => `"${t}"`).join(', ')}]`,
        '}',
        '</script>',
      ].join('\n'),
    });
  }

  const hasFaqSchema = s.found && s.found.includes('FAQPage');
  if (!hasFaqSchema && d.structure.breakdown.faqScore < 6) {
    p0.push({
      title: A.faq.title,
      body: [
        A.faq.intro,
        '',
        '```html',
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "FAQPage",',
        '  "mainEntity": [',
        '    {',
        '      "@type": "Question",',
        `      "name": "${A.faq.q1}",`,
        `      "acceptedAnswer": { "@type": "Answer", "text": "${A.faq.a1}" }`,
        '    },',
        '    {',
        '      "@type": "Question",',
        `      "name": "${A.faq.q2}",`,
        `      "acceptedAnswer": { "@type": "Answer", "text": "${A.faq.a2}" }`,
        '    }',
        '  ]',
        '}',
        '</script>',
      ].join('\n'),
    });
  }

  // Authority — P1
  if (d.authority.breakdown.authorScore === 0) {
    p1.push({
      title: A.blogPosting.title,
      body: [
        A.blogPosting.intro,
        '',
        '```html',
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "BlogPosting",',
        `  "headline": "${A.blogPosting.headline}",`,
        `  "description": "${A.blogPosting.desc}",`,
        '  "datePublished": "YYYY-MM-DD",',
        '  "dateModified": "YYYY-MM-DD",',
        `  "author": { "@type": "Person", "name": "${A.blogPosting.author}", "url": "[/about]" },`,
        `  "publisher": { "@type": "Organization", "name": "${A.blogPosting.brand}" },`,
        `  "mainEntityOfPage": { "@type": "WebPage", "@id": "${A.blogPosting.articleUrl}" }`,
        '}',
        '</script>',
      ].join('\n'),
    });
  }

  if (d.structure.breakdown.listScore < 3) {
    p1.push({
      title: A.quotableSummary.title,
      body: [A.quotableSummary.intro, '', '```md', A.quotableSummary.example, '```'].join('\n'),
    });
  }

  p1.push({ title: A.hub.title, body: A.hub.body });

  // Presence — P2
  if (d.presence.unknown) {
    p2.push({
      title: A.presence.title,
      body: [A.presence.intro, '', ...A.presence.items].join('\n'),
    });
  }

  p2.push({ title: A.dataCitations.title, body: A.dataCitations.body });

  return { p0, p1, p2 };
}

function renderCitationMatrix(citationEvidence, L) {
  if (!Array.isArray(citationEvidence) || citationEvidence.length === 0) return null;
  const M = L.matrix;
  const platforms = [...new Set(citationEvidence.map(e => e.platform))];
  const queries = [...new Set(citationEvidence.map(e => e.query))];

  const header = `| ${M.queryPlatform} | ${platforms.join(' | ')} |`;
  const divider = `|${['---', ...platforms.map(() => ':---:')].join('|')}|`;

  const rows = queries.map(q => {
    const cells = platforms.map(p => {
      const entry = citationEvidence.find(e => e.query === q && e.platform === p);
      if (!entry) return '—';
      if (entry.brandMentioned && entry.officialUrlCited) return M.citedWithLink;
      if (entry.brandMentioned) return M.mentioned;
      return M.absent;
    });
    return `| ${q} | ${cells.join(' | ')} |`;
  });

  const competitorLines = citationEvidence
    .filter(e => e.competitorsCited && e.competitorsCited.length > 0)
    .map(e => M.competitorLine(e.platform, e.query, e.competitorsCited.join(M.nameJoiner)));

  const lines = [M.header, '', header, divider, ...rows, ''];
  if (competitorLines.length > 0) {
    lines.push(M.competitorHeader, '', ...competitorLines, '');
  }
  return lines.join('\n');
}

function renderPresencePlan(brand, presenceUnknown, L) {
  if (!presenceUnknown || !brand) return null;
  const P = L.presencePlan;
  const encoded = encodeURIComponent(brand);
  const links = [
    { platform: 'GitHub',       url: `https://github.com/search?q=${encoded}`,                 note: P.notes.github },
    { platform: 'G2',           url: `https://www.g2.com/search#query=${encoded}`,             note: P.notes.g2 },
    { platform: '知乎 Zhihu',    url: `https://www.zhihu.com/search?type=content&q=${encoded}`, note: P.notes.zhihu },
    { platform: 'Product Hunt', url: `https://www.producthunt.com/search?q=${encoded}`,        note: P.notes.producthunt },
    { platform: '百度百科',      url: `https://baike.baidu.com/search/word?word=${encoded}`,    note: P.notes.baike },
    { platform: 'Capterra',     url: `https://www.capterra.com/search/?query=${encoded}`,      note: P.notes.capterra },
  ];
  const lines = [
    P.header,
    '',
    P.intro,
    '',
    ...links.map(l => `- **${l.platform}** (${l.note}): ${l.url}`),
    '',
    '```yaml',
    '# .agents/geo-audit-context.md',
    `presence: {"hasWikipedia": false, "hasBaiduBaike": false, "hasZhihu": false, "reviewPlatformCount": 0, "mediaMentionCount": 0, "socialPlatformCount": 0}`,
    '```',
  ];
  return lines.join('\n');
}

function buildMonitoringQueries(context, L) {
  const M = L.monitoring;
  const industry = context?.industry || '';
  const brand = context?.brand || M.defaultBrand;

  const base = M.base(brand);
  const industryFn = M.byIndustry[industry];
  const extra = industryFn ? industryFn(brand) : M.fallback();

  return [...base, ...extra];
}

function renderReport(scoreData, { robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, citationEvidence, sitemapResult, articleSchemaResult, articleUrl, context, url: auditUrl, lang, previousAudit }) {
  const locale = (lang || context?.lang || 'zh').toLowerCase();
  const L = STRINGS[locale] || STRINGS.zh;
  const R = L.report;

  const brand = context?.brand || auditUrl?.replace(/https?:\/\//, '').replace(/\/$/, '') || 'Unknown';
  const url = context?.url || auditUrl || '';
  const date = new Date().toISOString().slice(0, 10);
  const industry = context?.industry || '';
  const market = context?.market || '';

  const d = scoreData.dimensions;

  // Inject llms existence flag for action builder
  const llmsExists = llmsResult && !llmsResult.error &&
    Object.values(llmsResult).some(v => v.exists);
  scoreData._llmsExists = llmsExists;

  const { p0, p1, p2 } = buildActions(scoreData, schemaResult, url, L);
  const queries = buildMonitoringQueries(context, L);
  const failureCodes = diagnoseFailureCodes(scoreData, robotsResult, sitemapResult, L);

  const presenceDisplay = d.presence.raw !== null
    ? `${d.presence.raw}/${d.presence.max}`
    : `unknown/${d.presence.max}`;

  const contextLine = [industry, market].filter(Boolean).join(' / ');

  // Narrative summary
  const techOk = d.technical.raw >= 12;
  const structOk = d.structure.raw >= 16;
  const authOk = d.authority.raw >= 12;
  let narrative;
  if (d.technical.raw < 8) {
    narrative = R.narrative.techBlocked(brand);
  } else if (!authOk && !structOk) {
    narrative = R.narrative.weakBoth(brand, techOk);
  } else if (!authOk) {
    narrative = R.narrative.weakAuthority(brand, structOk);
  } else {
    narrative = R.narrative.weakPresence(brand);
  }

  // Article page authority evidence line
  const articleEvidenceLine = (() => {
    if (!articleSchemaResult || articleSchemaResult.error) return null;
    const E = R.articleEvidence;
    const ad = articleSchemaResult.authorDate || {};
    const sc = articleSchemaResult.schema || {};
    const found = [];
    found.push(ad.hasAuthor ? E.hasAuthor : E.noAuthor);
    found.push(ad.hasPublishDate ? E.hasDate : E.noDate);
    if (ad.hasModifiedDate) found.push(E.hasModified);
    const schemas = sc.found && sc.found.length ? sc.found.join(', ') : E.noSchema;
    return `${E.pageLabel} (${articleUrl})  ${found.join('  ')}  Schema: ${schemas}`;
  })();

  const lines = [
    R.title(brand, date),
    url ? `${R.targetSite}: ${url}` : '',
    contextLine ? `${R.industryMarket}: ${contextLine}` : '',
    '',
    R.conclusionHeader,
    '',
    renderVerdict(scoreData, R.verdict),
    '',
    narrative,
    '',
    R.scoreHeader,
    '',
    R.tableHead,
    '|------|-----:|:------:|------|',
    `| ${R.dims.technical} | ${d.technical.raw}/${d.technical.max} | ${confidenceSymbol(d.technical.confidence)} | ${statusIcon(d.technical.raw, d.technical.max)} |`,
    `| ${R.dims.structure} | ${d.structure.raw}/${d.structure.max} | ${confidenceSymbol(d.structure.confidence)} | ${statusIcon(d.structure.raw, d.structure.max)} |`,
    `| ${R.dims.authority} | ${d.authority.raw}/${d.authority.max} | ${confidenceSymbol(d.authority.confidence)} | ${statusIcon(d.authority.raw, d.authority.max)} |`,
    `| ${R.dims.presence} | ${presenceDisplay} | ${confidenceSymbol(d.presence.confidence)} | ${statusIcon(d.presence.raw, d.presence.max)} |`,
    `| **${R.totalRow}** | **${scoreData.total}/${scoreData.totalMax}** | | **${L.levelLabels[scoreData.level] || 'Unknown'}** |`,
    '',
  ];

  const trendSection = renderTrend(previousAudit, scoreData, L);
  if (trendSection) lines.push(trendSection, '');

  lines.push(
    R.evidenceHeader,
    '',
    renderRobots(robotsResult, L),
    citationRiskWarning(robotsResult, L),
    '',
    renderLlms(llmsResult, L),
    '',
    renderSchema(schemaResult, L),
    articleEvidenceLine ? '' : null,
    articleEvidenceLine,
    '',
  );

  const contentEvidence = renderContentEvidence(contentResult, L);
  if (contentEvidence) lines.push(contentEvidence, '');

  // Citation matrix (if user provided evidence)
  const citationMatrix = renderCitationMatrix(citationEvidence, L);
  if (citationMatrix) lines.push(citationMatrix);

  // Presence plan (if presence is unknown, generate search links)
  const presencePlan = renderPresencePlan(brand, scoreData.presenceUnknown, L);
  if (presencePlan) lines.push(presencePlan, '');

  // Failure taxonomy
  if (failureCodes.length > 0) {
    lines.push(L.taxonomyHeader, '');
    lines.push(L.taxonomyIntro, '');
    for (const fc of failureCodes) {
      lines.push(`**[${fc.code}] ${fc.label}**`);
      lines.push(`- ${L.taxonomyCause}: ${fc.detail}`);
      lines.push(`- ${L.taxonomyFix}: ${fc.fix}`);
      lines.push('');
    }
  }

  // P0
  if (p0.length > 0) {
    lines.push(R.p0Header, '');
    p0.forEach((item, i) => {
      lines.push(`**${i + 1}. ${item.title}**`, '');
      if (item.body) lines.push(item.body, '');
    });
  }

  // P1
  if (p1.length > 0) {
    lines.push(R.p1Header, '');
    p1.forEach((item, i) => {
      lines.push(`**${p0.length + i + 1}. ${item.title}**`, '');
      if (item.body) lines.push(item.body, '');
    });
  }

  // P2
  if (p2.length > 0) {
    lines.push(R.p2Header, '');
    p2.forEach((item, i) => {
      lines.push(`**${p0.length + p1.length + i + 1}. ${item.title}**`, '');
      if (item.body) lines.push(item.body, '');
    });
  }

  // Monitoring
  lines.push(
    R.monitoringHeader,
    '',
    R.monitoringIntro,
    '',
    ...queries.map(q => `- ${q}`),
    '',
    '---',
    '*Generated by [geo-audit](https://github.com/jiguang9/geo-audit)*',
  );

  return lines.filter(l => l !== null).join('\n');
}

module.exports = { renderReport };
