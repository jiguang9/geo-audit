'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { renderReport } = require('../tools/report.js');
const { computeGeoScore } = require('../tools/score.js');

const goodSchema = {
  headings: { h1Count: 1, h2Count: 3, h3Count: 2, hasProperHierarchy: true },
  schema: { found: ['Article', 'FAQPage'], missing: ['HowTo', 'Product', 'Organization', 'BreadcrumbList', 'WebSite'] },
  structure: { tables: 1, orderedLists: 1, unorderedLists: 1, detailsBlocks: 0, hasFaqClass: false, hasFaqSchema: true },
  authorDate: { hasAuthor: true, hasPublishDate: true, hasModifiedDate: false },
  meta: { title: 'Test Page', description: 'A test.', canonical: 'https://example.com/test' },
  externalLinks: 6,
};

const goodRobots = {
  accessible: true,
  httpStatus: 200,
  url: 'https://example.com/robots.txt',
  crawlers: [
    { name: 'GPTBot', result: 'allowed', platform: 'ChatGPT' },
    { name: 'ClaudeBot', result: 'allowed', platform: 'Claude' },
    { name: 'PerplexityBot', result: 'not-mentioned', platform: 'Perplexity' },
  ],
};

const goodLlms = {
  'llms.txt': { exists: true, requiredMet: true, sizeBytes: 400, completeness: '3/4', url: 'https://example.com/llms.txt' },
  'llms-full.txt': { exists: false, httpStatus: 404, url: 'https://example.com/llms-full.txt' },
};

const context = { brand: 'Example Co', url: 'https://example.com' };

function makeScore(presenceEvidence = {}) {
  return computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: null,
    presenceEvidence,
  });
}

test('renderReport — contains brand name and date', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('Example Co'), 'Should contain brand name');
  assert.ok(report.match(/\d{4}-\d{2}-\d{2}/), 'Should contain date');
});

test('renderReport — contains GEO score section', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('GEO 得分'), 'Should contain GEO 得分 section');
});

test('renderReport — contains all 4 dimension rows', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('技术可访问性'));
  assert.ok(report.includes('内容可摘取性'));
  assert.ok(report.includes('实体与权威信号'));
  assert.ok(report.includes('第三方存在感'));
});

test('renderReport — unknown presence dimension is flagged', () => {
  const score = makeScore({});
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('unknown'), 'Should flag unknown presence');
});

test('renderReport — contains priority action sections', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('P0') || report.includes('P1') || report.includes('P2'), 'Should have priority action sections');
});

test('renderReport — contains robots.txt section', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('robots.txt'));
  assert.ok(report.includes('GPTBot'));
});

test('renderReport — contains llms.txt section', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('llms.txt'));
});

test('renderReport — level label appears', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.match(/Level \d/), 'Should contain level label');
});

test('renderReport — output is non-empty string', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.equal(typeof report, 'string');
  assert.ok(report.length > 200, 'Report should be substantial');
});

// ── Schema missingProperties display tests ──────────────────────────────────

const schemaWithMissingProps = {
  headings: { h1Count: 1, h2Count: 2, h3Count: 0, hasProperHierarchy: true },
  schema: {
    found: ['Organization'],
    missing: [],
    missingProperties: [
      { type: 'Organization', property: 'sameAs' },
      { type: 'Organization', property: 'logo' },
      { type: 'Organization', property: 'description' },
    ],
  },
  structure: { tables: 0, orderedLists: 0, unorderedLists: 0, detailsBlocks: 0, hasFaqClass: false, hasFaqSchema: false },
  authorDate: { hasAuthor: false, hasPublishDate: false, hasModifiedDate: false },
  meta: { title: 'Test', description: 'Test.', canonical: 'https://example.com/' },
  externalLinks: 2,
};

test('renderReport — schema missingProperties appear in report', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: schemaWithMissingProps, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('缺失属性'), 'Should include 缺失属性 label');
  assert.ok(report.includes('Organization.sameAs'), 'Should list Organization.sameAs');
  assert.ok(report.includes('Organization.logo'), 'Should list Organization.logo');
});

// ── Content evidence (quotableBlocks / missingBlocks) display tests ───────────

