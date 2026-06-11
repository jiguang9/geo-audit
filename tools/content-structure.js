#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { normalizeUrl, isPublicUrl } = require('./shared/url.js');
const { extractPlainText, extractStructuralElements, extractHeadings } = require('./shared/html.js');

const QUESTION_WORDS = /\b(what|how|why|when|where|who|which|is|are|can|does|do|will|should|was|were)\b/i;
const QUESTION_WORDS_ZH = /[一-龥](是什么|怎么|为什么|如何|哪些|什么是|怎样|有哪些)/;
const DEFINITION_PATTERN = /\b(is|refers to|means|defined as|is a|is an)\b/i;
const DEFINITION_PATTERN_ZH = /[一-龥](是指|即|指的是|是一种|是一个)/;
const STAT_PATTERN = /\d+(\.\d+)?%|\d[\d,]*\s*(万|百万|亿|billion|million|thousand)/i;
const SOURCE_PATTERN = /来源[：:]\s*|数据来自|Source:\s*|according to|cited from|引用自/i;
// Match step-prefixed list items (tested per-item, no ^ needed against full text)
const STEP_ITEM_RE = /(^|\s)(step\s*\d|第\s*[一二三四五六七八九十\d]+\s*步?|[一二三四五六七八九十]、|\d+\.\s)/i;

