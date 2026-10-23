#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { normalizeUrl, isPublicUrl } = require('./shared/url.js');

async function getSitemapUrlsFromRobots(origin) {
  try {
    const res = await fetchText(origin + '/robots.txt', { timeout: 5000 });
    if (res.status !== 200) return [];
    return res.body.split(/\r?\n/)
      .map(l => { const m = /^Sitemap:\s*(.+)/i.exec(l.trim()); return m ? m[1].trim() : null; })
      .filter(Boolean);
  } catch (_) { return []; }
}

async function checkSitemap(baseUrl) {
  let origin;
  try { origin = new URL(normalizeUrl(baseUrl)).origin; } catch (_) { origin = baseUrl.replace(/\/$/, ''); }
  const robotsSitemaps = await getSitemapUrlsFromRobots(origin);
  const candidates = [...new Set([...robotsSitemaps, origin + '/sitemap.xml', origin + '/sitemap_index.xml'])];

  for (const candidate of candidates) {
    // candidates may be absolute URLs (from robots.txt) or relative paths
    const fetchUrl = /^https?:\/\//i.test(candidate) ? candidate : origin + candidate;
    let res;
    try {
      res = await fetchText(fetchUrl, { timeout: 8000 });
    } catch (_) {
      continue;
    }
    if (res.status !== 200) continue;
    const body = res.body || '';
    if (!body.includes('<loc>')) continue;
    const path = /^https?:\/\//i.test(candidate) ? candidate.replace(origin, '') || candidate : candidate;

    const locs = (body.match(/<loc>([^<]+)<\/loc>/g) || [])
      .map(m => m.replace(/<\/?loc>/g, '').trim());

    const subSitemaps = locs.filter(l => l.endsWith('.xml'));
    let pageUrls = locs.filter(l => !l.endsWith('.xml'));

    // Follow one level of sitemap index
    if (subSitemaps.length > 0 && pageUrls.length === 0) {
      for (const sub of subSitemaps.slice(0, 3)) {
        try {
          const subRes = await fetchText(sub, { timeout: 8000 });
          if (subRes.status === 200) {
            const subLocs = (subRes.body.match(/<loc>([^<]+)<\/loc>/g) || [])
              .map(m => m.replace(/<\/?loc>/g, '').trim())
              .filter(l => !l.endsWith('.xml'));
            pageUrls = pageUrls.concat(subLocs);
          }
        } catch (_) { /* skip */ }
      }
    }

    const lastmodMatches = body.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
    const lastmod = lastmodMatches.length
      ? lastmodMatches[lastmodMatches.length - 1].replace(/<\/?lastmod>/g, '').trim()
      : null;

    const blogUrls = pageUrls.filter(l => /\/blog\/|\/post\/|\/article\/|\/news\//.test(l));
    const toolUrls = pageUrls.filter(l => /\/tool|\/product|\/service/.test(l));
    const aboutUrls = pageUrls.filter(l => /\/about|\/team|\/contact/.test(l));

    const sampleUrls = [
      ...aboutUrls.slice(0, 1),
      ...toolUrls.slice(0, 1),
      ...blogUrls.length > 0 ? [blogUrls[Math.floor(blogUrls.length / 2)]] : [],
    ].slice(0, 3);

    return {
      found: true,
      path,
      totalUrls: pageUrls.length,
      blogCount: blogUrls.length,
      pageCount: pageUrls.length - blogUrls.length,
      lastmod,
      sampleUrls,
      categories: {
        about: aboutUrls.slice(0, 3),
        tools: toolUrls.slice(0, 5),
        blog: blogUrls.slice(0, 5),
      },
    };
  }

  return { found: false, error: 'No sitemap found at /sitemap.xml or /sitemap_index.xml' };
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: node tools/sitemap-checker.js <url> [--json]');
    process.exit(1);
  }
  const base = normalizeUrl(url);
  if (!isPublicUrl(base)) {
    console.error('URL must be publicly accessible');
    process.exit(1);
  }
  checkSitemap(base).then(r => {
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(r, null, 2));
      return;
    }
    if (!r.found) {
      console.log(`Sitemap  ❌ ${r.error}`);
      return;
    }
    console.log(`Sitemap  ✅ ${r.path}`);
    console.log(`  共 ${r.totalUrls} 个页面（${r.blogCount} 篇文章，${r.pageCount} 个普通页）`);
    if (r.lastmod) console.log(`  最近更新: ${r.lastmod}`);
    if (r.sampleUrls.length > 0) {
      console.log('  建议抽查页面:');
      r.sampleUrls.forEach(u => console.log(`    - ${u}`));
    }
  }).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = { checkSitemap };
