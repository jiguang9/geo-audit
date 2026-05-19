#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { normalizeUrl, getHostname, isPublicUrl } = require('./shared/url.js');
const {
  extractJsonLd,
  extractMeta,
  extractHeadings,
  extractStructuralElements,
  extractAuthorDate,
  countExternalLinks,
} = require('./shared/html.js');

const RECOMMENDED_SCHEMAS = ['Article', 'FAQPage', 'HowTo', 'Product', 'Organization', 'BreadcrumbList', 'WebSite'];

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
  const schemaTypes = collectSchemaTypes(jsonLdItems);
  const missing = RECOMMENDED_SCHEMAS.filter(t => !schemaTypes.includes(t));

  const meta = extractMeta(html);
  const headings = extractHeadings(html);
  const structural = extractStructuralElements(html);
  const authorDate = extractAuthorDate(html);
  const externalLinks = countExternalLinks(html, hostname);

  return {
    url,
    httpStatus: res.status,
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
      jsonLdBlockCount: jsonLdItems.length,
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

    console.log('Meta');
    console.log(`  Title:       ${r.meta.title ? '✅ ' + r.meta.title.slice(0, 60) : '❌ missing'}`);
    console.log(`  Description: ${r.meta.description ? '✅' : '❌ missing'}`);
    console.log(`  Canonical:   ${r.meta.canonical ? '✅ ' + r.meta.canonical : '❌ missing'}`);

    console.log('\nHeadings');
    console.log(`  H1: ${r.headings.h1Count}  H2: ${r.headings.h2Count}  H3: ${r.headings.h3Count}  Hierarchy OK: ${r.headings.hasProperHierarchy ? '✅' : '⚠️'}`);

    console.log('\nSchema markup (JSON-LD)');
    console.log(`  Found:   ${r.schema.found.length ? r.schema.found.join(', ') : '— none'}`);
    console.log(`  Missing: ${r.schema.missing.join(', ')}`);

    console.log('\nContent structure');
    console.log(`  Tables: ${r.structure.tables}  OL: ${r.structure.orderedLists}  UL: ${r.structure.unorderedLists}  Details: ${r.structure.detailsBlocks}  Paragraphs: ${r.structure.paragraphs}`);
    console.log(`  FAQ class/id: ${r.structure.hasFaqClass ? '✅' : '—'}  FAQ schema: ${r.structure.hasFaqSchema ? '✅' : '—'}`);

    console.log('\nAuthor & dates');
    console.log(`  Author: ${r.authorDate.hasAuthor ? '✅' : '❌'}  Published: ${r.authorDate.hasPublishDate ? '✅' : '❌'}  Modified: ${r.authorDate.hasModifiedDate ? '✅' : '—'}`);

    console.log(`\nExternal links to unique domains: ${r.externalLinks}`);
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { inspectSchema, collectSchemaTypes };
