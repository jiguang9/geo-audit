#!/usr/bin/env node
'use strict';

/**
 * llms-txt-generator — generates a pre-filled llms.txt from live site data.
 *
 * Unlike the P0 template (placeholders), this tool fetches the homepage and
 * sitemap, then emits a ready-to-review llms.txt with real titles, description
 * and page links. Fields that cannot be derived are marked [TODO: ...].
 *
 * Network use: homepage (1) + robots.txt/sitemap.xml via checkSitemap (bounded).
 * No crawling beyond the sitemap index.
 *
 * Usage:
 *   node tools/llms-txt-generator.js <url>          # llms.txt content to stdout
 *   node tools/llms-txt-generator.js <url> --json   # {content, evidence} JSON
 */

const { fetchText } = require('./shared/fetch.js');
const { normalizeUrl, isPublicUrl, getHostname } = require('./shared/url.js');
const { extractMeta, extractHeadings } = require('./shared/html.js');
const { checkSitemap } = require('./sitemap-checker.js');

// Derive a human-readable label from a URL path segment
function pageLabel(u) {
  try {
    const segs = new URL(u).pathname.split('/').filter(Boolean);
    if (segs.length === 0) return 'Home';
    const last = decodeURIComponent(segs[segs.length - 1])
      .replace(/\.(html?|php|aspx?)$/i, '');
    // CJK slugs need no case transform
    if (/[一-鿿]/.test(last)) return last.replace(/[-_]+/g, ' ');
    return last
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch (_) {
    return u;
  }
}

// Filter homepage h2/h3 headings into usable topic strings
function topicsFromHeadings(headings) {
  const raw = [...(headings.h2 || []), ...(headings.h3 || [])];
  const seen = new Set();
  const topics = [];
  for (const h of raw) {
    const t = h.replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 60) continue;
    // Skip generic boilerplate headings
    if (/^(faq|contact|about|links?|menu|footer|登录|注册|联系我们|关于我们)$/i.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    topics.push(t);
    if (topics.length >= 6) break;
  }
  return topics;
}

// Pure formatter — testable without network
function buildLlmsTxt({ domain, origin, title, description, pages = [], topics = [] }) {
  const lines = [];
  lines.push(`# ${title || domain}`);
  lines.push('');
  lines.push(`> ${description || '[TODO: one-line description of the site and its audience / 一句话描述网站定位与目标受众]'}`);
  lines.push('');
  lines.push('## Key pages');
  lines.push('');
  lines.push(`- [Home](${origin}/)`);
  for (const p of pages) {
    lines.push(`- [${p.label}](${p.url})`);
  }
  lines.push('');
  lines.push('## Core topics');
  lines.push('');
  if (topics.length > 0) {
    for (const t of topics) lines.push(`- ${t}`);
  } else {
    lines.push('- [TODO: core topic 1 / 核心主题 1]');
    lines.push('- [TODO: core topic 2 / 核心主题 2]');
  }
  return lines.join('\n') + '\n';
}

async function generateLlmsTxt(siteUrl) {
  const url = normalizeUrl(siteUrl);
  if (!isPublicUrl(url)) {
    return { error: 'Non-public URL — localhost, private IPs, and internal domains are not supported.' };
  }
  const origin = new URL(url).origin;
  const domain = getHostname(url);

  // Homepage: title, description, topic headings
  let title = null, description = null, topics = [];
  try {
    const res = await fetchText(origin + '/');
    if (res.status === 200) {
      const meta = extractMeta(res.body);
      title = meta.title;
      description = meta.description;
      topics = topicsFromHeadings(extractHeadings(res.body));
    }
  } catch (_) { /* homepage unreachable — fall back to placeholders */ }

  // Sitemap: categorized key pages
  const pages = [];
  let sitemapFound = false;
  try {
    const sm = await checkSitemap(url);
    if (sm.found) {
      sitemapFound = true;
      const cats = sm.categories || {};
      for (const u of (cats.about || []).slice(0, 2)) pages.push({ label: pageLabel(u), url: u });
      for (const u of (cats.tools || []).slice(0, 3)) pages.push({ label: pageLabel(u), url: u });
      for (const u of (cats.blog || []).slice(0, 3)) pages.push({ label: pageLabel(u), url: u });
    }
  } catch (_) { /* no sitemap — Key pages will only contain Home */ }

  const content = buildLlmsTxt({ domain, origin, title, description, pages, topics });

  return {
    content,
    evidence: {
      titleSource: title ? 'homepage <title>' : 'domain fallback',
      descriptionSource: description ? 'homepage meta description' : 'TODO placeholder',
      pageCount: pages.length + 1,
      topicCount: topics.length,
      sitemapFound,
    },
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const url = args.find(a => !a.startsWith('--'));
  if (!url) {
    console.error('Usage: node tools/llms-txt-generator.js <url> [--json]');
    process.exit(1);
  }

  generateLlmsTxt(url).then(r => {
    if (r.error) { console.error('Error:', r.error); process.exit(1); }

    if (args.includes('--json')) {
      console.log(JSON.stringify(r, null, 2));
      return;
    }

    // Content to stdout (redirectable: > llms.txt); notes to stderr
    process.stdout.write(r.content);
    const e = r.evidence;
    process.stderr.write([
      '',
      `— Generated from: title=${e.titleSource}, description=${e.descriptionSource}, ` +
      `${e.pageCount} pages, ${e.topicCount} topics${e.sitemapFound ? '' : ' (no sitemap found)'}`,
      e.descriptionSource === 'TODO placeholder' || e.topicCount === 0
        ? '— Review [TODO] fields before publishing to /llms.txt'
        : '— Review content, then publish to /llms.txt at your domain root',
      '',
    ].join('\n'));
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { generateLlmsTxt, buildLlmsTxt, pageLabel, topicsFromHeadings };
