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
    breakdown: { headingScore, faqScore, listScore, paraScore, canonicalScore },
  };
}

function scoreAuthority(schemaResult, presenceEvidence) {
  if (!schemaResult || schemaResult.error) return { raw: 0, max: 25, breakdown: {}, skipped: true };

  const s = schemaResult.schema || {};
  const ad = schemaResult.authorDate || {};

  // External citations (0-8): more unique external domains = more credible
  const extLinks = schemaResult.externalLinks || 0;
  const citationScore = extLinks >= 10 ? 8 : extLinks >= 5 ? 5 : extLinks >= 2 ? 3 : 0;

  // Author attribution (0-6)
  const authorScore = ad.hasAuthor ? 6 : 0;

  // Freshness (0-6)
  let freshnessScore = 0;
  if (ad.hasPublishDate) freshnessScore += 3;
  if (ad.hasModifiedDate) freshnessScore += 3;

  // Schema authority signals (0-5): Article, Organization signal credibility
  const authoritySchemas = ['Article', 'Organization', 'WebSite'];
  const schemaAuthorityScore = Math.min(5, s.found ? s.found.filter(t => authoritySchemas.includes(t)).length * 2 : 0);

  // Original research / statistics from presence evidence (0-5, user-provided)
  const researchScore = presenceEvidence && presenceEvidence.hasOriginalResearch ? 5 : 0;

  const raw = Math.min(25, citationScore + authorScore + freshnessScore + schemaAuthorityScore + researchScore);
  return {
    raw,
    max: 25,
    breakdown: { citationScore, authorScore, freshnessScore, schemaAuthorityScore, researchScore },
  };
}

function scorePresence(presenceEvidence) {
  // If no evidence provided, return null (unknown) — do not penalise
  if (!presenceEvidence || Object.keys(presenceEvidence).length === 0) {
    return { raw: null, max: 25, unknown: true };
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

  return { raw: Math.min(20, raw), max: 20 };
}

function computeGeoScore({ robotsResult, llmsResult, schemaResult, contentResult, presenceEvidence }) {
  const structure = scoreStructure(schemaResult, contentResult);
  const authority = scoreAuthority(schemaResult, presenceEvidence);
  const presence = scorePresence(presenceEvidence);
  const technical = scoreTechnical(robotsResult, llmsResult, schemaResult);

  // If presence is unknown, compute total over 75 and scale, or report separately
  const presenceKnown = presence.raw !== null;
  const knownTotal = structure.raw + authority.raw + technical.raw;
  const knownMax = 75;

  let total, totalMax;
  if (presenceKnown) {
    total = knownTotal + presence.raw;
    totalMax = 100;
  } else {
    // Scale known dimensions to 100 for display
    total = Math.round((knownTotal / knownMax) * 75); // out of 75, presence unknown
    totalMax = 75;
  }

  const level = total <= 15 ? 1 : total <= 30 ? 2 : total <= 50 ? 3 : total <= 65 ? 4 : 5;

  return {
    total,
    totalMax,
    presenceUnknown: !presenceKnown,
    level,
    dimensions: { structure, authority, presence, technical },
  };
}

module.exports = { computeGeoScore, scoreStructure, scoreAuthority, scorePresence, scoreTechnical };