const contentWithQuotables = {
  quotableBlocks: [
    { type: 'definition', text: 'GEO refers to Generative Engine Optimization, which optimizes content for AI citation.', reason: '直接定义术语，AI 易截取' },
    { type: 'statistic',  text: '78% of users prefer AI-cited answers over traditional search results.',                  reason: '含量化数据，增加引用可信度' },
  ],
  missingBlocks: ['step', 'citation', 'faq'],
};

test('renderReport — quotableBlocks appear in report', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: contentWithQuotables, presenceEvidence: {}, context });
  assert.ok(report.includes('可引用片段'), 'Should include 可引用片段 section');
  assert.ok(report.includes('[definition]') || report.includes('definition'), 'Should show definition block type');
  assert.ok(report.includes('GEO refers to'), 'Should include quotable text excerpt');
});

test('renderReport — missingBlocks appear in report', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: contentWithQuotables, presenceEvidence: {}, context });
  assert.ok(report.includes('缺失内容块'), 'Should include 缺失内容块 label');
  assert.ok(report.includes('step'), 'Should list step as missing block');
  assert.ok(report.includes('faq'), 'Should list faq as missing block');
});

// ── Failure taxonomy tests ──────────────────────────────────────────────────

const blockedRobots = {
  accessible: true,
  httpStatus: 200,
  url: 'https://example.com/robots.txt',
  crawlers: [
    { name: 'Googlebot',     result: 'blocked',       citationRisk: 'high',   platform: 'Google AI Overviews', role: 'search'   },
    { name: 'PerplexityBot', result: 'blocked',       citationRisk: 'high',   platform: 'Perplexity',          role: 'search'   },
    { name: 'GPTBot',        result: 'not-mentioned', citationRisk: 'none',   platform: 'ChatGPT',             role: 'training' },
  ],
};

const missingSitemap = { found: false, error: 'No sitemap found' };
const foundSitemap   = { found: true, path: '/sitemap.xml', totalUrls: 50, blogCount: 20, sampleUrls: [] };

test('renderReport — T-ACCESS failure code appears when search crawlers blocked', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: blockedRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('T-ACCESS'), 'Should include T-ACCESS code');
  assert.ok(report.includes('Googlebot'), 'Should name the blocked crawler');
});

test('renderReport — T-INDEX appears when sitemap is missing', () => {
  const score = makeScore();
  score._llmsExists = true;
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, sitemapResult: missingSitemap, context });
  assert.ok(report.includes('T-INDEX'), 'Should include T-INDEX when sitemap missing');
  assert.ok(report.includes('sitemap'), 'Should mention sitemap in T-INDEX detail');
});

test('renderReport — T-INDEX does NOT appear when both sitemap and llms.txt exist', () => {
  const score = makeScore();
  score._llmsExists = true;
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, sitemapResult: foundSitemap, context });
  assert.ok(!report.includes('T-INDEX'), 'Should NOT include T-INDEX when both sitemap and llms.txt exist');
});

test('renderReport — P-ABSENCE appears when presence is unknown', () => {
  const score = makeScore({});  // empty presenceEvidence → unknown
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('P-ABSENCE'), 'Should include P-ABSENCE when presence unknown');
});

// ── Citation matrix tests ───────────────────────────────────────────────────

const citationEvidence = [
  { query: 'AI SEO工具', platform: 'ChatGPT',     brandMentioned: true,  officialUrlCited: false, competitorsCited: ['Semrush'] },
  { query: 'AI SEO工具', platform: 'Perplexity',  brandMentioned: false, officialUrlCited: false, competitorsCited: ['Ahrefs']  },
  { query: 'GEO 优化',   platform: 'ChatGPT',     brandMentioned: false, officialUrlCited: false, competitorsCited: []          },
];

test('renderReport — citation matrix rendered when citationEvidence provided', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, citationEvidence, context });
  assert.ok(report.includes('引用证据矩阵'), 'Should include citation matrix section');
  assert.ok(report.includes('ChatGPT'), 'Should include platform names');
  assert.ok(report.includes('AI SEO工具'), 'Should include query text');
});

test('renderReport — competitor citations listed when present', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, citationEvidence, context });
  assert.ok(report.includes('竞品被引用'), 'Should list competitor citations');
  assert.ok(report.includes('Semrush'), 'Should name competitor');
});

