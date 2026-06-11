#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { normalizeUrl, getHostname, isPublicUrl } = require('./shared/url.js');
const {
  extractJsonLd,
  extractMeta,
  extractHeadings,
  extractMicrodataTypes,
  extractStructuralElements,
  extractAuthorDate,
  countExternalLinks,
} = require('./shared/html.js');

const RECOMMENDED_BY_TYPE = {
  homepage:   ['Organization', 'WebSite'],
  article:    ['Article', 'BreadcrumbList'],
  product:    ['Product', 'AggregateRating'],
  about:      ['Person', 'Organization'],
  faq:        ['FAQPage'],
  comparison: ['ItemList', 'FAQPage'],
  pricing:    ['Product'],
  general:    ['WebPage'],
};

// Attribute-level checks: which properties are expected per schema type
const REQUIRED_ATTRS = {
  Organization:        ['name', 'url', 'description', 'sameAs', 'logo'],
  WebSite:             ['name', 'url'],
  Article:             ['headline', 'author', 'datePublished', 'publisher'],
  BlogPosting:         ['headline', 'author', 'datePublished', 'dateModified', 'publisher'],
  NewsArticle:         ['headline', 'author', 'datePublished', 'publisher'],
  Product:             ['name', 'description', 'offers'],
  WebApplication:      ['name', 'description', 'offers', 'applicationCategory'],
  SoftwareApplication: ['name', 'description', 'offers', 'applicationCategory'],
  FAQPage:             ['mainEntity'],
  Person:              ['name', 'jobTitle', 'sameAs'],
};

function checkSchemaAttributes(jsonLdItems) {
  const missingProperties = [];
  const seen = new Set();

  function checkItem(item) {
    const types = [].concat(item['@type'] || []);
    for (const type of types) {
      const required = REQUIRED_ATTRS[type];
      if (!required) continue;
      for (const prop of required) {
        const key = `${type}.${prop}`;
        if (!item[prop] && !seen.has(key)) {
          seen.add(key);
          missingProperties.push({ type, property: prop });
        }
      }
    }
  }

  for (const item of jsonLdItems) {
    checkItem(item);
    if (item['@graph']) {
      for (const node of item['@graph']) checkItem(node);
    }
  }

  return missingProperties;
}

