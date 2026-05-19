#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { normalizeUrl, isPublicUrl } = require('./shared/url.js');
const { extractPlainText, extractStructuralElements, extractHeadings } = require('./shared/html.js');

const QUESTION_WORDS = /\b(what|how|why|when|where|who|which|is|are|can|does|do|will|should|was|were)\b/i;
const QUESTION_WORDS_ZH = /[一-龥](是什么|怎么|为什么|如何|哪些|什么是|怎样|有哪些)/;
const DEFINITION_PATTERN = /\b(is|refers to|means|defined as|is a|is an)\b/i;
const DEFINITION_PATTERN_ZH = /[一-龥](是指|即|指的是|是一种|是一个)/;

function analyzeContentStructure(html, url) {
  const text = extractPlainText(html);
  const structural = extractStructuralElements(html);
  const headings = extractHeadings(html);

  // Sentence-level heuristics
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]+/g) || [];
  const questionCount = sentences.filter(s => QUESTION_WORDS.test(s) || QUESTION_WORDS_ZH.test(s)).length;
  const definitionCount = sentences.filter(s => DEFINITION_PATTERN.test(s) || DEFINITION_PATTERN_ZH.test(s)).length;

  // Paragraph-level heuristics (approximate via double linebreak or <p> tags)
  const paragraphCount = structural.paragraphs || 1;
  const avgWordsPerParagraph = Math.round(text.split(/\s+/).length / paragraphCount);

  // Structural richness score (rough proxy for extractability)
  const structuralElements = structural.tables + structural.orderedLists + structural.unorderedLists + structural.detailsBlocks;
  const headingDepth = (headings.h1.length > 0 ? 1 : 0) + (headings.h2.length > 0 ? 1 : 0) + (headings.h3.length > 0 ? 1 : 0);

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
      paragraphCount,
      avgWordsPerParagraph,
      structuralElements,
      headingDepth,
      hasFaq: structural.hasFaqSchema || structural.hasFaqClass || structural.detailsBlocks > 0,
    },
    interpretation: {
      likelyExtractable: structuralElements >= 2 || headingDepth >= 2 || structural.hasFaqSchema,
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
    console.log(`  Sentences: ${r.evidence.sentenceCount}  Questions: ${r.evidence.questionCount}  Definitions: ${r.evidence.definitionCount}`);
    console.log(`  Paragraphs: ${r.evidence.paragraphCount}  Avg words/para: ${r.evidence.avgWordsPerParagraph}`);
    console.log(`  Structural elements (tables+lists+details): ${r.evidence.structuralElements}  Heading depth: ${r.evidence.headingDepth}/3`);
    console.log(`  FAQ detected: ${r.evidence.hasFaq ? '✅' : '—'}`);
    console.log('\nInterpretation (heuristic — not semantically verified)');
    console.log(`  Likely extractable by AI:    ${r.interpretation.likelyExtractable ? '✅' : '⚠️'}`);
    console.log(`  Paragraph length optimal:    ${r.interpretation.selfContainedParagraphs ? '✅' : '⚠️'}`);
    console.log(`  Rich in Q&A content:         ${r.interpretation.richInQA ? '✅' : '—'}`);
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { checkContentStructure, analyzeContentStructure };
