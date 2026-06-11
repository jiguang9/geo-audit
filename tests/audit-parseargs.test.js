'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseArgs } = require('../tools/audit.js');

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
