'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCliArgs } = require('../tools/ci-check.js');

function args(...a) { return ['node', 'ci-check.js', ...a]; }

test('parseCliArgs — url and flags in any order', () => {
  const r = parseCliArgs(args('--min-score', '60', 'https://example.com', '--brand', 'Acme'));
  assert.equal(r.url, 'https://example.com');
  assert.equal(r.flags['min-score'], '60');
  assert.equal(r.flags.brand, 'Acme');
});

test('parseCliArgs — flag value not mistaken for url', () => {
  const r = parseCliArgs(args('--brand', 'Acme', 'https://example.com'));
  assert.equal(r.url, 'https://example.com');
});

test('parseCliArgs — no url returns undefined', () => {
  const r = parseCliArgs(args('--min-score', '50'));
  assert.equal(r.url, undefined);
});
