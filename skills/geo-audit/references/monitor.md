# Monitoring and Review Reference

GEO is not a one-time fix — AI systems update their training data and retrieval
behaviour continuously. This module covers tools, KPIs, and cadence.

## KPIs to Track

| KPI | Description | How to measure |
|-----|-------------|---------------|
| Citation rate | % of target queries where AI cites your brand | Manual testing + tools |
| Citation platform spread | Which AI platforms cite you | Manual testing |
| Citation position | Are you cited first, second, or buried? | Manual testing |
| Competitor citation rate | How often competitors appear vs. you | Manual testing |
| robots.txt coverage | Are all AI crawlers allowed? | `node tools/robots-checker.js` |
| Schema coverage | Which schema types are present | `node tools/schema-inspector.js` |
| llms.txt freshness | Is llms.txt up to date? | Manual review |

## Monthly Audit SOP

Run this checklist once per month:

1. **Automated checks:** `node tools/audit.js <url>` — compare score to last month
2. **robots.txt:** Confirm no new AI crawlers have been blocked
3. **llms.txt:** Update if major pages were added or removed
4. **Schema:** Add FAQPage or Article schema to any new high-value pages
5. **Manual query testing:** Run your top 3 target queries through each tracked AI platform
6. **Presence update:** Check for new review platform listings, media mentions, Zhihu answers

## Manual Query Testing Protocol

For each target query, test in each tracked AI platform:

```
Query: "{your target question}"
Platform: ChatGPT / Perplexity / [etc.]
Test date: YYYY-MM-DD
Result: cited / not cited / competitor cited
Citation text: [paste or describe]
```

For Chinese platforms (豆包, 文心一言, DeepSeek, Kimi):
- Test queries in Chinese as your target users would type them
- Note whether cited content is from your site or Zhihu / media

## Monitoring Tools

### Global platforms

| Tool | What it tracks | Notes |
|------|---------------|-------|
| Otterly.ai | AI Overviews, ChatGPT, Perplexity citations | Paid, most comprehensive |
| Peec.ai | AI citation tracking | Paid |
| ZipTie | AI visibility monitoring | Paid |
| Manual testing | Any platform | Free, slow at scale |

### China platforms

No dedicated GEO monitoring tool covers 豆包/文心一言/DeepSeek at scale (as of 2025).
Use the manual testing protocol above for Chinese platforms.

**Manual test cadence for Chinese platforms:**
- Run top 3 queries weekly in 文心一言, DeepSeek, and 豆包
- Record in a simple spreadsheet: date, query, platform, cited (Y/N), competitor cited (Y/N)
- Review monthly for trend

## Content Refresh Cadence

| Content type | Refresh frequency | Why |
|-------------|------------------|-----|
| Statistics / data pages | Every 6 months | AI favours fresh data |
| Product / pricing pages | After any change | Perplexity crawls frequently |
| FAQ pages | Quarterly | Add new questions from customer support |
| Blog / guides | Annually | Update outdated claims and add schema |
| llms.txt | With major site changes | Keep AI-readable index current |

## Quarterly GEO Review

Beyond monthly checks, run a deeper review each quarter:

1. **Competitor presence audit** — has a competitor gained Wikipedia, G2, or
   media presence you lack? Close the gap.
2. **Schema expansion** — identify 3 pages that would benefit from new schema types
3. **Zhihu / external content** — publish at least 2 Zhihu answers per quarter
   for Chinese market brands
4. **llms.txt review** — ensure the file reflects your current top 10 pages
5. **Score trend** — compute GEO Score and compare to the prior quarter
