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

test('renderReport — contains GEO Score heading', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('GEO Score'), 'Should contain GEO Score');
});

test('renderReport — contains all 4 dimension rows', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('Structure extractability'));
  assert.ok(report.includes('Authority'));
  assert.ok(report.includes('Third-party presence'));
  assert.ok(report.includes('Technical accessibility'));
});

test('renderReport — unknown presence dimension is flagged', () => {
  const score = makeScore({});
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('unknown'), 'Should flag unknown presence');
});

test('renderReport — contains priority action list', () => {
  const score = makeScore();
  const report = renderReport(score, { robotsResult: goodRobots, llmsResult: goodLlms, schemaResult: goodSchema, contentResult: null, presenceEvidence: {}, context });
  assert.ok(report.includes('Priority Action List'), 'Should have action list');
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
