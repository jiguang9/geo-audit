'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildLlmsTxt, pageLabel, topicsFromHeadings } = require('../tools/llms-txt-generator.js');

// ── pageLabel ────────────────────────────────────────────────────────────────

test('pageLabel — derives title-cased label from slug', () => {
  assert.equal(pageLabel('https://example.com/blog/getting-started-guide'), 'Getting Started Guide');
});

test('pageLabel — strips .html extension', () => {
  assert.equal(pageLabel('https://example.com/about-us.html'), 'About Us');
});

test('pageLabel — root path returns Home', () => {
  assert.equal(pageLabel('https://example.com/'), 'Home');
});

test('pageLabel — CJK slug passes through without case transform', () => {
  assert.equal(pageLabel('https://example.com/docs/快速开始'), '快速开始');
});

// ── topicsFromHeadings ───────────────────────────────────────────────────────

test('topicsFromHeadings — collects h2/h3, dedupes, caps at 6', () => {
  const topics = topicsFromHeadings({
    h2: ['Pricing Plans', 'How It Works', 'Pricing Plans', 'FAQ'],
    h3: ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E'],
  });
  assert.ok(topics.length <= 6, 'Should cap at 6 topics');
  assert.ok(!topics.includes('FAQ'), 'Should skip boilerplate headings');
  assert.equal(topics.filter(t => t === 'Pricing Plans').length, 1, 'Should dedupe');
});

test('topicsFromHeadings — skips headings that are too short or too long', () => {
  const topics = topicsFromHeadings({
    h2: ['A', 'X'.repeat(80), 'Valid Topic Here'],
    h3: [],
  });
  assert.deepEqual(topics, ['Valid Topic Here']);
});

// ── buildLlmsTxt ─────────────────────────────────────────────────────────────

test('buildLlmsTxt — full data produces valid llms.txt structure', () => {
  const content = buildLlmsTxt({
    domain: 'example.com',
    origin: 'https://example.com',
    title: 'Example — AI Tools',
    description: 'Example provides AI-powered developer tools.',
    pages: [
      { label: 'About', url: 'https://example.com/about' },
      { label: 'Getting Started', url: 'https://example.com/blog/getting-started' },
    ],
    topics: ['AI Tooling', 'Developer Experience'],
  });
  assert.ok(/^# Example — AI Tools\n/.test(content), 'H1 uses page title');
  assert.ok(content.includes('> Example provides AI-powered developer tools.'), 'Blockquote uses meta description');
  assert.ok(content.includes('- [Home](https://example.com/)'), 'Home link present');
  assert.ok(content.includes('- [About](https://example.com/about)'), 'Page links present');
  assert.ok(content.includes('## Core topics'), 'Core topics section present');
  assert.ok(content.includes('- AI Tooling'), 'Topics listed');
  assert.ok(!content.includes('[TODO'), 'No TODO markers when all data available');
});

test('buildLlmsTxt — missing data falls back to domain and TODO markers', () => {
  const content = buildLlmsTxt({
    domain: 'example.com',
    origin: 'https://example.com',
    title: null,
    description: null,
    pages: [],
    topics: [],
  });
  assert.ok(/^# example\.com\n/.test(content), 'H1 falls back to domain');
  assert.ok(content.includes('[TODO'), 'TODO markers present for missing fields');
  assert.ok(content.includes('- [Home](https://example.com/)'), 'Home link always present');
});

test('buildLlmsTxt — llms.txt spec compliance: H1 first, blockquote second', () => {
  const content = buildLlmsTxt({
    domain: 'example.com', origin: 'https://example.com',
    title: 'T', description: 'D', pages: [], topics: [],
  });
  const lines = content.split('\n');
  assert.ok(lines[0].startsWith('# '), 'First line is H1');
  assert.ok(lines[2].startsWith('> '), 'Third line is blockquote description');
});