test('renderReport — presence plan search links shown when presence unknown', () => {
  const score = makeScore({});
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('第三方存在感验证'), 'Should include presence plan section');
  assert.ok(report.includes('知乎'), 'Should include Zhihu search link');
  assert.ok(report.includes('G2'), 'Should include G2 search link');
});

// ── i18n tests ───────────────────────────────────────────────────────────────

test('renderReport — lang:en produces English section headers', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context, lang: 'en' });
  assert.ok(report.includes('## GEO Audit Report'), 'English title');
  assert.ok(report.includes('### Overall Assessment'), 'English conclusion header');
  assert.ok(report.includes('### GEO Score'), 'English score header');
  assert.ok(report.includes('Technical accessibility'), 'English dimension name');
  assert.ok(!report.includes('### 总体结论'), 'No Chinese headers in English report');
});

test('renderReport — context.lang works as fallback for lang option', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context: { ...context, lang: 'en' } });
  assert.ok(report.includes('## GEO Audit Report'), 'English via context.lang');
});

test('renderReport — default remains Chinese', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('GEO 诊断报告'), 'Chinese title by default');
  assert.ok(report.includes('### 总体结论'), 'Chinese headers by default');
});

test('renderReport — English failure codes when lang:en', () => {
  const score = makeScore({});
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context, lang: 'en' });
  assert.ok(report.includes('P-ABSENCE'), 'Failure code present');
  assert.ok(report.includes('Third-party presence unknown'), 'English failure label');
  assert.ok(report.includes('- Cause:'), 'English cause label');
});

// ── Trend section tests ──────────────────────────────────────────────────────

test('renderReport — trend section shown when previousAudit provided', () => {
  const score = makeScore();
  const previousAudit = {
    date: '2026-06-01',
    total: Math.max(0, score.total - 10),
    totalMax: score.totalMax,
    dimensions: {
      structure: { raw: Math.max(0, score.dimensions.structure.raw - 5), max: 30 },
      authority: { raw: score.dimensions.authority.raw, max: 25 },
      presence:  { raw: score.dimensions.presence.raw, max: 25 },
      technical: { raw: score.dimensions.technical.raw, max: 20 },
    },
  };
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context, previousAudit });
  assert.ok(report.includes('得分趋势'), 'Trend section header present');
  assert.ok(report.includes('2026-06-01'), 'Previous audit date shown');
  assert.ok(report.includes('↑'), 'Improvement arrow shown');
});

test('renderReport — no trend section without previousAudit', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(!report.includes('得分趋势'), 'No trend section without history');
});

// ── Verdict badge tests ─────────────────────────────────────────────────────

function makeBlockedScore() {
  return computeGeoScore({
    robotsResult: blockedRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: null,
    presenceEvidence: {},
  });
}

test('renderReport — healthy site shows a non-block verdict badge', () => {
  const score = makeScore({ hasWikipedia: true, hasZhihu: true, reviewPlatformCount: 2, mediaMentionCount: 2, socialPlatformCount: 3 });
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('裁决'), 'Should include verdict header');
  assert.ok(!report.includes('被阻断'), 'Healthy site should not be blocked');
});

