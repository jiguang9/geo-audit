'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseCrawlerStatus } = require('../tools/robots-checker.js');

const ALLOW_ALL = `
User-agent: *
Allow: /
`;

const BLOCK_ALL = `
User-agent: *
Disallow: /
`;

const BLOCK_GPTBOT = `
User-agent: *
Allow: /

User-agent: GPTBot
Disallow: /
`;

const ALLOW_GPTBOT_EXPLICIT = `
User-agent: GPTBot
Allow: /
`;

const PARTIAL_BLOCK = `
User-agent: GPTBot
Disallow: /private/
Disallow: /admin/
Allow: /
`;

const MIXED = `
User-agent: Googlebot
Allow: /

User-agent: ClaudeBot
Disallow: /
`;

test('parseCrawlerStatus — allowed when * allows all and bot not mentioned', () => {
  assert.equal(parseCrawlerStatus(ALLOW_ALL, 'GPTBot'), 'not-mentioned');
});

test('parseCrawlerStatus — blocked when * blocks all and bot not mentioned (inherits global block)', () => {
  assert.equal(parseCrawlerStatus(BLOCK_ALL, 'GPTBot'), 'blocked');
});

test('parseCrawlerStatus — blocked when specific bot has Disallow: /', () => {
  assert.equal(parseCrawlerStatus(BLOCK_GPTBOT, 'GPTBot'), 'blocked');
});

test('parseCrawlerStatus — other bot not affected by GPTBot block', () => {
  assert.equal(parseCrawlerStatus(BLOCK_GPTBOT, 'ClaudeBot'), 'not-mentioned');
});

test('parseCrawlerStatus — allowed when explicitly allowed', () => {
  assert.equal(parseCrawlerStatus(ALLOW_GPTBOT_EXPLICIT, 'GPTBot'), 'allowed');
});

test('parseCrawlerStatus — allowed when only partial paths blocked', () => {
  assert.equal(parseCrawlerStatus(PARTIAL_BLOCK, 'GPTBot'), 'allowed');
});

test('parseCrawlerStatus — ClaudeBot blocked, Googlebot not mentioned', () => {
  assert.equal(parseCrawlerStatus(MIXED, 'ClaudeBot'), 'blocked');
  assert.equal(parseCrawlerStatus(MIXED, 'Bingbot'), 'not-mentioned');
});

test('parseCrawlerStatus — case-insensitive UA matching', () => {
  const txt = `
User-agent: gptbot
Disallow: /
`;
  assert.equal(parseCrawlerStatus(txt, 'GPTBot'), 'blocked');
});

test('parseCrawlerStatus — empty robots.txt returns not-mentioned', () => {
  assert.equal(parseCrawlerStatus('', 'GPTBot'), 'not-mentioned');
});

test('parseCrawlerStatus — comments are ignored', () => {
  const txt = `
# Block GPTBot
User-agent: GPTBot
# This disallows everything
Disallow: /
`;
  assert.equal(parseCrawlerStatus(txt, 'GPTBot'), 'blocked');
});
