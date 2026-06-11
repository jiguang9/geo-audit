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
