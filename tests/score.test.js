'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeGeoScore, computeVetoes, scoreStructure, scoreAuthority, scorePresence, scoreTechnical } = require('../tools/score.js');

// Fixtures
const goodSchema = {
  headings: { h1Count: 1, h2Count: 3, h3Count: 2, hasProperHierarchy: true },
  schema: { found: ['Article', 'FAQPage', 'Organization'], missing: ['HowTo', 'Product', 'BreadcrumbList'] },
  structure: { tables: 2, orderedLists: 1, unorderedLists: 2, detailsBlocks: 0, hasFaqClass: false, hasFaqSchema: true },
  authorDate: { hasAuthor: true, hasPublishDate: true, hasModifiedDate: true },
  meta: { title: 'Test', description: 'Desc', canonical: 'https://example.com/test' },
  externalLinks: 8,
};

const bareSchema = {
  headings: { h1Count: 0, h2Count: 0, h3Count: 0, hasProperHierarchy: false },
  schema: { found: [], missing: ['Article', 'FAQPage', 'HowTo', 'Product', 'Organization', 'BreadcrumbList', 'WebSite'] },
  structure: { tables: 0, orderedLists: 0, unorderedLists: 0, detailsBlocks: 0, hasFaqClass: false, hasFaqSchema: false },
  authorDate: { hasAuthor: false, hasPublishDate: false, hasModifiedDate: false },
  meta: { title: null, description: null, canonical: null },
  externalLinks: 0,
};

const goodContent = {
  interpretation: { likelyExtractable: true, selfContainedParagraphs: true, richInQA: true },
  evidence: { questionCount: 5 },
};

const goodRobots = {
  accessible: true,
  httpStatus: 200,
  crawlers: [
    { name: 'GPTBot', result: 'allowed' },
    { name: 'ClaudeBot', result: 'allowed' },
    { name: 'PerplexityBot', result: 'allowed' },
    { name: 'Bytespider', result: 'not-mentioned' },
    { name: 'baiduspider', result: 'allowed' },
  ],
};

const blockedRobots = {
  accessible: true,
  httpStatus: 200,
  crawlers: [
    { name: 'GPTBot', result: 'blocked' },
    { name: 'ClaudeBot', result: 'blocked' },
    { name: 'PerplexityBot', result: 'blocked' },
  ],
};

// Like blockedRobots but with the citationRisk field the real robots-checker
// emits — a high-risk block is what triggers the V-ACCESS veto.
const vetoRobots = {
  accessible: true,
  httpStatus: 200,
  crawlers: [
    { name: 'GPTBot', result: 'blocked', citationRisk: 'high' },
    { name: 'ClaudeBot', result: 'blocked', citationRisk: 'high' },
    { name: 'PerplexityBot', result: 'blocked', citationRisk: 'high' },
  ],
};

const goodLlms = {
  'llms.txt': { exists: true, requiredMet: true, sizeBytes: 500, completeness: '4/4' },
  'llms-full.txt': { exists: true, requiredMet: true, sizeBytes: 2000, completeness: '4/4' },
};

// scoreStructure tests
test('scoreStructure — good schema scores high', () => {
  const s = scoreStructure(goodSchema, goodContent);
  assert.ok(s.raw >= 20, `Expected >= 20, got ${s.raw}`);
  assert.equal(s.max, 30);
});

test('scoreStructure — bare schema scores low', () => {
  const s = scoreStructure(bareSchema, null);
  assert.ok(s.raw <= 5, `Expected <= 5, got ${s.raw}`);
});

test('scoreStructure — null input returns skipped', () => {
  const s = scoreStructure(null, null);
  assert.equal(s.skipped, true);
  assert.equal(s.raw, 0);
});

// scoreAuthority tests
test('scoreAuthority — good schema scores well', () => {
  const s = scoreAuthority(goodSchema, {});
  assert.ok(s.raw >= 15, `Expected >= 15, got ${s.raw}`);
  assert.equal(s.max, 25);
});

