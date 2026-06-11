# Citation Evidence Module

Documents how to collect and interpret AI citation evidence. See SKILL.md Phase 2 for when to use this.

## What Citation Evidence Is

Citation evidence answers: *In AI-generated answers to target queries, does this brand appear? Is the official site linked?*

It cannot be fully automated — it requires querying AI platforms and recording results.

## Query Taxonomy

Collect evidence across five query types:

| Type | Example | Citation pattern |
|------|---------|-----------------|
| Brand query | "[Brand] 是什么" | Brand should dominate; if not, entity recognition is weak |
| Category query | "最好的 [类别] 工具" | Brand competes vs category leaders |
| Problem query | "如何解决 [问题]" | Brand cited if has authoritative how-to content |
| Comparison query | "[Brand] vs [Competitor]" | Brand cited in comparison content |
| Commercial query | "[类别] 推荐" | Brand cited in recommendation lists |

## Platform Coverage

| Platform | Check method | Cite pattern |
|----------|-------------|--------------|
| ChatGPT (GPT-4o) | Web interface or API | Inline links rare; brand mentions in text |
| ChatGPT Search | Web interface, search mode | URL citations common |
| Perplexity | Web interface | URL citations in Sources panel |
| Google AI Overviews | google.com search | Links in AI overview section |
| Microsoft Copilot | copilot.microsoft.com | URL citations inline |
| DeepSeek | deepseek.com | Brand mentions; limited external citations |
| 豆包 (Doubao) | doubao.com | Brand mentions; limited citations |
| 文心一言 (ERNIE Bot) | yiyan.baidu.com | Links to Baidu index pages |
| Kimi | kimi.moonshot.cn | URL citations common |

## Citation Matrix Template

Record results for each (query, platform) pair:

```
Query: [query text]
Date: YYYY-MM-DD

| Platform | Brand mentioned | Official URL cited | Competitor cited | Notes |
|----------|:--------------:|:-----------------:|:----------------:|-------|
| ChatGPT  | ✅ / ❌ | ✅ / ❌ | [name or —] | |
| Perplexity | | | | |
| Google AI Overview | | | | |
| DeepSeek | | | | |
| 豆包 | | | | |
```

## Failure Taxonomy

When the brand is not cited, classify the likely reason:

| Code | Reason | Diagnostic signal | Fix |
|------|--------|-------------------|-----|
| T-ACCESS | AI crawler blocked | robots.txt result=blocked for search/indexing bots | Unblock in robots.txt |
| T-INDEX | Page not in AI index | No llms.txt; no sitemap; HTTP errors | Add llms.txt, fix sitemap |
| C-MATCH | Content doesn't match query intent | Tool checks homepage; query targets blog | Create dedicated answer page |
| C-ANSWER | No direct answer in content | Missing FAQ schema; no opening conclusion | Rewrite with answer-first structure |
| A-AUTH | Authority signals missing | 0/25 authority score; no org/author schema | Add Organization JSON-LD, author, dates |
| A-FRESH | Content outdated | No dateModified; old lastmod in sitemap | Update content + schema dates |
| P-ABSENCE | Brand not in third-party sources | Presence score low or unknown | Build Zhihu/GitHub/media presence |
| P-COMPETE | Competitor outranks in third-party | Competitor has more review/media mentions | Target review platforms, run link building |

## Scoring Presence from Citation Evidence

If the user provides citation evidence, update presence scoring:

- Brand cited in 3+ platforms for a query → socialPlatformCount +1
- Official URL cited in Perplexity/ChatGPT Search → mediaMentionCount +1 per confirmed citation
- Brand appears in comparison queries → reviewPlatformCount +1

## Monitoring Cadence

- Monthly: run 10 target queries across ChatGPT, Perplexity, top China platform
- After each major site change: re-run technical checks + 3 brand queries
- After content publish: check same query in Perplexity within 48h (fast indexing)
