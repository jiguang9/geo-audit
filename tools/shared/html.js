'use strict';

function extractJsonLd(html) {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try { out.push(JSON.parse(m[1].trim())); } catch (_) {}
  }
  return out;
}

function extractMeta(html) {
  const title = (/<title[^>]*>([^<]*)<\/title>/i.exec(html) || [])[1]?.trim() || null;

  const descMatch =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html) ||
    /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i.exec(html);
  const description = descMatch ? descMatch[1].trim() : null;

  const canonMatch =
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i.exec(html) ||
    /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i.exec(html);
  const canonical = canonMatch ? canonMatch[1].trim() : null;

  return { title, description, canonical };
}

function extractHeadings(html) {
  // Strip nav, footer, aside to avoid counting platform chrome (menus, sidebars)
  const body = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  const result = { h1: [], h2: [], h3: [] };
  for (const level of [1, 2, 3]) {
    const re = new RegExp(`<h${level}[^>]*>([\\s\\S]*?)<\\/h${level}>`, 'gi');
    let m;
    while ((m = re.exec(body)) !== null) {
      result[`h${level}`].push(m[1].replace(/<[^>]+>/g, '').trim());
    }
  }
  return result;
}

function extractMicrodataTypes(html) {
  const types = new Set();
  const re = /itemtype=["']https?:\/\/schema\.org\/([^"'\s]+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    types.add(m[1]);
  }
  return [...types];
}

function extractStructuralElements(html) {
  const count = (re) => (html.match(re) || []).length;
  return {
    tables: count(/<table[\s\S]*?<\/table>/gi),
    orderedLists: count(/<ol[\s\S]*?<\/ol>/gi),
    unorderedLists: count(/<ul[\s\S]*?<\/ul>/gi),
    detailsBlocks: count(/<details[\s\S]*?<\/details>/gi),
    paragraphs: count(/<p[\s\S]*?<\/p>/gi),
    hasFaqClass: /class=["'][^"']*faq[^"']*["']|id=["'][^"']*faq[^"']*["']/i.test(html),
    hasFaqSchema: /"@type"\s*:\s*"FAQPage"/i.test(html),
  };
}

function extractAuthorDate(html) {
  return {
    hasAuthor:
      /<[^>]*(author|byline)[^>]*>/i.test(html) ||
      /"author"\s*:/.test(html) ||
      /rel=["']author["']/i.test(html),
    hasPublishDate:
      /<time[^>]*datetime/i.test(html) ||
      /"datePublished"\s*:/.test(html) ||
      /published[_-]?at|publish[_-]?date|post[_-]?date/i.test(html),
    hasModifiedDate:
      /"dateModified"\s*:/.test(html) ||
      /modified[_-]?at|updated[_-]?at|last[_-]?modified/i.test(html),
  };
}

function countExternalLinks(html, hostname) {
  const re = /href=["'](https?:\/\/([^/"'\s]+)[^"']*)/gi;
  const hosts = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    if (m[2] && m[2] !== hostname) hosts.add(m[2]);
  }
  return hosts.size;
}

function extractPlainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  extractJsonLd,
  extractMeta,
  extractHeadings,
  extractMicrodataTypes,
  extractStructuralElements,
  extractAuthorDate,
  countExternalLinks,
  extractPlainText,
};
