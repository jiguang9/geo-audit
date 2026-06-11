#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { joinPath, isPublicUrl, normalizeUrl } = require('./shared/url.js');

const AI_CRAWLERS = [
  { name: 'GPTBot',             platform: 'ChatGPT',                   confidence: 'confirmed', role: 'training'  },
  { name: 'OAI-SearchBot',      platform: 'ChatGPT Search',             confidence: 'confirmed', role: 'search'    },
  { name: 'ClaudeBot',          platform: 'Claude (Anthropic)',          confidence: 'confirmed', role: 'general'   },
  { name: 'anthropic-ai',       platform: 'Claude (alternate UA)',       confidence: 'confirmed', role: 'general'   },
  { name: 'PerplexityBot',      platform: 'Perplexity',                 confidence: 'confirmed', role: 'search'    },
  { name: 'Bytespider',         platform: 'Doubao / ByteDance (豆包)',   confidence: 'confirmed', role: 'indexing'  },
  { name: 'baiduspider',        platform: 'ERNIE Bot / Baidu (文心一言)', confidence: 'confirmed', role: 'indexing'  },
  { name: 'Googlebot',          platform: 'Google AI Overviews',        confidence: 'confirmed', role: 'search'    },
  { name: 'Bingbot',            platform: 'Copilot / Bing AI',          confidence: 'confirmed', role: 'search'    },
  { name: 'meta-externalagent', platform: 'Meta AI',                    confidence: 'likely',    role: 'general'   },
];

function escapeForRegex(str) {
  // Escape regex special chars except * and $
  return str.replace(/[.+?^{}()|[\]\\]/g, '\\$&');
}

function buildPathRegex(rulePattern) {
  const endsWithDollar = rulePattern.endsWith('$');
  const pattern = endsWithDollar ? rulePattern.slice(0, -1) : rulePattern;
  const parts = pattern.split('*').map(escapeForRegex);
  const joined = parts.join('.*');
  return new RegExp('^' + joined + (endsWithDollar ? '$' : ''));
}

function pathMatches(rulePattern, urlPath) {
  if (!rulePattern) return false;
  try {
    const re = buildPathRegex(rulePattern);
    return re.test(urlPath);
  } catch (_) {
    return false;
  }
}

// Returns: 'allowed' | 'blocked' | 'not-mentioned' | 'unknown'
function parseCrawlerStatus(robotsTxt, crawlerName, targetPath = '/') {
  const target = crawlerName.toLowerCase();
  const lines = robotsTxt.split(/\r?\n/).map(l => l.split('#')[0].trim()).filter(Boolean);

  let currentAgents = [];
  let inRuleSection = false;

  // Each rule: { type: 'allow'|'disallow', path }
  const specificRules = [];
  const globalRules = [];
  let foundSpecific = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim().toLowerCase();
      // A new User-agent line after rules = new block; reset accumulator
      if (inRuleSection) {
        currentAgents = [];
        inRuleSection = false;
      }
      currentAgents.push(agent);
      if (agent === target) foundSpecific = true;
      continue;
    }

    if (lower.startsWith('disallow:') || lower.startsWith('allow:')) {
      inRuleSection = true;
      const isAllow = lower.startsWith('allow:');
      const path = line.slice(line.indexOf(':') + 1).trim();
      const type = isAllow ? 'allow' : 'disallow';

      if (currentAgents.includes(target)) {
        specificRules.push({ type, path });
      }
      if (currentAgents.includes('*')) {
        globalRules.push({ type, path });
      }
    }
  }

  // Find best matching rule using longest-match (path length minus wildcards * and $)
  function findBestRule(rules) {
    let bestRule = null;
    let bestLen = -1;

    for (const rule of rules) {
      if (!pathMatches(rule.path, targetPath)) continue;
      const len = rule.path.replace(/[*$]/g, '').length;
      if (len > bestLen) {
        bestLen = len;
        bestRule = rule;
      } else if (len === bestLen && bestRule && rule.type === 'allow') {
        // Tie → Allow wins
        bestRule = rule;
      }
    }
    return bestRule;
  }

  if (foundSpecific) {
    const best = findBestRule(specificRules);
    if (!best) return 'allowed';
    if (best.type === 'disallow' && best.path !== '') return 'blocked';
    return 'allowed';
  }

  // No specific rules — inherit global (*) rules
  const best = findBestRule(globalRules);
  if (!best) return 'not-mentioned';
  if (best.type === 'disallow' && best.path !== '') return 'blocked';
  return 'not-mentioned';
}

