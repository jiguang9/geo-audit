'use strict';

/**
 * Pure scoring function. Accepts tool outputs, returns a structured score object.
 * Does not perform I/O or rendering.
 *
 * GEO Score dimensions:
 *   Structure extractability  30 pts
 *   Authority / credibility   25 pts
 *   Third-party presence      25 pts  (evidence-based; null if unknown)
 *   Technical accessibility   20 pts
 *   Total                    100 pts
 */

function scoreStructure(schemaResult, contentResult) {
  if (!schemaResult || schemaResult.error) return { raw: 0, max: 30, breakdown: {}, skipped: true };

  const h = schemaResult.headings || {};
  const s = schemaResult.structure || {};
  const cs = contentResult && !contentResult.error ? contentResult : null;

  // H1-H3 hierarchy (0-8)
  let headingScore = 0;
  if (h.h1Count === 1) headingScore += 4;
  if (h.h2Count >= 2) headingScore += 2;
  if (h.h3Count >= 1) headingScore += 2;

  // FAQ / Q&A (0-8)
  let faqScore = 0;
  if (s.hasFaqSchema) faqScore += 8;
  else if (s.hasFaqClass || s.detailsBlocks > 0) faqScore += 4;
  else if (cs && cs.evidence && cs.evidence.questionCount >= 3) faqScore += 2;

  // Tables & lists (0-6)
  const listScore = Math.min(6, (s.tables || 0) * 2 + (s.orderedLists || 0) + (s.unorderedLists || 0));

  // Paragraph independence heuristic (0-5, low confidence)
  let paraScore = 0;
  if (cs && cs.interpretation) {
    if (cs.interpretation.selfContainedParagraphs) paraScore += 3;
    if (cs.interpretation.richInQA) paraScore += 2;
  }

  // Canonical present (0-3)
  const canonicalScore = schemaResult.meta && schemaResult.meta.canonical ? 3 : 0;

  const raw = Math.min(30, headingScore + faqScore + listScore + paraScore + canonicalScore);
  return {
    raw,
    max: 30,
    confidence: 'medium',
    breakdown: { headingScore, faqScore, listScore, paraScore, canonicalScore },
  };
}

function scoreAuthority(schemaResult, presenceEvidence, articleSchemaResult) {
  if (!schemaResult || schemaResult.error) return { raw: 0, max: 25, breakdown: {}, skipped: true };

  // Homepage signals: org schema, external links (representative of the brand)
  const s = schemaResult.schema || {};
  const extLinks = schemaResult.externalLinks || 0;
  const citationScore = extLinks >= 10 ? 8 : extLinks >= 5 ? 5 : extLinks >= 2 ? 3 : 0;

  // Schema authority signals (0-5): prefer homepage for org/brand schemas
  const authoritySchemas = ['Article', 'Organization', 'WebSite'];
  const schemaAuthorityScore = Math.min(5, s.found ? s.found.filter(t => authoritySchemas.includes(t)).length * 2 : 0);

  // Article-level signals: author and date are meaningful on article/blog pages,
  // not on marketing homepages. Use articleSchemaResult when available.
  const adSource = (articleSchemaResult && !articleSchemaResult.error)
    ? articleSchemaResult
    : schemaResult;
  const ad = adSource.authorDate || {};

  // Author attribution (0-6)
  const authorScore = ad.hasAuthor ? 6 : 0;

  // Freshness (0-6)
  let freshnessScore = 0;
  if (ad.hasPublishDate) freshnessScore += 3;
  if (ad.hasModifiedDate) freshnessScore += 3;

  // Original research / statistics from presence evidence (0-5, user-provided)
  const researchScore = presenceEvidence && presenceEvidence.hasOriginalResearch ? 5 : 0;

  const raw = Math.min(25, citationScore + authorScore + freshnessScore + schemaAuthorityScore + researchScore);
  return {
    raw,
    max: 25,
    confidence: articleSchemaResult && !articleSchemaResult.error ? 'medium' : 'low',
    articleChecked: !!(articleSchemaResult && !articleSchemaResult.error),
    breakdown: { citationScore, authorScore, freshnessScore, schemaAuthorityScore, researchScore },
  };
}

function scorePresence(presenceEvidence) {
  // If no evidence provided, return null (unknown) — do not penalise
  if (!presenceEvidence || Object.keys(presenceEvidence).length === 0) {
    return { raw: null, max: 25, unknown: true, confidence: 'unknown' };
  }

  const e = presenceEvidence;

  // Wikipedia / Baidu Baike / Zhihu (0-8)
  let encyclopediaScore = 0;
  if (e.hasWikipedia) encyclopediaScore += 4;
  if (e.hasBaiduBaike) encyclopediaScore += 2;
  if (e.hasZhihu) encyclopediaScore += 2;

  // Review / comparison platforms (0-7): G2, Capterra, Trustpilot, 36kr, etc.
  const reviewScore = Math.min(7, (e.reviewPlatformCount || 0) * 2);

  // Media mentions (0-6)
  const mediaScore = Math.min(6, (e.mediaMentionCount || 0) * 2);

  // Social / brand entity coverage (0-4)
  const socialScore = Math.min(4, e.socialPlatformCount || 0);

  const raw = Math.min(25, encyclopediaScore + reviewScore + mediaScore + socialScore);
  return {
    raw,
    max: 25,
    confidence: 'low',
    breakdown: { encyclopediaScore, reviewScore, mediaScore, socialScore },
  };
}

