'use strict';

function levelLabel(level) {
  return {
    1: 'Level 1：AI 爬虫被屏蔽或页面不可达',
    2: 'Level 2：可访问，但引用信号偏弱',
    3: 'Level 3：具备被 AI 引用的基础，但权威与实体链不稳定',
    4: 'Level 4：稳定被引用，结构与权威较强',
    5: 'Level 5：高频被引用，GEO 优化全面',
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
  if (!robotsResult || robotsResult.error) return `robots.txt   错误: ${robotsResult?.error || 'no result'}`;
  if (!robotsResult.accessible) return `robots.txt   不可访问 (HTTP ${robotsResult.httpStatus || 'N/A'})`;
  const icon = { allowed: '✅', blocked: '❌', 'not-mentioned': '⚠️', unknown: '❓' };
  const lines = robotsResult.crawlers.map(c =>
    `  ${icon[c.result] || '❓'} ${c.name.padEnd(22)} ${c.result.padEnd(15)} ${c.platform}`
  );
  return `robots.txt   ${robotsResult.url}\n${lines.join('\n')}`;
}

function renderLlms(llmsResult) {
  if (!llmsResult || llmsResult.error) return `llms.txt     错误: ${llmsResult?.error || 'no result'}`;
  const parts = [];
  for (const [file, info] of Object.entries(llmsResult)) {
    if (info.error) parts.push(`  ❓ /${file} — ${info.error}`);
    else if (!info.exists) parts.push(`  ⬜ /${file} — 未找到`);
    else parts.push(`  ${info.requiredMet ? '✅' : '⚠️'} /${file} — ${info.sizeBytes}B，字段: ${info.completeness}`);
  }
  return `llms.txt\n${parts.join('\n')}`;
}

function renderSchema(schemaResult) {
  if (!schemaResult || schemaResult.error) return `Schema       错误: ${schemaResult?.error || 'no result'}`;
  const s = schemaResult.schema || {};
  const m = schemaResult.meta || {};
  return [
    `Schema 标记`,
    `  已找到:   ${s.found && s.found.length ? s.found.join(', ') : '— 无'}`,
    `  缺失:     ${s.missing && s.missing.length ? s.missing.slice(0, 5).join(', ') : '— 无'}`,
    `  Title: ${m.title ? '✅' : '❌'}   Description: ${m.description ? '✅' : '❌'}   Canonical: ${m.canonical ? '✅' : '❌'}`,
  ].join('\n');
}

function buildActions(scoreData, schemaResult, url) {
  const d = scoreData.dimensions;
  const m = schemaResult?.meta || {};
  const s = schemaResult?.schema || {};
  const domain = url ? url.replace(/\/$/, '') : 'https://example.com';

  const p0 = [];
  const p1 = [];
  const p2 = [];

  // Technical — P0 priority
  const llmsExists = scoreData._llmsExists;
  if (!llmsExists) {
    p0.push({
      title: '上线 /llms.txt',
      body: [
        '`/llms.txt` 当前返回 404。给 AI 系统提供站点摘要是成本最低的 GEO 改善项。',
        '',
        '```txt',
        `# ${domain.replace(/https?:\/\//, '')}`,
        '',
        '> [在此填写：一句话描述网站定位和目标受众]',
        '',
        '## Key pages',
        `- Home: ${domain}/`,
        `- About: ${domain}/about`,
        `- Blog: ${domain}/blog`,
        '',
        '## Core topics',
        '- [主题 1]',
        '- [主题 2]',
        '- [主题 3]',
        '```',
      ].join('\n'),
    });
  }

  if (!m.canonical) {
    p0.push({
      title: '首页补 canonical 和 Organization JSON-LD',
      body: [
        '首页缺 `canonical` 标签和 `Organization` schema，这两项是 AI 系统识别品牌实体的主入口。',
        '',
        '```html',
        `<link rel="canonical" href="${domain}/">`,
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "Organization",',
        `  "name": "[品牌名]",`,
        `  "url": "${domain}/",`,
        '  "description": "[一句话描述品牌定位]",',
        '  "founder": {',
        '    "@type": "Person",',
        '    "name": "[创始人姓名]"',
        '  },',
        '  "knowsAbout": ["[核心主题 1]", "[核心主题 2]", "[核心主题 3]"]',
        '}',
        '</script>',
      ].join('\n'),
    });
  }

  const hasFaqSchema = s.found && s.found.includes('FAQPage');
  if (!hasFaqSchema && d.structure.breakdown.faqScore < 6) {
    p0.push({
      title: '给首页 FAQ 补 FAQPage JSON-LD',
      body: [
        '首页有 FAQ 内容但缺 `FAQPage` schema，AI 系统无法结构化读取问答对。',
        '',
        '```html',
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "FAQPage",',
        '  "mainEntity": [',
        '    {',
        '      "@type": "Question",',
        '      "name": "[问题 1]",',
        '      "acceptedAnswer": { "@type": "Answer", "text": "[答案 1]" }',
        '    },',
        '    {',
        '      "@type": "Question",',
        '      "name": "[问题 2]",',
        '      "acceptedAnswer": { "@type": "Answer", "text": "[答案 2]" }',
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
      title: '博客模板补 BlogPosting JSON-LD（含作者、日期、Breadcrumb）',
      body: [
        '文章页缺 `BlogPosting/Article` schema 和作者署名，AI 系统无法判断内容权威性和时效性。',
        '',
        '```html',
        '<script type="application/ld+json">',
        '{',
        '  "@context": "https://schema.org",',
        '  "@type": "BlogPosting",',
        '  "headline": "[文章标题]",',
        '  "description": "[文章摘要，40-80字]",',
        '  "datePublished": "YYYY-MM-DD",',
        '  "dateModified": "YYYY-MM-DD",',
        '  "author": { "@type": "Person", "name": "[作者]", "url": "[/about]" },',
        '  "publisher": { "@type": "Organization", "name": "[品牌名]" },',
        '  "mainEntityOfPage": { "@type": "WebPage", "@id": "[文章 URL]" }',
        '}',
        '</script>',
      ].join('\n'),
    });
  }

  if (d.structure.breakdown.listScore < 3) {
    p1.push({
      title: '每篇核心文章开头加"可引用摘要"',
      body: [
        '建议在正文开头放 40-80 字的独立摘要段，AI 更容易引用开头就给出结论的内容：',
        '',
        '```md',
        '**一句话结论：** [核心结论，明确主题 + 场景 + 原因]。',
        '```',
      ].join('\n'),
    });
  }

  p1.push({
    title: '为核心主题建立 Hub 页',
    body: '每个核心主题建一个聚合页（如 `/topics/xxx/`），包含定义、FAQ、代表文章、工具和外部引用，是 AI 系统锚定你在该领域权威地位的重要信号。',
  });

  // Presence — P2
  if (d.presence.unknown) {
    p2.push({
      title: '建立第三方存在感',
      body: [
        'AI 系统更愿意引用被外部复述的实体，建议按优先级推进：',
        '',
        '- **知乎**：建立核心主题问答矩阵，署名品牌/作者。',
        '- **GitHub**：公开工具或样例仓库，提升技术社区可见度。',
        '- **小红书/公众号/掘金**：同步核心文章，保留原文链接（canonical 信号）。',
        '- **工具目录**（Product Hunt、Toolify、Futurepedia）：提交品牌/产品。',
        '- **Wikipedia / 百度百科**：如有行业影响力，建立词条或被已有词条引用。',
      ].join('\n'),
    });
  }

  p2.push({
    title: '文章增加数据与外部引用',
    body: '在文章中引用公开数据来源（研究报告、行业统计），并加"实测/案例复盘"模块。AI 更倾向引用带有外部佐证的内容。',
  });

  return { p0, p1, p2 };
}

function buildMonitoringQueries(context) {
  const industry = context?.industry || '';
  const brand = context?.brand || '[品牌]';

  const base = [
    `${brand} 是什么？`,
    `${brand} 怎么样？`,
    `${brand} 和竞品有什么区别？`,
  ];

  const byIndustry = {
    SaaS: [
      `${brand} 适合哪些场景？`,
      'AI SaaS 工具推荐',
      '最好用的 [类别] 工具有哪些？',
    ],
    ecommerce: [
      `购买 [产品类别] 推荐哪个品牌？`,
      `${brand} 评价怎么样？`,
      '哪个 [产品] 性价比最高？',
    ],
    media: [
      '学习 [主题] 看哪个网站？',
      '[主题] 最权威的内容在哪？',
      '[主题] 入门指南',
    ],
    B2B: [
      `${brand} 适合哪些企业？`,
      '[行业] 解决方案推荐',
      '企业选型 [类别] 怎么比较？',
    ],
  };

  const extra = byIndustry[industry] || [
    '[核心关键词] 怎么做？',
    '[核心关键词] 最佳实践',
    '推荐的 [类别] 工具或资源',
  ];

  return [...base, ...extra];
}

function renderReport(scoreData, { robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, articleSchemaResult, articleUrl, context, url: auditUrl }) {
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

  const { p0, p1, p2 } = buildActions(scoreData, schemaResult, url);
  const queries = buildMonitoringQueries(context);

  const presenceDisplay = d.presence.raw !== null
    ? `${d.presence.raw}/${d.presence.max}`
    : `unknown/${d.presence.max}`;

  const contextLine = [industry, market].filter(Boolean).join(' / ');

  // Narrative summary
  const techOk = d.technical.raw >= 12;
  const structOk = d.structure.raw >= 16;
  const authOk = d.authority.raw >= 12;
  let narrative = '';
  if (d.technical.raw < 8) {
    narrative = `${brand} 当前 AI 可见性的首要障碍是技术层面：爬虫访问受限或关键机器可读文件缺失，在解决技术问题前，其他优化效果有限。`;
  } else if (!authOk && !structOk) {
    narrative = `${brand} 的技术访问基础${techOk ? '不错' : '基本具备'}，但首页缺少机器可读的实体信号（Schema、作者、日期），内容结构对 AI 的可提取性也有待加强，这是当前被引用率低的核心原因。`;
  } else if (!authOk) {
    narrative = `${brand} 的内容结构${structOk ? '较好' : '基本具备'}，但权威信号不足（缺作者署名、日期或 Organization schema），AI 系统难以判断内容可信度，影响被引用概率。`;
  } else {
    narrative = `${brand} 的技术访问和内容结构已有一定基础，当前主要瓶颈是第三方存在感不足 — AI 系统更倾向引用在外部平台被反复提及的实体。`;
  }

  // Article page authority evidence line
  const articleEvidenceLine = (() => {
    if (!articleSchemaResult || articleSchemaResult.error) return null;
    const ad = articleSchemaResult.authorDate || {};
    const sc = articleSchemaResult.schema || {};
    const found = [];
    if (ad.hasAuthor) found.push('✅ 有作者');
    else found.push('❌ 无作者');
    if (ad.hasPublishDate) found.push('✅ 有发布日期');
    else found.push('❌ 无发布日期');
    if (ad.hasModifiedDate) found.push('✅ 有修改日期');
    const schemas = sc.found && sc.found.length ? sc.found.join(', ') : '无 schema';
    return `文章页 (${articleUrl})  ${found.join('  ')}  Schema: ${schemas}`;
  })();

  const lines = [
    `## GEO 诊断报告 — ${brand}（${date}）`,
    url ? `**目标网站**: ${url}` : '',
    contextLine ? `**行业/市场**: ${contextLine}` : '',
    '',
    '### 总体结论',
    '',
    narrative,
    '',
    '### GEO 得分',
    '',
    '| 维度 | 得分 | 判断 |',
    '|------|-----:|------|',
    `| 技术可访问性 | ${d.technical.raw}/${d.technical.max} | ${statusIcon(d.technical.raw, d.technical.max)} |`,
    `| 内容可摘取性 | ${d.structure.raw}/${d.structure.max} | ${statusIcon(d.structure.raw, d.structure.max)} |`,
    `| 实体与权威信号 | ${d.authority.raw}/${d.authority.max} | ${statusIcon(d.authority.raw, d.authority.max)} |`,
    `| 第三方存在感 | ${presenceDisplay} | ${statusIcon(d.presence.raw, d.presence.max)} |`,
    `| **总分** | **${scoreData.total}/${scoreData.totalMax}** | **${levelLabel(scoreData.level)}** |`,
    '',
    '### 关键技术证据',
    '',
    renderRobots(robotsResult),
    '',
    renderLlms(llmsResult),
    '',
    renderSchema(schemaResult),
    articleEvidenceLine ? '' : null,
    articleEvidenceLine,
    '',
  ];

  // P0
  if (p0.length > 0) {
    lines.push('### P0：本周做', '');
    p0.forEach((item, i) => {
      lines.push(`**${i + 1}. ${item.title}**`, '');
      if (item.body) lines.push(item.body, '');
    });
  }

  // P1
  if (p1.length > 0) {
    lines.push('### P1：本月做', '');
    p1.forEach((item, i) => {
      lines.push(`**${p0.length + i + 1}. ${item.title}**`, '');
      if (item.body) lines.push(item.body, '');
    });
  }

  // P2
  if (p2.length > 0) {
    lines.push('### P2：持续做', '');
    p2.forEach((item, i) => {
      lines.push(`**${p0.length + p1.length + i + 1}. ${item.title}**`, '');
      if (item.body) lines.push(item.body, '');
    });
  }

  // Monitoring
  lines.push(
    '### 推荐监控',
    '',
    '每月人工测试以下查询，记录 ChatGPT、Perplexity、Google AI Overviews、DeepSeek、豆包是否引用本站：',
    '',
    ...queries.map(q => `- ${q}`),
    '',
    '---',
    '*Generated by [geo-audit](https://github.com/jiguang9/geo-audit)*',
  );

  return lines.filter(l => l !== null).join('\n');
}

module.exports = { renderReport };