function detectPageType(urlStr, schemaFound) {
  let pathname = '/';
  try { pathname = new URL(urlStr).pathname.toLowerCase(); } catch (_) {}

  // Schema-first detection
  const sf = schemaFound || [];
  if (sf.includes('BlogPosting') || sf.includes('Article') || sf.includes('NewsArticle')) return 'article';
  if (sf.includes('Product') || sf.includes('WebApplication') || sf.includes('SoftwareApplication')) return 'product';
  if (sf.includes('FAQPage')) return 'faq';
  if (sf.includes('ItemList') && sf.includes('Product')) return 'comparison';

  // URL pattern fallback
  if (pathname === '/' || pathname === '') return 'homepage';
  if (/\/blog\/|\/post\/|\/article\/|\/news\//.test(pathname)) return 'article';
  if (/\/about|\/team|\/company/.test(pathname)) return 'about';
  if (/\/product|\/tool|\/app|\/service/.test(pathname)) return 'product';
  if (/\/faq|\/help/.test(pathname)) return 'faq';
  if (/\/vs-|\/compare|\/alternative/.test(pathname)) return 'comparison';
  if (/\/pricing/.test(pathname)) return 'pricing';
  return 'general';
}

function collectSchemaTypes(jsonLdItems) {
  const types = new Set();
  for (const item of jsonLdItems) {
    if (item['@type']) {
      const t = item['@type'];
      (Array.isArray(t) ? t : [t]).forEach(x => types.add(x));
    }
    if (item['@graph']) {
      for (const node of item['@graph']) {
        if (node['@type']) {
          const t = node['@type'];
          (Array.isArray(t) ? t : [t]).forEach(x => types.add(x));
        }
      }
    }
  }
  return [...types];
}

async function inspectSchema(pageUrl) {
  if (!isPublicUrl(pageUrl)) {
    return { error: 'Non-public URL — skipping schema inspection.' };
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

  const html = res.body;
  const hostname = getHostname(url);

  const jsonLdItems = extractJsonLd(html);
  const jsonLdTypes = collectSchemaTypes(jsonLdItems);
  const microdataTypes = extractMicrodataTypes(html);
  // Merge both sources; track origin for reporting
  const schemaTypes = [...new Set([...jsonLdTypes, ...microdataTypes])];

  const pageType = detectPageType(url, schemaTypes);
  const recommendedForType = RECOMMENDED_BY_TYPE[pageType] || RECOMMENDED_BY_TYPE.general;
  const missing = recommendedForType.filter(t => !schemaTypes.includes(t));
  const missingProperties = checkSchemaAttributes(jsonLdItems);

  const meta = extractMeta(html);
  const headings = extractHeadings(html);
  const structural = extractStructuralElements(html);
  const authorDate = extractAuthorDate(html);
  const externalLinks = countExternalLinks(html, hostname);

  return {
    url,
    httpStatus: res.status,
    pageType,
    meta,
    headings: {
      h1Count: headings.h1.length,
      h2Count: headings.h2.length,
      h3Count: headings.h3.length,
      hasProperHierarchy: headings.h1.length === 1 && headings.h2.length > 0,
    },
    schema: {
      found: schemaTypes,
      missing,
      missingProperties,
      jsonLdBlockCount: jsonLdItems.length,
      microdataTypes,
    },
    structure: structural,
    authorDate,
    externalLinks,
  };
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node schema-inspector.js <url>'); process.exit(1); }

  inspectSchema(url).then(r => {
    if (r.error) { console.error('Error:', r.error); process.exit(1); }

    console.log(`\nSchema Inspection — ${r.url}\n`);
    console.log(`Page type: ${r.pageType}`);

    console.log('\nMeta');
    console.log(`  Title:       ${r.meta.title ? '✅ ' + r.meta.title.slice(0, 60) : '❌ missing'}`);
    console.log(`  Description: ${r.meta.description ? '✅' : '❌ missing'}`);
    console.log(`  Canonical:   ${r.meta.canonical ? '✅ ' + r.meta.canonical : '❌ missing'}`);

    console.log('\nHeadings');
    console.log(`  H1: ${r.headings.h1Count}  H2: ${r.headings.h2Count}  H3: ${r.headings.h3Count}  Hierarchy OK: ${r.headings.hasProperHierarchy ? '✅' : '⚠️'}`);

    const mdNote = r.schema.microdataTypes.length ? ` (microdata: ${r.schema.microdataTypes.join(', ')})` : '';
    console.log('\nSchema markup (JSON-LD + microdata)');
    console.log(`  Found:   ${r.schema.found.length ? r.schema.found.join(', ') + mdNote : '— none'}`);
    console.log(`  Missing: ${r.schema.missing.join(', ')}`);
    if (r.schema.missingProperties && r.schema.missingProperties.length > 0) {
      console.log(`  Missing properties:`);
      r.schema.missingProperties.forEach(mp => console.log(`    ❌ ${mp.type}.${mp.property}`));
    }

    console.log('\nContent structure');
    console.log(`  Tables: ${r.structure.tables}  OL: ${r.structure.orderedLists}  UL: ${r.structure.unorderedLists}  Details: ${r.structure.detailsBlocks}  Paragraphs: ${r.structure.paragraphs}`);
    console.log(`  FAQ class/id: ${r.structure.hasFaqClass ? '✅' : '—'}  FAQ schema: ${r.structure.hasFaqSchema ? '✅' : '—'}`);

    console.log('\nAuthor & dates');
    console.log(`  Author: ${r.authorDate.hasAuthor ? '✅' : '❌'}  Published: ${r.authorDate.hasPublishDate ? '✅' : '❌'}  Modified: ${r.authorDate.hasModifiedDate ? '✅' : '—'}`);

    console.log(`\nExternal links to unique domains: ${r.externalLinks}`);
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { inspectSchema, collectSchemaTypes, detectPageType };