function scoreTechnical(robotsResult, llmsResult, schemaResult) {
  let raw = 0;

  // robots.txt AI crawler access (0-8)
  if (robotsResult && !robotsResult.error && robotsResult.crawlers) {
    const total = robotsResult.crawlers.length;
    const blocked = robotsResult.crawlers.filter(c => c.result === 'blocked').length;
    const allowed = robotsResult.crawlers.filter(c => c.result === 'allowed').length;
    if (blocked === 0) raw += 8;
    else if (blocked <= 2) raw += 5;
    else raw += Math.max(0, 8 - blocked * 2);
  }

  // llms.txt (0-4, bonus — not penalty for absence)
  if (llmsResult && !llmsResult.error) {
    const main = llmsResult['llms.txt'];
    const full = llmsResult['llms-full.txt'];
    if (main && main.exists && main.requiredMet) raw += 3;
    else if (main && main.exists) raw += 1;
    if (full && full.exists) raw += 1;
  }

  // JSON-LD Schema present (0-5)
  if (schemaResult && !schemaResult.error && schemaResult.schema) {
    const count = schemaResult.schema.found.length;
    raw += Math.min(5, count * 2);
  }

  // Meta completeness: title + description + canonical (0-3)
  if (schemaResult && !schemaResult.error && schemaResult.meta) {
    const m = schemaResult.meta;
    if (m.title) raw += 1;
    if (m.description) raw += 1;
    if (m.canonical) raw += 1;
  }

  return { raw: Math.min(20, raw), max: 20, confidence: 'high' };
}

// Hard veto conditions: signals that mean AI systems cannot currently fetch or
// cite the page, regardless of how good the on-page structure/authority is.
// A veto caps the overall score and forces a `block` verdict.
function computeVetoes(robotsResult, schemaResult) {
  const vetoes = [];

  // V-ACCESS: AI/search crawlers are blocked, or the page is unreachable.
  const blockedCrawlers = (robotsResult && robotsResult.crawlers)
    ? robotsResult.crawlers.filter(c => c.citationRisk === 'high')
    : [];
  const pageUnreachable = !!(schemaResult && schemaResult.error);
  if (blockedCrawlers.length > 0 || pageUnreachable) {
    vetoes.push({
      code: 'V-ACCESS',
      dimension: 'technical',
      blockedCrawlers: blockedCrawlers.map(c => c.name),
      pageUnreachable,
    });
  }

  return vetoes;
}

function computeGeoScore({ robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence, articleSchemaResult }) {
  const structure = scoreStructure(schemaResult, contentResult);
  const authority = scoreAuthority(schemaResult, presenceEvidence, articleSchemaResult);
  const presence = scorePresence(presenceEvidence);
  const technical = scoreTechnical(robotsResult, llmsResult, schemaResult);

  const presenceKnown = presence.raw !== null;
  const knownTotal = structure.raw + authority.raw + technical.raw;

  const rawTotal = presenceKnown ? knownTotal + presence.raw : knownTotal;
  // When presence is unknown, denominator is 75 (only assessed dimensions).
  // Consumers must use totalMax (not a hardcoded 100) when displaying the score.
  const totalMax = presenceKnown ? 100 : 75;

  // Hard veto: if AI cannot fetch/cite the page, cap the score so the level
  // cannot exceed 2 (normalised ≤ 40), no matter how strong other dimensions are.
  const vetoes = computeVetoes(robotsResult, schemaResult);
  const CAP_NORMALISED = 40;
  let total = rawTotal;
  if (vetoes.length > 0) {
    const cappedTotal = Math.floor((CAP_NORMALISED / 100) * totalMax);
    total = Math.min(rawTotal, cappedTotal);
  }

  // Compute level on a normalised 0-100 scale so thresholds stay consistent.
  const normalised = Math.round((total / totalMax) * 100);
  const level = normalised <= 20 ? 1 : normalised <= 40 ? 2 : normalised <= 60 ? 3 : normalised <= 80 ? 4 : 5;

  // Overall verdict — a top-line gate answering "can AI cite this right now?".
  //   block: a hard veto is active (crawlers blocked / page unreachable)
  //   ship:  no veto, healthy score (level ≥ 4) and technical baseline met
  //   fix:   everything else — reachable but needs work before it gets cited
  let verdict;
  if (vetoes.length > 0) verdict = 'block';
  else if (normalised >= 61 && technical.raw >= 8) verdict = 'ship';
  else verdict = 'fix';

  // Overall confidence: minimum of the four non-unknown dimensions ('high' > 'medium' > 'low')
  const confidenceRank = { high: 3, medium: 2, low: 1 };
  const dimConfidences = [structure.confidence, authority.confidence, technical.confidence];
  if (presence.confidence && presence.confidence !== 'unknown') dimConfidences.push(presence.confidence);
  const minRank = dimConfidences.reduce((min, c) => Math.min(min, confidenceRank[c] || 1), 3);
  const confidence = minRank === 3 ? 'high' : minRank === 2 ? 'medium' : 'low';

  return {
    total,
    totalMax,
    rawTotal,
    capped: total < rawTotal,
    verdict,
    vetoes,
    presenceUnknown: !presenceKnown,
    level,
    confidence,
    dimensions: { structure, authority, presence, technical },
  };
}

module.exports = { computeGeoScore, computeVetoes, scoreStructure, scoreAuthority, scorePresence, scoreTechnical };
