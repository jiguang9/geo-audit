'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs, pickArticleUrls, inspectArticleSamples } = require('../tools/audit.js');

// parseArgs receives process.argv, so we prepend two dummy entries (node + script)
function args(...a) { return ['node', 'audit.js', ...a]; }

test('parseArgs — URL first, flags after', () => {
  const r = parseArgs(args('https://example.com', '--brand', 'Acme', '--industry', 'SaaS'));
  assert.equal(r.url, 'https://example.com');
  assert.equal(r.namedFlags.brand, 'Acme');
  assert.equal(r.namedFlags.industry, 'SaaS');
});

test('parseArgs — URL last, flags before', () => {
  const r = parseArgs(args('--brand', 'Acme', '--market', 'China', 'https://example.com'));
  assert.equal(r.url, 'https://example.com', 'URL should be found even when it comes after flag values');
  assert.equal(r.namedFlags.brand, 'Acme');
  assert.equal(r.namedFlags.market, 'China');
});

test('parseArgs — URL surrounded by multiple flags', () => {
  const r = parseArgs(args('--brand', 'Acme', 'https://example.com', '--industry', 'B2B', '--json'));
  assert.equal(r.url, 'https://example.com', 'URL should be found between flags');
  assert.equal(r.namedFlags.brand, 'Acme');
  assert.equal(r.namedFlags.industry, 'B2B');
  assert.equal(r.format, 'json');
});

test('parseArgs — format defaults to markdown when --json absent', () => {
  const r = parseArgs(args('https://example.com'));
  assert.equal(r.format, 'markdown');
});

test('parseArgs — format is json when --json present', () => {
  const r = parseArgs(args('https://example.com', '--json'));
  assert.equal(r.format, 'json');
});

test('pickArticleUrls — uses the spread article sample from the sitemap', () => {
  const urls = pickArticleUrls({
    found: true,
    sampleUrls: ['https://example.com/about', 'https://example.com/news/b'],
    articleSampleUrls: ['https://example.com/news/a', 'https://example.com/news/b', 'https://example.com/news/c'],
  });
  assert.deepEqual(urls, ['https://example.com/news/a', 'https://example.com/news/b', 'https://example.com/news/c']);
});

test('pickArticleUrls — no sitemap, no articles; private URLs dropped', () => {
  assert.deepEqual(pickArticleUrls({ found: false }), []);
  assert.deepEqual(pickArticleUrls({ found: true, articleSampleUrls: ['http://localhost/blog/x'] }), []);
});

test('inspectArticleSamples — keeps a thrown fetch as an error entry', async () => {
  const samples = await inspectArticleSamples(['https://example.com/a', 'https://example.com/b'], async u => {
    if (u.endsWith('/b')) throw new Error('socket hang up');
    return { url: u, authorDate: { hasAuthor: true } };
  });
  assert.equal(samples.length, 2);
  assert.equal(samples[0].result.authorDate.hasAuthor, true);
  assert.deepEqual(samples[1], { url: 'https://example.com/b', result: { error: 'socket hang up' } });
});