test('renderReport — blocked site shows 被阻断 badge, veto reason, and capped raw score', () => {
  const score = makeBlockedScore();
  const report = renderReport(score, { robotsResult: blockedRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('被阻断'), 'Should show blocked verdict');
  assert.ok(report.includes('V-ACCESS'), 'Should list the veto reason code');
  assert.ok(report.includes(String(score.rawTotal)), 'Should show the uncapped raw score');
});

test('renderReport — blocked verdict renders in English', () => {
  const score = makeBlockedScore();
  const report = renderReport(score, { robotsResult: blockedRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context, lang: 'en' });
  assert.ok(report.includes('Blocked'), 'Should show English blocked label');
  assert.ok(report.includes('Verdict'), 'Should show English verdict header');
});

test('report-strings — zh and en locales expose identical shapes', () => {
  const STRINGS = require('../tools/report-strings.js');
  function shapeOf(obj, path = '') {
    const keys = [];
    for (const k of Object.keys(obj).sort()) {
      const v = obj[k];
      const p = path ? `${path}.${k}` : k;
      keys.push(`${p}:${typeof v}`);
      if (v && typeof v === 'object' && !Array.isArray(v)) keys.push(...shapeOf(v, p));
    }
    return keys;
  }
  assert.deepEqual(shapeOf(STRINGS.zh), shapeOf(STRINGS.en), 'zh and en must have the same keys and value types');
});

// ── Action code blocks and FAQ wording ───────────────────────────────────────

const bareSchema = {
  headings: { h1Count: 1, h2Count: 0, h3Count: 0, hasProperHierarchy: false },
  schema: { found: [], missing: ['Organization', 'FAQPage'] },
  structure: { tables: 0, orderedLists: 0, unorderedLists: 0, detailsBlocks: 2, faqDetailsBlocks: 0, hasFaqClass: false, hasFaqSchema: false },
  authorDate: { hasAuthor: false, hasPublishDate: false, hasModifiedDate: false },
  meta: { title: 'Test', description: 'Test.', canonical: null },
  externalLinks: 0,
};

function renderWith(schemaResult, lang) {
  const score = computeGeoScore({ robotsResult: goodRobots, llmsResult: goodLlms, schemaResult, contentResult: null, presenceEvidence: {} });
  return renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult, contentResult: null, presenceEvidence: {}, context, lang });
}

test('renderReport — every action code block is closed', () => {
  for (const lang of ['zh', 'en']) {
    const report = renderWith(bareSchema, lang);
    assert.ok(report.includes('"@type": "Organization"'), 'canonical action should render');
    assert.ok(report.includes('"@type": "FAQPage"'), 'FAQ action should render');
    assert.ok(report.includes('"@type": "BlogPosting"'), 'BlogPosting action should render');
    const fences = report.split('\n').filter(l => l.startsWith('```')).length;
    assert.equal(fences % 2, 0, `${lang} report has an unclosed code block`);
  }
});

test('renderReport — FAQ action does not claim FAQ content when none was found', () => {
  const report = renderWith(bareSchema);
  assert.ok(report.includes('首页没有识别到 FAQ 区块'), 'should say no FAQ section was found');
  assert.ok(!report.includes('首页有 FAQ 内容'), 'should not claim FAQ content exists');
});

test('renderReport — FAQ action mentions existing FAQ section when one was found', () => {
  const report = renderWith({ ...bareSchema, structure: { ...bareSchema.structure, faqDetailsBlocks: 2 } });
  assert.ok(report.includes('首页有 FAQ 内容'), 'should note the existing FAQ section');
});

// ── Verdict / narrative must not contradict a weak dimension ────────────────

function makeShipWithWeakStructure() {
  const score = makeScore();
  // Passing total, strong tech/authority, but extractability in the red (like 11/30)
  score.verdict = 'ship';
  score.dimensions.structure.raw = 11;
  score.dimensions.technical.raw = 18;
  score.dimensions.authority.raw = 19;
  return score;
}

test('renderReport — ship verdict names a weak dimension instead of calling everything healthy', () => {
  const score = makeShipWithWeakStructure();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  const verdictLine = report.split('\n').find(l => l.includes('裁决'));
  assert.ok(verdictLine.includes('内容可摘取性偏弱'), `verdict should name the weak dimension, got: ${verdictLine}`);
  assert.ok(!report.includes('健全'), 'must not claim all signals are healthy');
});

test('renderReport — narrative points at extractability when only structure is weak', () => {
  const score = makeShipWithWeakStructure();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('主要短板是内容可摘取性'), 'narrative should point at extractability');
  assert.ok(!report.includes('主要瓶颈是第三方存在感'), 'narrative must not blame presence first');
});

test('renderReport — level labels describe readiness, not measured citations', () => {
  const STRINGS = require('../tools/report-strings.js');
  for (const lang of ['zh', 'en']) {
    for (const label of Object.values(STRINGS[lang].levelLabels)) {
      assert.ok(!/稳定被引用，|高频被引用|regularly cited,|high-frequency citation/.test(label), `${lang} label claims observed citations: ${label}`);
    }
  }
});

