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

// Multi-UA group: consecutive User-agent lines share the same rules
const MULTI_UA_BLOCK = `
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: PerplexityBot
Disallow: /
`;

const MULTI_UA_ALLOW = `
User-agent: GPTBot
User-agent: ClaudeBot
Allow: /
`;

const MULTI_UA_MIXED = `
User-agent: GPTBot
User-agent: ClaudeBot
Disallow: /

User-agent: Googlebot
Allow: /
`;

test('parseCrawlerStatus — multi-UA group: all bots in group are blocked', () => {
  assert.equal(parseCrawlerStatus(MULTI_UA_BLOCK, 'GPTBot'),       'blocked');
  assert.equal(parseCrawlerStatus(MULTI_UA_BLOCK, 'ClaudeBot'),    'blocked');
  assert.equal(parseCrawlerStatus(MULTI_UA_BLOCK, 'PerplexityBot'),'blocked');
});

test('parseCrawlerStatus — multi-UA group: bot not in group is not-mentioned', () => {
  assert.equal(parseCrawlerStatus(MULTI_UA_BLOCK, 'Bingbot'), 'not-mentioned');
});

test('parseCrawlerStatus — multi-UA group: all bots in group are allowed', () => {
  assert.equal(parseCrawlerStatus(MULTI_UA_ALLOW, 'GPTBot'),    'allowed');
  assert.equal(parseCrawlerStatus(MULTI_UA_ALLOW, 'ClaudeBot'), 'allowed');
});

test('parseCrawlerStatus — multi-UA group: second block does not bleed into first', () => {
  assert.equal(parseCrawlerStatus(MULTI_UA_MIXED, 'GPTBot'),    'blocked');
  assert.equal(parseCrawlerStatus(MULTI_UA_MIXED, 'ClaudeBot'), 'blocked');
  assert.equal(parseCrawlerStatus(MULTI_UA_MIXED, 'Googlebot'), 'allowed');
});

// Wildcard and longer-match tests
const WILDCARD_JSON = `
User-agent: GPTBot
Disallow: /*.json$
`;

const ALLOW_OVERRIDE = `
User-agent: GPTBot
Disallow: /private/
Allow: /private/public/
`;

const LONGER_DISALLOW = `
User-agent: GPTBot
Allow: /
Disallow: /blog/
`;

test('parseCrawlerStatus — wildcard disallow does not block homepage', () => {
  assert.equal(parseCrawlerStatus(WILDCARD_JSON, 'GPTBot', '/'), 'allowed');
});

test('parseCrawlerStatus — wildcard disallow blocks matching path', () => {
  assert.equal(parseCrawlerStatus(WILDCARD_JSON, 'GPTBot', '/data.json'), 'blocked');
});

test('parseCrawlerStatus — longer Allow overrides shorter Disallow', () => {
  assert.equal(parseCrawlerStatus(ALLOW_OVERRIDE, 'GPTBot', '/private/public/page'), 'allowed');
});

test('parseCrawlerStatus — longer Disallow overrides shorter Allow for root', () => {
  assert.equal(parseCrawlerStatus(LONGER_DISALLOW, 'GPTBot', '/blog/post-1'), 'blocked');
});

test('parseCrawlerStatus — homepage still accessible when only blog is disallowed', () => {
  assert.equal(parseCrawlerStatus(LONGER_DISALLOW, 'GPTBot', '/'), 'allowed');
});

// Deep-path targetPath tests: verifies that targetPath is actually used
const DEEP_BLOCK = `
User-agent: GPTBot
Disallow: /private/
Allow: /
`;

test('parseCrawlerStatus — deep path blocked when Disallow covers it', () => {
  assert.equal(parseCrawlerStatus(DEEP_BLOCK, 'GPTBot', '/private/secret'), 'blocked');
});

test('parseCrawlerStatus — root allowed even when deep path blocked', () => {
  assert.equal(parseCrawlerStatus(DEEP_BLOCK, 'GPTBot', '/public/page'), 'allowed');
});

test('parseCrawlerStatus — homepage allowed when only /private/ blocked', () => {
  assert.equal(parseCrawlerStatus(DEEP_BLOCK, 'GPTBot', '/'), 'allowed');
});
