# Third-Party Presence Reference

AI systems learn about brands from the broader web — not just your own site.
This dimension is evidence-based: the automated tools cannot check these
platforms. Collect evidence from the user before scoring.

## Why Presence Matters

GEO is fundamentally about whether AI systems have enough signal to confidently
cite you. A brand that exists only on its own website is a weak signal. A brand
mentioned in Wikipedia, Zhihu, G2, and major media is a strong, triangulated
entity that AI systems trust.

## Evidence Collection Checklist

Ask the user to confirm each of the following:

### Encyclopedia / Knowledge Bases

| Platform | Relevance | How to check |
|----------|-----------|-------------|
| Wikipedia (EN) | Global AI systems | Search `site:en.wikipedia.org {brand}` |
| Wikipedia (ZH) | Chinese AI systems | Search `site:zh.wikipedia.org {brand}` |
| Baidu Baike (百度百科) | 文心一言, DeepSeek | Search `{brand} site:baike.baidu.com` |
| Wikidata | Entity resolution for all AI | Search `wikidata.org` for brand entity |

**Scoring note:** Wikipedia (EN) = 4 pts, Baidu Baike = 2 pts, Wikipedia (ZH) = 2 pts

### Review and Comparison Platforms

| Platform | Market | Relevance |
|----------|--------|-----------|
| G2 | Global SaaS | ChatGPT, Perplexity, Claude |
| Capterra | Global SaaS | ChatGPT, Google AI |
| Trustpilot | Global | Perplexity, Bing AI |
| 36Kr (36氪) | China tech | DeepSeek, 文心一言 |
| 虎嗅 (Huxiu) | China tech | DeepSeek, Kimi |
| IT之家 | China consumer | 豆包, 通义千问 |
| AppStore / Google Play reviews | Mobile | All platforms |

Each confirmed listing = 2 pts, capped at 7 pts total.

### Media and Industry Mentions

- News articles from credible outlets (not press releases)
- Industry analyst reports (Gartner, IDC, iResearch 艾瑞咨询)
- Tech blog coverage (TechCrunch, 36Kr, 少数派)
- Academic or research paper citations

Each confirmed mention type = 2 pts, capped at 6 pts total.

### Social and Brand Entity Coverage

Platforms where AI systems look for brand signals:

- LinkedIn company page (verified)
- Twitter / X verified account
- YouTube channel
- 微信公众号 (WeChat Official Account)
- 微博 (Weibo) verified account
- 知乎专栏 (Zhihu column)
- 抖音 (Douyin) / TikTok brand account

Each confirmed platform = 1 pt, capped at 4 pts total.

## Zhihu (知乎) — Priority for Chinese AI

Zhihu is the single most important third-party presence platform for Chinese AI
systems. DeepSeek, Kimi, and 文心一言 frequently cite Zhihu answers in their
responses.

**What counts:**
- Answers on Zhihu mentioning the brand (by you or others)
- A Zhihu topic page for the brand
- Zhihu columns (专栏) authored by the brand

**Fix:** Publish high-quality answers to relevant Zhihu questions. Do not
keyword-stuff — Zhihu answers that genuinely help users are the ones AI cites.

## Competitor Benchmarking

Compare the user's presence against their stated competitors across:
- Wikipedia / Baidu Baike listings
- Review platform presence
- Media mention volume (last 12 months)
- Zhihu topic existence

This context helps prioritise which presence gaps to close first. A competitor
with a Wikipedia entry and 50 G2 reviews will consistently outrank a brand
with neither, regardless of on-page quality.

## Scoring note

If the user provides no evidence for this dimension, mark it as `unknown`
and do not assign a score. Do not estimate or assume. Clearly state:

> "Third-party presence scored as unknown — please provide evidence of
> Wikipedia listing, review platform presence, and media mentions."

## Scoring contribution (out of 25)

| Signal | Points |
|--------|--------|
| Wikipedia / Baidu Baike / Wikidata | 0–8 |
| Review / comparison platform listings | 0–7 |
| Media and industry mentions | 0–6 |
| Social / brand entity coverage | 0–4 |