test('scoreAuthority — bare schema scores zero', () => {
  const s = scoreAuthority(bareSchema, {});
  assert.equal(s.raw, 0);
});

test('scoreAuthority — original research adds points', () => {
  const s1 = scoreAuthority(goodSchema, {});
  const s2 = scoreAuthority(goodSchema, { hasOriginalResearch: true });
  assert.ok(s2.raw > s1.raw);
});

test('scoreAuthority — article page author/date used over homepage when provided', () => {
  // Homepage has no author/date, article page does
  const homepageOnly = scoreAuthority(bareSchema, {});
  const withArticle = scoreAuthority(bareSchema, {}, goodSchema);
  assert.ok(withArticle.raw > homepageOnly.raw, 'Article page should improve authority score');
  assert.equal(withArticle.articleChecked, true);
});

test('scoreAuthority — homepage org schema still counts when article provided', () => {
  // Homepage has Organization schema; article has author/date
  const articleWithAuthor = {
    ...bareSchema,
    authorDate: { hasAuthor: true, hasPublishDate: true, hasModifiedDate: true },
  };
  const s = scoreAuthority(goodSchema, {}, articleWithAuthor);
  assert.ok(s.breakdown.authorScore === 6, 'Author score from article page');
  assert.ok(s.breakdown.schemaAuthorityScore > 0, 'Org schema score from homepage');
});

// scorePresence tests
test('scorePresence — no evidence returns unknown', () => {
  const s = scorePresence({});
  assert.equal(s.raw, null);
  assert.equal(s.unknown, true);
});

test('scorePresence — full evidence scores high', () => {
  const evidence = {
    hasWikipedia: true,
    hasBaiduBaike: true,
    hasZhihu: true,
    reviewPlatformCount: 3,
    mediaMentionCount: 3,
    socialPlatformCount: 4,
  };
  const s = scorePresence(evidence);
  assert.ok(s.raw >= 20, `Expected >= 20, got ${s.raw}`);
  assert.equal(s.max, 25);
});

test('scorePresence — partial evidence scores proportionally', () => {
  const s = scorePresence({ hasWikipedia: true, reviewPlatformCount: 1 });
  assert.ok(s.raw > 0 && s.raw < 20);
});

// scoreTechnical tests
test('scoreTechnical — all allowed, llms present, good schema scores high', () => {
  const s = scoreTechnical(goodRobots, goodLlms, goodSchema);
  assert.ok(s.raw >= 15, `Expected >= 15, got ${s.raw}`);
  assert.equal(s.max, 20);
});

test('scoreTechnical — all crawlers blocked scores low on robots', () => {
  const s1 = scoreTechnical(goodRobots, null, null);
  const s2 = scoreTechnical(blockedRobots, null, null);
  assert.ok(s1.raw > s2.raw);
});

test('scoreTechnical — absent llms.txt does not penalise', () => {
  const withLlms = scoreTechnical(goodRobots, goodLlms, null);
  const noLlms = scoreTechnical(goodRobots, { 'llms.txt': { exists: false }, 'llms-full.txt': { exists: false } }, null);
  assert.ok(withLlms.raw >= noLlms.raw);
  assert.ok(noLlms.raw >= 0); // not negative
});

// computeGeoScore integration test
test('computeGeoScore — well-configured site scores level 4+', () => {
  const evidence = { hasWikipedia: true, hasZhihu: true, reviewPlatformCount: 2, mediaMentionCount: 2, socialPlatformCount: 3 };
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: evidence,
  });
  assert.ok(result.level >= 4, `Expected level >= 4, got ${result.level}`);
  assert.ok(result.total >= 60, `Expected total >= 60, got ${result.total}`);
});

test('computeGeoScore — bare site scores level 1 or 2', () => {
  const result = computeGeoScore({
    robotsResult: blockedRobots,
    llmsResult: { 'llms.txt': { exists: false }, 'llms-full.txt': { exists: false } },
    schemaResult: bareSchema,
    contentResult: null,
    presenceEvidence: {},
  });
  assert.ok(result.level <= 2, `Expected level <= 2, got ${result.level}`);
});