async function checkRobots(siteUrl) {
  if (!isPublicUrl(siteUrl)) {
    return { error: 'Non-public URL — localhost, private IPs, and internal domains are not checked.' };
  }

  const robotsUrl = joinPath(siteUrl, '/robots.txt');
  let res;

  try {
    res = await fetchText(robotsUrl);
  } catch (err) {
    return {
      url: robotsUrl,
      accessible: false,
      error: err.message,
      crawlers: AI_CRAWLERS.map(c => ({ ...c, result: 'unknown', citationRisk: 'none' })),
      sitemapUrls: [],
    };
  }

  if (res.status !== 200) {
    return {
      url: robotsUrl,
      accessible: false,
      httpStatus: res.status,
      crawlers: AI_CRAWLERS.map(c => ({ ...c, result: 'unknown', citationRisk: 'none' })),
      sitemapUrls: [],
    };
  }

  // Parse Sitemap: directives
  const sitemapUrls = res.body.split(/\r?\n/)
    .map(l => { const m = /^Sitemap:\s*(.+)/i.exec(l.trim()); return m ? m[1].trim() : null; })
    .filter(Boolean);

  let targetPath = '/';
  try { targetPath = new URL(normalizeUrl(siteUrl)).pathname || '/'; } catch (_) {}

  const crawlers = AI_CRAWLERS.map(c => {
    const result = parseCrawlerStatus(res.body, c.name, targetPath);

    let citationRisk;
    if (result === 'blocked' && ['search', 'indexing', 'general'].includes(c.role)) {
      citationRisk = 'high';
    } else if (result === 'blocked' && c.role === 'training') {
      citationRisk = 'medium';
    } else if (result === 'not-mentioned' && ['search', 'indexing'].includes(c.role)) {
      citationRisk = 'low';
    } else {
      citationRisk = 'none';
    }

    return { ...c, result, citationRisk };
  });

  return {
    url: robotsUrl,
    accessible: true,
    httpStatus: 200,
    crawlers,
    sitemapUrls,
  };
}

if (require.main === module) {
  const url = process.argv[2];
  if (!url) { console.error('Usage: node robots-checker.js <url>'); process.exit(1); }

  checkRobots(url).then(r => {
    if (r.error) { console.error('Error:', r.error); process.exit(1); }
    console.log(`\nrobots.txt — ${r.url}`);
    console.log(`Status: ${r.accessible ? `HTTP ${r.httpStatus}` : 'Not accessible'}\n`);
    const icon = { allowed: '✅', blocked: '❌', 'not-mentioned': '⚠️', unknown: '❓' };
    const riskIcon = { high: '🔴', medium: '🟡', low: '🔵', none: '⬜' };
    console.log(`${'Crawler'.padEnd(22)} ${'Role'.padEnd(10)} ${'Result'.padEnd(15)} ${'Risk'.padEnd(8)} Platform`);
    console.log('─'.repeat(80));
    for (const c of r.crawlers) {
      console.log(`${icon[c.result] || '❓'} ${c.name.padEnd(20)} ${c.role.padEnd(10)} ${c.result.padEnd(15)} ${riskIcon[c.citationRisk] || '⬜'} ${c.citationRisk.padEnd(7)} ${c.platform}`);
    }
    if (r.sitemapUrls.length > 0) {
      console.log('\nSitemaps from robots.txt:');
      r.sitemapUrls.forEach(u => console.log(`  - ${u}`));
    }
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { checkRobots, parseCrawlerStatus, AI_CRAWLERS };