function extractOlItems(html) {
  const items = [];
  (html.match(/<ol\b[^>]*>[\s\S]*?<\/ol>/gi) || []).forEach(ol => {
    (ol.match(/<li\b[^>]*>([\s\S]*?)<\/li>/gi) || []).forEach(li => {
      items.push(li.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    });
  });
  return items;
}

function analyzeContentStructure(html, url) {
  const text = extractPlainText(html);
  const structural = extractStructuralElements(html);
  const headings = extractHeadings(html);

  // Sentence-level heuristics
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [];
  const questionCount = sentences.filter(s => QUESTION_WORDS.test(s) || QUESTION_WORDS_ZH.test(s)).length;
  const definitionCount = sentences.filter(s => DEFINITION_PATTERN.test(s) || DEFINITION_PATTERN_ZH.test(s)).length;
  const statCount = sentences.filter(s => STAT_PATTERN.test(s)).length;
  const sourceCount = sentences.filter(s => SOURCE_PATTERN.test(s)).length;

  // Paragraph-level heuristics (approximate via double linebreak or <p> tags)
  const paragraphCount = structural.paragraphs || 1;
  const wordCount = text.split(/\s+/).length;
  const avgWordsPerParagraph = Math.round(wordCount / paragraphCount);

  // Structural richness score (rough proxy for extractability)
  const structuralElements = structural.tables + structural.orderedLists + structural.unorderedLists + structural.detailsBlocks;
  const headingDepth = (headings.h1.length > 0 ? 1 : 0) + (headings.h2.length > 0 ? 1 : 0) + (headings.h3.length > 0 ? 1 : 0);

  // Extractable block detection
  const firstScreen = text.slice(0, 300);
  const hasFirstScreenDefinition = DEFINITION_PATTERN.test(firstScreen) || DEFINITION_PATTERN_ZH.test(firstScreen);

  // Step block: test per-item from <ol> in HTML, not full text (avoids ^ anchor false negatives)
  const olItems = extractOlItems(html);
  const hasStepBlocks = olItems.length >= 2 && olItems.some(item => STEP_ITEM_RE.test(item));

  const hasStatistics = statCount >= 2;
  const hasCitations = sourceCount >= 1;
  const hasDefinitionBlocks = definitionCount >= 2;

  // Quotable blocks: specific sentences AI is likely to cite
  const MAX_QUOTE = 200;
  const quotableBlocks = [];
  sentences.filter(s =>
    (DEFINITION_PATTERN.test(s) || DEFINITION_PATTERN_ZH.test(s)) &&
    s.trim().length >= 30 && s.trim().length <= MAX_QUOTE
  ).slice(0, 2).forEach(s => quotableBlocks.push({ type: 'definition', text: s.trim(), reason: '直接定义术语，AI 易截取' }));

  sentences.filter(s =>
    STAT_PATTERN.test(s) && s.trim().length >= 20 && s.trim().length <= MAX_QUOTE
  ).slice(0, 2).forEach(s => quotableBlocks.push({ type: 'statistic', text: s.trim(), reason: '含量化数据，增加引用可信度' }));

  for (let i = 0; i < sentences.length - 1 && quotableBlocks.filter(b => b.type === 'qa').length < 1; i++) {
    const q = sentences[i];
    const a = sentences[i + 1];
    if ((QUESTION_WORDS.test(q) || QUESTION_WORDS_ZH.test(q)) &&
        q.trim().length <= 100 && a && a.trim().length >= 20 && a.trim().length <= MAX_QUOTE) {
      quotableBlocks.push({ type: 'qa', text: `${q.trim()} ${a.trim()}`, reason: '问答对，符合 AI 偏好的引用格式' });
    }
  }

  const presentTypes = new Set(quotableBlocks.map(b => b.type));
  if (hasStepBlocks) presentTypes.add('step');
  if (hasCitations) presentTypes.add('citation');
  if (structural.hasFaqSchema || structural.hasFaqClass) presentTypes.add('faq');
  const missingBlocks = ['definition', 'statistic', 'step', 'citation', 'faq', 'qa'].filter(t => !presentTypes.has(t));

  const extractableBlockCount = [
    hasFirstScreenDefinition,
    hasStepBlocks,
    hasStatistics,
    hasCitations,
    hasDefinitionBlocks,
    structural.hasFaqSchema || structural.hasFaqClass,
  ].filter(Boolean).length;

  // Confidence: based on how many signals we have
  const signalCount = [
    sentences.length > 10,
    paragraphCount > 3,
    structuralElements > 0,
    headingDepth >= 2,
  ].filter(Boolean).length;

  const confidence = signalCount >= 3 ? 'medium' : 'low';

  return {
    url,
    heuristic: true,
    confidence,
    evidence: {
      sentenceCount: sentences.length,
      questionCount,
      definitionCount,
      statCount,
      sourceCount,
      paragraphCount,
      avgWordsPerParagraph,
      structuralElements,
      headingDepth,
      hasFaq: structural.hasFaqSchema || structural.hasFaqClass || structural.detailsBlocks > 0,
    },
    extractableBlocks: {
      hasFirstScreenDefinition,
      hasStepBlocks,
      hasStatistics,
      hasCitations,
      hasDefinitionBlocks,
      count: extractableBlockCount,
    },
    quotableBlocks,
    missingBlocks,
    interpretation: {
      likelyExtractable: extractableBlockCount >= 2 || structuralElements >= 2 || headingDepth >= 2 || structural.hasFaqSchema,
      selfContainedParagraphs: avgWordsPerParagraph >= 40 && avgWordsPerParagraph <= 200,
      richInQA: questionCount >= 3,
    },
  };
}

async function checkContentStructure(pageUrl) {
  if (!isPublicUrl(pageUrl)) {
    return { error: 'Non-public URL — skipping content structure check.' };
  }

  const url = normalizeUrl(pageUrl);
  let res;

  try {
    res = await fetchText(url);
  } catch (err) {
    return { url, error: err.message };
  }

  if (res.status !== 200) {
    return { url, httpStatus: res.status, error: `HTTP ${res.status}` };
  }

  return analyzeContentStructure(res.body, url);
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node content-structure.js <url>'); process.exit(1); }

  checkContentStructure(url).then(r => {
    if (r.error) { console.error('Error:', r.error); process.exit(1); }

    console.log(`\nContent Structure (heuristic, confidence: ${r.confidence}) — ${r.url}\n`);
    console.log('Evidence');
    console.log(`  Sentences: ${r.evidence.sentenceCount}  Questions: ${r.evidence.questionCount}  Definitions: ${r.evidence.definitionCount}  Stats: ${r.evidence.statCount}  Citations: ${r.evidence.sourceCount}`);
    console.log(`  Paragraphs: ${r.evidence.paragraphCount}  Avg words/para: ${r.evidence.avgWordsPerParagraph}`);
    console.log(`  Structural elements (tables+lists+details): ${r.evidence.structuralElements}  Heading depth: ${r.evidence.headingDepth}/3`);
    console.log(`  FAQ detected: ${r.evidence.hasFaq ? '✅' : '—'}`);
    if (r.extractableBlocks) {
      const eb = r.extractableBlocks;
      console.log('\nExtractable blocks (AI-citable content types)');
      console.log(`  First-screen definition:  ${eb.hasFirstScreenDefinition ? '✅' : '—'}`);
      console.log(`  Step-by-step blocks:      ${eb.hasStepBlocks ? '✅' : '—'}`);
      console.log(`  Statistical claims:       ${eb.hasStatistics ? '✅' : '—'}`);
      console.log(`  Source citations:         ${eb.hasCitations ? '✅' : '—'}`);
      console.log(`  Definition blocks:        ${eb.hasDefinitionBlocks ? '✅' : '—'}`);
      console.log(`  Score: ${eb.count}/6 block types`);
    }
    if (r.quotableBlocks && r.quotableBlocks.length > 0) {
      console.log('\nQuotable blocks (可供 AI 直接引用的片段)');
      r.quotableBlocks.slice(0, 5).forEach((b, i) => {
        console.log(`  ${i + 1}. [${b.type}] ${b.text.slice(0, 120)}${b.text.length > 120 ? '…' : ''}`);
        console.log(`     原因: ${b.reason}`);
      });
    }
    if (r.missingBlocks && r.missingBlocks.length > 0) {
      console.log(`\n缺失的可引用内容类型: ${r.missingBlocks.join(', ')}`);
    }
    console.log('\nInterpretation (heuristic — not semantically verified)');
    console.log(`  Likely extractable by AI:    ${r.interpretation.likelyExtractable ? '✅' : '⚠️'}`);
    console.log(`  Paragraph length optimal:    ${r.interpretation.selfContainedParagraphs ? '✅' : '⚠️'}`);
    console.log(`  Rich in Q&A content:         ${r.interpretation.richInQA ? '✅' : '—'}`);
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { checkContentStructure, analyzeContentStructure };
