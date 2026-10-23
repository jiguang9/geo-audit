'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { checkSitemap, pickSpread } = require('../tools/sitemap-checker.js');

const urlset = locs => `<urlset>${locs.map(l => `<url><loc>${l}</loc></url>`).join('')}</urlset>`;
const index = locs => `<sitemapindex>${locs.map(l => `<sitemap><loc>${l}</loc></sitemap>`).join('')}</sitemapindex>`;

// Fake fetch: routes maps URL → body string, or an Error to throw, or a status number
function fakeFetch(routes) {
  return async url => {
    const r = routes[url];
    if (r === undefined) return { status: 404, body: '' };
    if (r instanceof Error) throw r;
    if (typeof r === 'number') return { status: r, body: '' };
    return { status: 200, body: r };
  };
}

const articles = n => Array.from({ length: n }, (_, i) => `https://example.com/article/${i}`);

test('pickSpread — returns the whole list when it is short', () => {
  assert.deepEqual(pickSpread(['a', 'b'], 3), ['a', 'b']);
  assert.deepEqual(pickSpread([], 3), []);
});

test('pickSpread — spreads picks across start, middle and end', () => {
  const list = Array.from({ length: 12 }, (_, i) => i);
  assert.deepEqual(pickSpread(list, 3), [2, 6, 10]);
});

test('checkSitemap — samples 3 articles spread across the list', async () => {
  const r = await checkSitemap('https://example.com', {
    fetch: fakeFetch({ 'https://example.com/sitemap.xml': urlset(articles(30)) }),
  });
  assert.equal(r.found, true);
  assert.equal(r.articleSampleUrls.length, 3);
  assert.equal(new Set(r.articleSampleUrls).size, 3);
  assert.deepEqual(r.articleSampleUrls, [
    'https://example.com/article/5',
    'https://example.com/article/15',
    'https://example.com/article/25',
  ]);
  assert.equal(r.subSitemaps, null, 'plain urlset has no child sitemaps');
});

test('checkSitemap — records child sitemaps that time out or return an error status', async () => {
  const r = await checkSitemap('https://example.com', {
    fetch: fakeFetch({
      'https://example.com/sitemap.xml': index([
        'https://example.com/a.xml',
        'https://example.com/b.xml',
        'https://example.com/c.xml',
        'https://example.com/d.xml',
      ]),
      'https://example.com/a.xml': urlset(articles(4)),
      'https://example.com/b.xml': 503,
      'https://example.com/c.xml': new Error('Timeout fetching: https://example.com/c.xml'),
    }),
  });
  assert.equal(r.found, true);
  assert.equal(r.totalUrls, 4);
  assert.deepEqual(r.subSitemaps, {
    total: 4,
    tried: 3,
    read: 1,
    failed: [
      { url: 'https://example.com/b.xml', reason: 'HTTP 503' },
      { url: 'https://example.com/c.xml', reason: 'timeout' },
    ],
  });
});

test('checkSitemap — no failures recorded when every child sitemap loads', async () => {
  const r = await checkSitemap('https://example.com', {
    fetch: fakeFetch({
      'https://example.com/sitemap.xml': index(['https://example.com/a.xml']),
      'https://example.com/a.xml': urlset(articles(2)),
    }),
  });
  assert.deepEqual(r.subSitemaps, { total: 1, tried: 1, read: 1, failed: [] });
  assert.equal(r.articleSampleUrls.length, 2);
});

test('checkSitemap — retries a child sitemap once after a network error', async () => {
  let calls = 0;
  const base = fakeFetch({
    'https://example.com/sitemap.xml': index(['https://example.com/a.xml']),
    'https://example.com/a.xml': urlset(articles(3)),
  });
  const fetch = async (url, opts) => {
    if (url === 'https://example.com/a.xml' && calls++ === 0) throw new Error('socket hang up');
    return base(url, opts);
  };
  const r = await checkSitemap('https://example.com', { fetch });
  assert.equal(calls, 2);
  assert.deepEqual(r.subSitemaps.failed, []);
  assert.equal(r.totalUrls, 3);
});
