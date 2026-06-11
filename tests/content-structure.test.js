'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { analyzeContentStructure } = require('../tools/content-structure.js');

const HTML_WITH_STEPS = `
<html><body>
<h1>How to Deploy</h1>
<h2>Prerequisites</h2>
<p>Before you begin, ensure you have Node installed.</p>
<ol>
  <li>Step 1: Install dependencies by running npm install.</li>
  <li>Step 2: Configure your environment variables.</li>
  <li>Step 3: Run the build command to compile assets.</li>
</ol>
</body></html>
`;

const HTML_WITH_STEPS_ZH = `
<html><body>
<h1>部署教程</h1>
<ol>
  <li>第一步：安装依赖</li>
  <li>第二步：配置环境变量</li>
  <li>第三步：运行构建命令</li>
</ol>
</body></html>
`;

const HTML_NO_STEPS = `
<html><body>
<h1>About Us</h1>
<ul>
  <li>Feature A</li>
  <li>Feature B</li>
  <li>Feature C</li>
</ul>
</body></html>
`;

const HTML_WITH_DEFINITIONS = `
<html><body>
<h1>GEO Guide</h1>
<p>GEO refers to Generative Engine Optimization, which is the practice of optimizing content for AI citation.</p>
<p>A citation is defined as when an AI system reproduces or references your content in its response.</p>
<p>Traditional SEO is the process of improving search engine rankings through various techniques.</p>
</body></html>
`;

const HTML_WITH_STATS = `
<html><body>
<h1>Industry Report</h1>
<p>According to our research, 78% of users prefer AI-cited answers over traditional search results.</p>
<p>The market grew by 340% in 2024, reaching 2.5 billion users worldwide.</p>
<p>This demonstrates significant growth in AI-powered search adoption.</p>
</body></html>
`;

const HTML_FIRST_SCREEN_DEF = `
<html><body>
<p>SEO refers to Search Engine Optimization, the practice of improving visibility in search engines.</p>
<p>Other content follows after the definition.</p>
</body></html>
`;

test('analyzeContentStructure — step blocks detected from <ol> items (English)', () => {
  const r = analyzeContentStructure(HTML_WITH_STEPS, 'https://example.com/guide');
  assert.equal(r.extractableBlocks.hasStepBlocks, true, 'Should detect step blocks');
});

test('analyzeContentStructure — step blocks detected from <ol> items (Chinese)', () => {
  const r = analyzeContentStructure(HTML_WITH_STEPS_ZH, 'https://example.com/guide-zh');
  assert.equal(r.extractableBlocks.hasStepBlocks, true, 'Should detect Chinese step blocks');
});

test('analyzeContentStructure — unordered list is NOT flagged as step blocks', () => {
  const r = analyzeContentStructure(HTML_NO_STEPS, 'https://example.com/about');
  assert.equal(r.extractableBlocks.hasStepBlocks, false, 'UL should not count as step blocks');
});

test('analyzeContentStructure — definition blocks detected', () => {
  const r = analyzeContentStructure(HTML_WITH_DEFINITIONS, 'https://example.com/guide');
  assert.equal(r.extractableBlocks.hasDefinitionBlocks, true);
});

test('analyzeContentStructure — statistical claims detected', () => {
  const r = analyzeContentStructure(HTML_WITH_STATS, 'https://example.com/report');
  assert.equal(r.extractableBlocks.hasStatistics, true);
});

test('analyzeContentStructure — first-screen definition detected', () => {
  const r = analyzeContentStructure(HTML_FIRST_SCREEN_DEF, 'https://example.com/seo');
  assert.equal(r.extractableBlocks.hasFirstScreenDefinition, true);
});

test('analyzeContentStructure — quotableBlocks contains definition sentences', () => {
  const r = analyzeContentStructure(HTML_WITH_DEFINITIONS, 'https://example.com/guide');
  assert.ok(Array.isArray(r.quotableBlocks), 'quotableBlocks should be an array');
  const defBlock = r.quotableBlocks.find(b => b.type === 'definition');
  assert.ok(defBlock, 'Should have at least one definition quotable block');
  assert.ok(defBlock.text.length > 0);
  assert.ok(defBlock.reason.length > 0);
});

test('analyzeContentStructure — quotableBlocks contains statistical sentences', () => {
  const r = analyzeContentStructure(HTML_WITH_STATS, 'https://example.com/report');
  const statBlock = r.quotableBlocks.find(b => b.type === 'statistic');
  assert.ok(statBlock, 'Should have at least one statistic quotable block');
});

test('analyzeContentStructure — missingBlocks lists absent types', () => {
  const r = analyzeContentStructure(HTML_NO_STEPS, 'https://example.com/about');
  assert.ok(Array.isArray(r.missingBlocks), 'missingBlocks should be an array');
  assert.ok(r.missingBlocks.includes('step'), 'step should be in missingBlocks for UL-only page');
  assert.ok(r.missingBlocks.includes('faq'), 'faq should be in missingBlocks for page without FAQ');
});

test('analyzeContentStructure — extractableBlockCount increments correctly', () => {
  const rich = analyzeContentStructure(HTML_WITH_DEFINITIONS, 'https://example.com/guide');
  const bare = analyzeContentStructure(HTML_NO_STEPS, 'https://example.com/about');
  assert.ok(rich.extractableBlocks.count > bare.extractableBlocks.count,
    'Rich definition page should score higher than bare list page');
});

test('analyzeContentStructure — returns url in result', () => {
  const r = analyzeContentStructure(HTML_WITH_STEPS, 'https://example.com/');
  assert.equal(r.url, 'https://example.com/');
});
