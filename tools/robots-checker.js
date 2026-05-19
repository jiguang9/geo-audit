#!/usr/bin/env node
'use strict';

const { fetchText } = require('./shared/fetch.js');
const { joinPath, isPublicUrl } = require('./shared/url.js');

const AI_CRAWLERS = [
  { name: 'GPTBot',             platform: 'ChatGPT',                   confidence: 'confirmed' },
  { name: 'OAI-SearchBot',      platform: 'ChatGPT Search',             confidence: 'confirmed' },
  { name: 'ClaudeBot',          platform: 'Claude (Anthropic)',          confidence: 'confirmed' },
  { name: 'anthropic-ai',       platform: 'Claude (alternate UA)',       confidence: 'confirmed' },
  { name: 'PerplexityBot',      platform: 'Perplexity',                 confidence: 'confirmed' },
  { name: 'Bytespider',         platform: 'Doubao / ByteDance (豆包)',   confidence: 'confirmed' },
  { name: 'baiduspider',        platform: 'ERNIE Bot / Baidu (文心一言)', confidence: 'confirmed' },
  { name: 'Googlebot',          platform: 'Google AI Overviews',        confidence: 'confirmed' },
  { name: 'Bingbot',            platform: 'Copilot / Bing AI',          confidence: 'confirmed' },
  { name: 'meta-externalagent', platform: 'Meta AI',                    confidence: 'likely'    },
];

// Returns: 'allowed' | 'blocked' | 'not-mentioned' | 'unknown'
function parseCrawlerStatus(robotsTxt, crawlerName) {
  const target = crawlerName.toLowerCase();
  const lines = robotsTxt.split(/\r?\n/).map(l => l.split('#')[0].trim()).filter(Boolean);

  let currentAgents = [];
  const specificRules = { disallows: [], allows: [] };
  let foundSpecific = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim().toLowerCase();
      // Start of a new agent block resets tracking
      if (currentAgents.length > 0 && agent !== currentAgents[currentAgents.length - 1]) {
        currentAgents = [];
      }
      currentAgents.push(agent);
      if (agent === target) foundSpecific = true;
      continue;
    }

    if (lower.startsWith('disallow:') || lower.startsWith('allow:')) {
      const isAllow = lower.startsWith('allow:');
      const path = line.slice(line.indexOf(':') + 1).trim();
      if (currentAgents.includes(target)) {
        if (isAllow) specificRules.allows.push(path);
        else specificRules.disallows.push(path);
      }
    }
  }

  if (!foundSpecific) return 'not-mentioned';

  // Disallow: / or Disallow: (empty catches everything in some parsers — skip empty)
  if (specificRules.disallows.includes('/')) return 'blocked';

  // Allow: / overrides any disallow
  if (specificRules.allows.includes('/')) return 'allowed';

  // Has disallows but not a total block
  if (specificRules.disallows.length > 0) return 'allowed'; // partial restrictions, not fully blocked

  return 'allowed';
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
      crawlers: AI_CRAWLERS.map(c => ({ ...c, result: 'unknown' })),
    };
  }

  if (res.status !== 200) {
    return {
      url: robotsUrl,
      accessible: false,
      httpStatus: res.status,
      crawlers: AI_CRAWLERS.map(c => ({ ...c, result: 'unknown' })),
    };
  }

  return {
    url: robotsUrl,
    accessible: true,
    httpStatus: 200,
    crawlers: AI_CRAWLERS.map(c => ({
      ...c,
      result: parseCrawlerStatus(res.body, c.name),
    })),
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
    for (const c of r.crawlers) {
      console.log(`${icon[c.result] || '❓'} ${c.name.padEnd(22)} ${c.result.padEnd(15)} ${c.platform}`);
    }
  }).catch(err => { console.error(err.message); process.exit(1); });
}

module.exports = { checkRobots, parseCrawlerStatus, AI_CRAWLERS };