test('computeGeoScore — unknown presence is flagged', () => {
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: {},
  });
  assert.equal(result.presenceUnknown, true);
  assert.equal(result.dimensions.presence.raw, null);
});

test('computeGeoScore — totalMax is 75 when presence unknown', () => {
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: {},
  });
  assert.equal(result.totalMax, 75, 'Should use /75 denominator when presence unknown');
});

test('computeGeoScore — totalMax is 100 when presence known', () => {
  const evidence = { hasWikipedia: true, reviewPlatformCount: 1 };
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: evidence,
  });
  assert.equal(result.totalMax, 100, 'Should use /100 denominator when presence known');
});

// Veto gate + verdict tests
test('computeVetoes — high-risk blocked crawler triggers V-ACCESS', () => {
  const v = computeVetoes(vetoRobots, goodSchema);
  assert.equal(v.length, 1);
  assert.equal(v[0].code, 'V-ACCESS');
  assert.ok(v[0].blockedCrawlers.includes('GPTBot'));
});

test('computeVetoes — unreachable page triggers V-ACCESS', () => {
  const v = computeVetoes(goodRobots, { error: 'HTTP 500' });
  assert.equal(v.length, 1);
  assert.equal(v[0].code, 'V-ACCESS');
  assert.equal(v[0].pageUnreachable, true);
});

test('computeVetoes — healthy site has no vetoes', () => {
  assert.equal(computeVetoes(goodRobots, goodSchema).length, 0);
});

test('computeGeoScore — veto caps an otherwise strong page and blocks it', () => {
  const evidence = { hasWikipedia: true, hasZhihu: true, reviewPlatformCount: 2, mediaMentionCount: 2, socialPlatformCount: 3 };
  const result = computeGeoScore({
    robotsResult: vetoRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: evidence,
  });
  assert.equal(result.verdict, 'block');
  assert.ok(result.vetoes.some(v => v.code === 'V-ACCESS'));
  assert.equal(result.capped, true);
  assert.ok(result.rawTotal > result.total, 'raw score should exceed capped total');
  assert.ok(result.level <= 2, `veto should cap level at 2, got ${result.level}`);
  const normalised = Math.round((result.total / result.totalMax) * 100);
  assert.ok(normalised <= 40, `capped normalised should be <= 40, got ${normalised}`);
});

test('computeGeoScore — unreachable page yields block verdict', () => {
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: { error: 'HTTP 503' },
    contentResult: null,
    presenceEvidence: {},
  });
  assert.equal(result.verdict, 'block');
});

test('computeGeoScore — strong site with no veto ships', () => {
  const evidence = { hasWikipedia: true, hasZhihu: true, reviewPlatformCount: 2, mediaMentionCount: 2, socialPlatformCount: 3 };
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: evidence,
  });
  assert.equal(result.verdict, 'ship');
  assert.equal(result.capped, false);
  assert.equal(result.vetoes.length, 0);
});

test('computeGeoScore — reachable but weak site needs fixing', () => {
  const result = computeGeoScore({
    robotsResult: goodRobots,
    llmsResult: { 'llms.txt': { exists: false }, 'llms-full.txt': { exists: false } },
    schemaResult: bareSchema,
    contentResult: null,
    presenceEvidence: {},
  });
  assert.equal(result.verdict, 'fix');
  assert.equal(result.vetoes.length, 0);
});

test('computeGeoScore — veto cap respects the /75 presence-unknown denominator', () => {
  const result = computeGeoScore({
    robotsResult: vetoRobots,
    llmsResult: goodLlms,
    schemaResult: goodSchema,
    contentResult: goodContent,
    presenceEvidence: {},
  });
  assert.equal(result.totalMax, 75);
  const normalised = Math.round((result.total / result.totalMax) * 100);
  assert.ok(normalised <= 40, `capped normalised should be <= 40 even at /75, got ${normalised}`);
});