test('renderReport — wildcard-allowed crawlers render as ✅ with a label', () => {
  const robots = { ...goodRobots, crawlers: [{ name: 'GPTBot', result: 'wildcard-allowed', platform: 'ChatGPT' }] };
  const score = makeScore();
  const zh = renderReport(score, { robotsResult: robots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(/✅ GPTBot\s+通配符放行/.test(zh), 'zh should show ✅ 通配符放行');
  const en = renderReport(score, { robotsResult: robots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context, lang: 'en' });
  assert.ok(/✅ GPTBot\s+allowed via \*/.test(en), 'en should show ✅ allowed via *');
});

// ── Measured citations next to the score ────────────────────────────────────

const ev = (platform, n, mentioned, cited) => [...Array(n)].map((_, i) => ({
  query: `问题 ${i + 1}`, platform, brandMentioned: i < mentioned, officialUrlCited: i < cited, competitorsCited: [],
}));
const normalised = s => Math.round((s.total / s.totalMax) * 100);
const lowLlms = { 'llms.txt': { exists: false }, 'llms-full.txt': { exists: false } };

function lowScoreReport(citationEvidence) {
  const score = computeGeoScore({ robotsResult: goodRobots, llmsResult: lowLlms, schemaResult: bareSchema, contentResult: null, presenceEvidence: {} });
  assert.ok(normalised(score) <= 40, `fixture should score low, got ${normalised(score)}`);
  return renderReport(score, { robotsResult: goodRobots, llmsResult: lowLlms, schemaResult: bareSchema, contentResult: null, presenceEvidence: {}, citationEvidence, context });
}

test('renderReport — low score but one platform cites the site often: flags the mismatch', () => {
  // shaped like the Feishu test: ChatGPT cites 7/9, Doubao 3/9, DeepSeek names the brand but never cites
  const report = lowScoreReport([...ev('ChatGPT', 9, 9, 7), ...ev('豆包', 9, 7, 3), ...ev('DeepSeek', 9, 7, 0)]);
  const overview = report.slice(report.indexOf('### 总体结论'), report.indexOf('### GEO 得分'));
  assert.ok(overview.includes('**实测**：27 条测试里，品牌在正文被提到 23 条（85%），官网被引用 10 条（37%）'), overview);
  assert.ok(overview.includes('按平台看官网被引用：ChatGPT 7/9，豆包 3/9，DeepSeek 0/9'));
  assert.ok(overview.includes('ChatGPT 在 9 条测试里引用了官网 7 次，诊断分却偏低'));
  assert.ok(overview.includes('DeepSeek 常在正文提到品牌，却没有引用官网'));
  assert.ok(overview.includes('各平台差别很大'));
  assert.ok(!overview.includes('没有明显矛盾'));
});

test('renderReport — high score but the site is rarely cited: flags the opposite mismatch', () => {
  const score = makeScore();
  assert.ok(normalised(score) >= 61, `fixture should score high, got ${normalised(score)}`);
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, citationEvidence: ev('ChatGPT', 6, 1, 0), context });
  assert.ok(report.includes('诊断分达标，但实测里官网很少被引用'));
});

test('renderReport — measured results that agree with the score say so', () => {
  const report = lowScoreReport(ev('ChatGPT', 6, 1, 0));
  assert.ok(report.includes('实测和诊断分没有明显矛盾'));
  assert.ok(!report.includes('实测和诊断对不上'));
});

test('renderReport — small samples get a caveat, no evidence adds nothing', () => {
  assert.ok(lowScoreReport(ev('ChatGPT', 3, 3, 3)).includes('样本只有 3 条'));
  assert.ok(!lowScoreReport(undefined).includes('**实测**'));
});

test('renderReport — measured block renders in English', () => {
  const score = computeGeoScore({ robotsResult: goodRobots, llmsResult: lowLlms, schemaResult: bareSchema, contentResult: null, presenceEvidence: {} });
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: lowLlms, schemaResult: bareSchema, contentResult: null, presenceEvidence: {}, citationEvidence: ev('ChatGPT', 9, 9, 7), context, lang: 'en' });
  assert.ok(report.includes('**Measured**: across 9 tests'));
  assert.ok(report.includes('Measured results and the score disagree'));
});

test('renderCitationMatrix — cited but not named shows as cited-only, not absent', () => {
  const report = lowScoreReport([{ query: 'Q', platform: 'ChatGPT', brandMentioned: false, officialUrlCited: true, competitorsCited: [] }]);
  assert.ok(report.includes('| Q | 🔗 仅被引 |'));
});
