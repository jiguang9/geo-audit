'use strict';

/**
 * Locale strings for report.js. Two locales: zh (default) and en.
 * Dynamic strings are functions; static strings are plain values.
 * Both locales must expose an identical shape.
 */

const zh = {
  levelLabels: {
    1: 'Level 1：AI 爬虫被屏蔽或页面不可达',
    2: 'Level 2：可访问，但引用信号偏弱',
    3: 'Level 3：具备被 AI 引用的基础，但权威与实体链不稳定',
    4: 'Level 4：稳定被引用，结构与权威较强',
    5: 'Level 5：高频被引用，GEO 优化全面',
  },

  robotsError: e => `robots.txt   错误: ${e}`,
  robotsInaccessible: status => `robots.txt   不可访问 (HTTP ${status})`,
  citationRiskWarning: names => `⚠️  引用风险：以下爬虫被屏蔽（直接影响引用） — ${names}`,

  llmsError: e => `llms.txt     错误: ${e}`,
  llmsNotFound: '未找到',
  llmsFields: '字段',

  schemaError: e => `Schema       错误: ${e}`,
  schemaTitle: 'Schema 标记',
  schemaFound: '已找到',
  schemaMissingTypes: '缺失类型',
  schemaMissingProps: '缺失属性',
  none: '— 无',

  quotableHeader: '可引用片段（AI 高概率截取）:',
  missingBlocksLine: list => `缺失内容块: ${list} — 建议补充`,

  failureCodes: {
    T_ACCESS: {
      label: '技术可访问性故障',
      detail: names => `以下爬虫被 robots.txt 屏蔽，AI 平台无法索引内容：${names}`,
      fix: '修改 robots.txt，允许上述爬虫访问；或在 Disallow 规则上方添加 Allow: / 覆盖。',
    },
    T_INDEX: {
      label: '可发现性不足',
      detailLlms: '/llms.txt 缺失，AI 系统无法获取站点摘要和关键路径',
      detailSitemap: 'sitemap.xml 未找到，AI 爬虫无法发现站点页面列表',
      fixLlms: '上线 /llms.txt（见 P0 模板）',
      fixSitemap: '生成并提交 sitemap.xml，在 robots.txt 中用 Sitemap: 指令声明',
      joiner: '；',
    },
    C_MATCH: {
      label: '内容匹配失败',
      detail: (raw, max) => `内容可摘取性得分 ${raw}/${max}（低于阈值 12），缺少结构化 FAQ / 标题层级 / 可引用段落。`,
      fix: '补 FAQPage schema，确保 H1-H2-H3 层级完整，文章开头放可独立引用的摘要段。',
    },
    C_ANSWER: {
      label: '答案定向内容不足',
      detail: '页面无 FAQPage schema 且标题层级不完整，AI 系统难以提取"问题-答案"对。',
      fix: '添加 FAQPage JSON-LD，或在文章中增加明确的 Q&A 段落结构。',
    },
    A_AUTH: {
      label: '权威信号缺失',
      detail: (raw, max) => `实体与权威信号得分 ${raw}/${max}（低于阈值 8），AI 系统无法建立品牌实体可信度。`,
      fix: '首页添加 Organization JSON-LD（含 sameAs 指向社交媒体账号），文章页补作者署名和发布日期。',
    },
    A_FRESH: {
      label: '内容时效性不明',
      detail: '文章页缺少 datePublished / dateModified，AI 系统无法判断内容是否过期，倾向选择有明确日期的来源。',
      fix: '在 BlogPosting JSON-LD 中补 datePublished 和 dateModified 字段，HTML 中也添加 <time> 元素。',
    },
    P_ABSENCE: {
      label: '第三方存在感未知',
      detail: '无法确认品牌在知乎、Wikipedia、G2、媒体报道中的存在，AI 系统无法从第三方来源建立实体认知。',
      fix: '参见 P2 行动项，逐步建立知乎问答、目录收录、行业媒体报道的存在。',
    },
  },
  taxonomyHeader: '### 引用失败诊断',
  taxonomyIntro: '基于检测结果自动识别的引用障碍：',
  taxonomyCause: '原因',
  taxonomyFix: '修复',

  actions: {
    llms: {
      title: '上线 /llms.txt',
      intro: '`/llms.txt` 当前返回 404。给 AI 系统提供站点摘要是成本最低的 GEO 改善项。',
      generatorNote: '可用生成器自动从站点抓取标题、描述和关键页面，生成可直接发布的版本：',
      manualNote: '或手动按以下模板填写：',
      placeholderDesc: '> [在此填写：一句话描述网站定位和目标受众]',
      topics: ['- [主题 1]', '- [主题 2]', '- [主题 3]'],
    },
    canonical: {
      title: '首页补 canonical 和 Organization JSON-LD',
      intro: '首页缺 `canonical` 标签和 `Organization` schema，这两项是 AI 系统识别品牌实体的主入口。',
      brandName: '[品牌名]',
      brandDesc: '[一句话描述品牌定位]',
      founderName: '[创始人姓名]',
      topics: ['[核心主题 1]', '[核心主题 2]', '[核心主题 3]'],
    },
    faq: {
      title: '给首页 FAQ 补 FAQPage JSON-LD',
      intro: '首页有 FAQ 内容但缺 `FAQPage` schema，AI 系统无法结构化读取问答对。',
      q1: '[问题 1]', a1: '[答案 1]', q2: '[问题 2]', a2: '[答案 2]',
    },
    blogPosting: {
      title: '博客模板补 BlogPosting JSON-LD（含作者、日期、Breadcrumb）',
      intro: '文章页缺 `BlogPosting/Article` schema 和作者署名，AI 系统无法判断内容权威性和时效性。',
      headline: '[文章标题]', desc: '[文章摘要，40-80字]', author: '[作者]', brand: '[品牌名]', articleUrl: '[文章 URL]',
    },
    quotableSummary: {
      title: '每篇核心文章开头加"可引用摘要"',
      intro: '建议在正文开头放 40-80 字的独立摘要段，AI 更容易引用开头就给出结论的内容：',
      example: '**一句话结论：** [核心结论，明确主题 + 场景 + 原因]。',
    },
    hub: {
      title: '为核心主题建立 Hub 页',
      body: '每个核心主题建一个聚合页（如 `/topics/xxx/`），包含定义、FAQ、代表文章、工具和外部引用，是 AI 系统锚定你在该领域权威地位的重要信号。',
    },
    presence: {
      title: '建立第三方存在感',
      intro: 'AI 系统更愿意引用被外部复述的实体，建议按优先级推进：',
      items: [
        '- **知乎**：建立核心主题问答矩阵，署名品牌/作者。',
        '- **GitHub**：公开工具或样例仓库，提升技术社区可见度。',
        '- **小红书/公众号/掘金**：同步核心文章，保留原文链接（canonical 信号）。',
        '- **工具目录**（Product Hunt、Toolify、Futurepedia）：提交品牌/产品。',
        '- **Wikipedia / 百度百科**：如有行业影响力，建立词条或被已有词条引用。',
      ],
    },
    dataCitations: {
      title: '文章增加数据与外部引用',
      body: '在文章中引用公开数据来源（研究报告、行业统计），并加"实测/案例复盘"模块。AI 更倾向引用带有外部佐证的内容。',
    },
  },

  matrix: {
    header: '### 引用证据矩阵',
    queryPlatform: '查询 / 平台',
    citedWithLink: '✅ 引用+链接',
    mentioned: '⚠️ 提及',
    absent: '❌ 未出现',
    competitorHeader: '**竞品被引用情况**',
    competitorLine: (platform, query, names) => `- ${platform} / "${query}"：${names} 被引用`,
    nameJoiner: '、',
  },

  presencePlan: {
    header: '### 第三方存在感验证（待填写）',
    intro: '请在以下链接搜索品牌，确认后将结果填入 `.agents/geo-audit-context.md` 的 `presence` 字段：',
    notes: {
      github: '仓库/话题引用', g2: '软件评测收录', zhihu: '问答社区存在感',
      producthunt: '产品发现平台', baike: '中文百科词条', capterra: '企业软件目录',
    },
  },

  monitoring: {
    base: brand => [`${brand} 是什么？`, `${brand} 怎么样？`, `${brand} 和竞品有什么区别？`],
    byIndustry: {
      SaaS: brand => [`${brand} 适合哪些场景？`, 'AI SaaS 工具推荐', '最好用的 [类别] 工具有哪些？'],
      ecommerce: brand => ['购买 [产品类别] 推荐哪个品牌？', `${brand} 评价怎么样？`, '哪个 [产品] 性价比最高？'],
      media: () => ['学习 [主题] 看哪个网站？', '[主题] 最权威的内容在哪？', '[主题] 入门指南'],
      B2B: brand => [`${brand} 适合哪些企业？`, '[行业] 解决方案推荐', '企业选型 [类别] 怎么比较？'],
    },
    fallback: () => ['[核心关键词] 怎么做？', '[核心关键词] 最佳实践', '推荐的 [类别] 工具或资源'],
    defaultBrand: '[品牌]',
  },

  trend: {
    header: date => `### 得分趋势（对比 ${date}）`,
    tableHead: '| 维度 | 上次 | 本次 | 变化 |',
    totalRow: '总分（归一化 0-100）',
    unknown: 'unknown',
  },

  report: {
    title: (brand, date) => `## GEO 诊断报告 — ${brand}（${date}）`,
    targetSite: '**目标网站**',
    industryMarket: '**行业/市场**',
    conclusionHeader: '### 总体结论',
    scoreHeader: '### GEO 得分',
    tableHead: '| 维度 | 得分 | 置信度 | 判断 |',
    dims: { technical: '技术可访问性', structure: '内容可摘取性', authority: '实体与权威信号', presence: '第三方存在感' },
    totalRow: '总分',
    evidenceHeader: '### 关键技术证据',
    p0Header: '### P0：本周做',
    p1Header: '### P1：本月做',
    p2Header: '### P2：持续做',
    monitoringHeader: '### 推荐监控',
    monitoringIntro: '每月人工测试以下查询，记录 ChatGPT、Perplexity、Google AI Overviews、DeepSeek、豆包是否引用本站：',
    articleEvidence: {
      hasAuthor: '✅ 有作者', noAuthor: '❌ 无作者',
      hasDate: '✅ 有发布日期', noDate: '❌ 无发布日期',
      hasModified: '✅ 有修改日期', noSchema: '无 schema',
      pageLabel: '文章页',
    },
    narrative: {
      techBlocked: brand => `${brand} 当前 AI 可见性的首要障碍是技术层面：爬虫访问受限或关键机器可读文件缺失，在解决技术问题前，其他优化效果有限。`,
      weakBoth: (brand, techOk) => `${brand} 的技术访问基础${techOk ? '不错' : '基本具备'}，但首页缺少机器可读的实体信号（Schema、作者、日期），内容结构对 AI 的可提取性也有待加强，这是当前被引用率低的核心原因。`,
      weakAuthority: (brand, structOk) => `${brand} 的内容结构${structOk ? '较好' : '基本具备'}，但权威信号不足（缺作者署名、日期或 Organization schema），AI 系统难以判断内容可信度，影响被引用概率。`,
      weakPresence: brand => `${brand} 的技术访问和内容结构已有一定基础，当前主要瓶颈是第三方存在感不足 — AI 系统更倾向引用在外部平台被反复提及的实体。`,
    },
  },
};

