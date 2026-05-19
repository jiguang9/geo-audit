'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

// Test the field validation logic in isolation without network calls
function validateLlmsTxtFields(body) {
  return {
    hasTitle: /^# /m.test(body),
    hasDescription: /^> /m.test(body),
    hasSections: /^## /m.test(body),
    hasLinks: /^- \[/m.test(body),
  };
}

function isRequiredMet(fields) {
  return fields.hasTitle && fields.hasDescription;
}

test('llms.txt — valid complete file', () => {
  const body = `# My Site
> A description of what this site is about.

## Docs

- [Getting Started](https://example.com/docs/start): Introduction
- [API Reference](https://example.com/docs/api): Full API docs
`;
  const fields = validateLlmsTxtFields(body);
  assert.equal(fields.hasTitle, true);
  assert.equal(fields.hasDescription, true);
  assert.equal(fields.hasSections, true);
  assert.equal(fields.hasLinks, true);
  assert.equal(isRequiredMet(fields), true);
});

test('llms.txt — missing description', () => {
  const body = `# My Site

## Docs
- [Page](https://example.com): A page
`;
  const fields = validateLlmsTxtFields(body);
  assert.equal(fields.hasTitle, true);
  assert.equal(fields.hasDescription, false);
  assert.equal(isRequiredMet(fields), false);
});

test('llms.txt — missing title', () => {
  const body = `> A description without a title.

## Docs
`;
  const fields = validateLlmsTxtFields(body);
  assert.equal(fields.hasTitle, false);
  assert.equal(fields.hasDescription, true);
  assert.equal(isRequiredMet(fields), false);
});

test('llms.txt — empty file fails required fields', () => {
  const fields = validateLlmsTxtFields('');
  assert.equal(isRequiredMet(fields), false);
});

test('llms.txt — minimal valid file (title + description only)', () => {
  const body = `# Minimal Site
> Short description.
`;
  const fields = validateLlmsTxtFields(body);
  assert.equal(isRequiredMet(fields), true);
  assert.equal(fields.hasSections, false);
  assert.equal(fields.hasLinks, false);
});

test('llms.txt — Chinese content is valid', () => {
  const body = `# 我的网站
> 这是一个关于 AI 搜索优化的网站。

## 文档
- [开始使用](https://example.com/start): 入门指南
`;
  const fields = validateLlmsTxtFields(body);
  assert.equal(isRequiredMet(fields), true);
});
