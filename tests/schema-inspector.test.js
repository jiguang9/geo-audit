'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { collectSchemaTypes } = require('../tools/schema-inspector.js');
const {
  extractJsonLd,
  extractMeta,
  extractHeadings,
  extractStructuralElements,
  extractAuthorDate,
  countExternalLinks,
} = require('../tools/shared/html.js');

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Test Page Title</title>
  <meta name="description" content="A test page description.">
  <link rel="canonical" href="https://example.com/test">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Test Article",
    "author": { "@type": "Person", "name": "Jane Doe" },
    "datePublished": "2025-01-01"
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  }
  </script>
</head>
<body>
  <h1>Main Title</h1>
  <h2>Section One</h2>
  <h3>Subsection</h3>
  <h2>Section Two</h2>
  <p>First paragraph with some content.</p>
  <p>Second paragraph with more content.</p>
  <table><tr><td>Cell</td></tr></table>
  <ul><li>Item 1</li><li>Item 2</li></ul>
  <ol><li>Step 1</li><li>Step 2</li></ol>
  <a href="https://external.com/page">External</a>
  <a href="https://another.org/page">Another</a>
  <a href="/internal">Internal</a>
  <span class="author">Jane Doe</span>
  <time datetime="2025-01-01">January 1, 2025</time>
</body>
</html>`;

test('extractJsonLd — parses two JSON-LD blocks', () => {
  const items = extractJsonLd(SAMPLE_HTML);
  assert.equal(items.length, 2);
  assert.equal(items[0]['@type'], 'Article');
  assert.equal(items[1]['@type'], 'FAQPage');
});

test('collectSchemaTypes — collects types from multiple blocks', () => {
  const items = extractJsonLd(SAMPLE_HTML);
  const types = collectSchemaTypes(items);
  assert.ok(types.includes('Article'));
  assert.ok(types.includes('FAQPage'));
});

test('collectSchemaTypes — handles @graph', () => {
  const items = [{ '@graph': [{ '@type': 'WebSite' }, { '@type': 'Organization' }] }];
  const types = collectSchemaTypes(items);
  assert.ok(types.includes('WebSite'));
  assert.ok(types.includes('Organization'));
});

test('extractMeta — extracts title, description, canonical', () => {
  const meta = extractMeta(SAMPLE_HTML);
  assert.equal(meta.title, 'Test Page Title');
  assert.equal(meta.description, 'A test page description.');
  assert.equal(meta.canonical, 'https://example.com/test');
});

test('extractHeadings — counts headings by level', () => {
  const h = extractHeadings(SAMPLE_HTML);
  assert.equal(h.h1.length, 1);
  assert.equal(h.h2.length, 2);
  assert.equal(h.h3.length, 1);
});

test('extractStructuralElements — detects tables, lists', () => {
  const s = extractStructuralElements(SAMPLE_HTML);
  assert.equal(s.tables, 1);
  assert.equal(s.unorderedLists, 1);
  assert.equal(s.orderedLists, 1);
  assert.equal(s.paragraphs, 2);
  assert.equal(s.hasFaqSchema, true);
});

test('extractAuthorDate — detects author and publish date', () => {
  const ad = extractAuthorDate(SAMPLE_HTML);
  assert.equal(ad.hasAuthor, true);
  assert.equal(ad.hasPublishDate, true);
});

test('countExternalLinks — counts unique external domains', () => {
  const count = countExternalLinks(SAMPLE_HTML, 'example.com');
  assert.equal(count, 2); // external.com and another.org
});

test('extractJsonLd — returns empty array for invalid JSON', () => {
  const html = `<script type="application/ld+json">{invalid json}</script>`;
  const items = extractJsonLd(html);
  assert.equal(items.length, 0);
});

test('extractMeta — returns nulls when tags absent', () => {
  const meta = extractMeta('<html><body>nothing</body></html>');
  assert.equal(meta.title, null);
  assert.equal(meta.description, null);
  assert.equal(meta.canonical, null);
});