const en = {
  levelLabels: {
    1: 'Level 1: AI crawlers blocked or site unreachable',
    2: 'Level 2: reachable, but citation signals are weak',
    3: 'Level 3: citable foundation, but authority and entity signals are unstable',
    4: 'Level 4: regularly cited, strong structure and authority',
    5: 'Level 5: high-frequency citation, comprehensive GEO optimization',
  },

  robotsError: e => `robots.txt   error: ${e}`,
  robotsInaccessible: status => `robots.txt   not accessible (HTTP ${status})`,
  citationRiskWarning: names => `⚠️  Citation risk: the following crawlers are blocked (directly hurts citation) — ${names}`,

  llmsError: e => `llms.txt     error: ${e}`,
  llmsNotFound: 'not found',
  llmsFields: 'fields',

  schemaError: e => `Schema       error: ${e}`,
  schemaTitle: 'Schema markup',
  schemaFound: 'Found',
  schemaMissingTypes: 'Missing types',
  schemaMissingProps: 'Missing props',
  none: '— none',

  quotableHeader: 'Quotable blocks (likely to be excerpted by AI):',
  missingBlocksLine: list => `Missing block types: ${list} — consider adding them`,

  failureCodes: {
    T_ACCESS: {
      label: 'Technical access failure',
      detail: names => `The following crawlers are blocked by robots.txt, so AI platforms cannot index the content: ${names}`,
      fix: 'Update robots.txt to allow these crawlers, or add an overriding Allow: / above the Disallow rules.',
    },
    T_INDEX: {
      label: 'Poor discoverability',
      detailLlms: '/llms.txt is missing, so AI systems cannot obtain a site summary and key paths',
      detailSitemap: 'sitemap.xml was not found, so AI crawlers cannot discover the page list',
      fixLlms: 'Publish /llms.txt (see the P0 template)',
      fixSitemap: 'Generate and submit sitemap.xml, and declare it in robots.txt with a Sitemap: directive',
      joiner: '; ',
    },
    C_MATCH: {
      label: 'Content match failure',
      detail: (raw, max) => `Structure extractability scored ${raw}/${max} (below the 12-point threshold): missing structured FAQ / heading hierarchy / quotable paragraphs.`,
      fix: 'Add FAQPage schema, complete the H1-H2-H3 hierarchy, and open articles with a self-contained summary paragraph.',
    },
    C_ANSWER: {
      label: 'Insufficient answer-oriented content',
      detail: 'The page has no FAQPage schema and an incomplete heading hierarchy, so AI systems struggle to extract question-answer pairs.',
      fix: 'Add FAQPage JSON-LD, or add explicit Q&A sections to articles.',
    },
    A_AUTH: {
      label: 'Missing authority signals',
      detail: (raw, max) => `Authority scored ${raw}/${max} (below the 8-point threshold): AI systems cannot establish brand-entity credibility.`,
      fix: 'Add Organization JSON-LD to the homepage (with sameAs links to social profiles) and add author bylines and publish dates to articles.',
    },
    A_FRESH: {
      label: 'Unknown content freshness',
      detail: 'Article pages lack datePublished / dateModified, so AI systems cannot tell whether content is current and prefer clearly dated sources.',
      fix: 'Add datePublished and dateModified to BlogPosting JSON-LD, and add <time> elements in the HTML.',
    },
    P_ABSENCE: {
      label: 'Third-party presence unknown',
      detail: 'Brand presence on Wikipedia, G2, Zhihu, or in media coverage could not be confirmed, so AI systems cannot build entity recognition from third-party sources.',
      fix: 'See the P2 actions: build presence through Q&A platforms, directory listings, and industry media coverage.',
    },
  },
  taxonomyHeader: '### Citation Failure Diagnosis',
  taxonomyIntro: 'Citation blockers automatically identified from the audit results:',
  taxonomyCause: 'Cause',
  taxonomyFix: 'Fix',

  actions: {
    llms: {
      title: 'Publish /llms.txt',
      intro: '`/llms.txt` currently returns 404. Giving AI systems a site summary is the cheapest GEO improvement available.',
      generatorNote: 'Use the generator to build a publish-ready version from your live site (title, description, key pages):',
      manualNote: 'Or fill in this template manually:',
      placeholderDesc: '> [TODO: one-line description of the site and its audience]',
      topics: ['- [Core topic 1]', '- [Core topic 2]', '- [Core topic 3]'],
    },
    canonical: {
      title: 'Add canonical + Organization JSON-LD to the homepage',
      intro: 'The homepage lacks a `canonical` tag and `Organization` schema — the two primary entry points for AI systems to identify your brand entity.',
      brandName: '[Brand name]',
      brandDesc: '[One-line description of the brand]',
      founderName: '[Founder name]',
      topics: ['[Core topic 1]', '[Core topic 2]', '[Core topic 3]'],
    },
    faq: {
      title: 'Add FAQPage JSON-LD to the homepage FAQ',
      intro: 'The homepage has FAQ content but no `FAQPage` schema, so AI systems cannot read the Q&A pairs in a structured way.',
      q1: '[Question 1]', a1: '[Answer 1]', q2: '[Question 2]', a2: '[Answer 2]',
    },
    blogPosting: {
      title: 'Add BlogPosting JSON-LD to the blog template (author, dates, breadcrumb)',
      intro: 'Article pages lack `BlogPosting/Article` schema and author bylines, so AI systems cannot judge authority or freshness.',
      headline: '[Article title]', desc: '[Article summary, 40-80 words]', author: '[Author]', brand: '[Brand name]', articleUrl: '[Article URL]',
    },
    quotableSummary: {
      title: 'Open every core article with a quotable summary',
      intro: 'Put a self-contained 40-80 word summary at the top of each article — AI systems prefer citing content that states its conclusion up front:',
      example: '**Bottom line:** [Core conclusion — topic + scenario + reason].',
    },
    hub: {
      title: 'Build hub pages for core topics',
      body: 'Create one aggregation page per core topic (e.g. `/topics/xxx/`) with a definition, FAQ, representative articles, tools, and external references — a strong signal that anchors your authority on the topic.',
    },
    presence: {
      title: 'Build third-party presence',
      intro: 'AI systems prefer citing entities that are restated by external sources. Recommended order:',
      items: [
        '- **Q&A platforms** (Zhihu, Reddit, Stack Overflow): build a Q&A matrix on core topics under the brand/author name.',
        '- **GitHub**: publish tools or sample repositories to raise developer-community visibility.',
        '- **Content syndication** (Medium, dev.to, WeChat): republish core articles with canonical links back.',
        '- **Tool directories** (Product Hunt, Toolify, Futurepedia): submit the brand/product.',
        '- **Wikipedia / Baidu Baike**: if notable enough, create an entry or get referenced by existing ones.',
      ],
    },
    dataCitations: {
      title: 'Add data and external references to articles',
      body: 'Cite public data sources (research reports, industry statistics) and add hands-on test / case-study sections. AI systems prefer citing externally corroborated content.',
    },
  },

  matrix: {
    header: '### Citation Evidence Matrix',
    queryPlatform: 'Query / Platform',
    citedWithLink: '✅ Cited + linked',
    mentioned: '⚠️ Mentioned',
    absent: '❌ Absent',
    competitorHeader: '**Competitor citations**',
    competitorLine: (platform, query, names) => `- ${platform} / "${query}": ${names} cited`,
    nameJoiner: ', ',
  },

  presencePlan: {
    header: '### Third-Party Presence Verification (to fill in)',
    intro: 'Search for the brand at the links below, then record the results in the `presence` field of `.agents/geo-audit-context.md`:',
    notes: {
      github: 'repository/topic references', g2: 'software review listing', zhihu: 'Q&A community presence',
      producthunt: 'product discovery platform', baike: 'Chinese encyclopedia entry', capterra: 'business software directory',
    },
  },

  monitoring: {
    base: brand => [`What is ${brand}?`, `Is ${brand} any good?`, `How does ${brand} compare to alternatives?`],
    byIndustry: {
      SaaS: brand => [`What is ${brand} best used for?`, 'best AI SaaS tools', 'best [category] tools'],
      ecommerce: brand => ['which brand of [product category] should I buy?', `${brand} reviews`, 'best value [product]'],
      media: () => ['best website to learn [topic]', 'most authoritative resource on [topic]', '[topic] beginner guide'],
      B2B: brand => [`What kinds of companies is ${brand} for?`, '[industry] solution recommendations', 'how to evaluate [category] vendors'],
    },
    fallback: () => ['how to do [core keyword]', '[core keyword] best practices', 'recommended [category] tools or resources'],
    defaultBrand: '[Brand]',
  },

  trend: {
    header: date => `### Score Trend (vs ${date})`,
    tableHead: '| Dimension | Previous | Current | Change |',
    totalRow: 'Total (normalized 0-100)',
    unknown: 'unknown',
  },

  report: {
    title: (brand, date) => `## GEO Audit Report — ${brand} (${date})`,
    targetSite: '**Target site**',
    industryMarket: '**Industry/Market**',
    conclusionHeader: '### Overall Assessment',
    scoreHeader: '### GEO Score',
    tableHead: '| Dimension | Score | Confidence | Status |',
    dims: { technical: 'Technical accessibility', structure: 'Structure extractability', authority: 'Entity & authority signals', presence: 'Third-party presence' },
    totalRow: 'Total',
    evidenceHeader: '### Key Technical Evidence',
    p0Header: '### P0: This Week',
    p1Header: '### P1: This Month',
    p2Header: '### P2: Ongoing',
    monitoringHeader: '### Recommended Monitoring',
    monitoringIntro: 'Manually test these queries monthly and record whether ChatGPT, Perplexity, Google AI Overviews, DeepSeek, and Doubao cite this site:',
    articleEvidence: {
      hasAuthor: '✅ author', noAuthor: '❌ no author',
      hasDate: '✅ publish date', noDate: '❌ no publish date',
      hasModified: '✅ modified date', noSchema: 'no schema',
      pageLabel: 'Article page',
    },
    narrative: {
      techBlocked: brand => `${brand}'s primary AI-visibility blocker is technical: crawler access is restricted or key machine-readable files are missing. Until that is fixed, other optimizations will have limited effect.`,
      weakBoth: (brand, techOk) => `${brand}'s technical access is ${techOk ? 'solid' : 'basically in place'}, but the homepage lacks machine-readable entity signals (schema, author, dates) and the content structure is hard for AI to extract — the core reason for the low citation rate.`,
      weakAuthority: (brand, structOk) => `${brand}'s content structure is ${structOk ? 'good' : 'basically in place'}, but authority signals are weak (missing author bylines, dates, or Organization schema), so AI systems cannot judge credibility, which lowers citation probability.`,
      weakPresence: brand => `${brand} has a reasonable technical and structural foundation. The current bottleneck is third-party presence — AI systems prefer citing entities that are repeatedly mentioned on external platforms.`,
    },
  },
};

module.exports = { zh, en };
