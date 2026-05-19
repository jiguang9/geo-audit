# AI Platform Strategies Reference

Platform-specific citation patterns and optimisation levers.
Each entry includes a **confidence level** reflecting how well-documented
the mechanism is. Do not present `hypothesis` items as facts.

| Confidence | Meaning |
|------------|---------|
| `confirmed` | Publicly documented or reproducibly observed |
| `likely` | Strong evidence but not officially confirmed |
| `hypothesis` | Reasonable inference, not verified |

---

## Global Platforms

### ChatGPT (OpenAI)

**Confidence:** confirmed (training) / likely (retrieval)

ChatGPT's base responses draw from training data. ChatGPT Search (with browsing)
uses Bing's index as a primary retrieval source.

**Optimisation levers:**
- Bing Webmaster Tools indexing (for ChatGPT Search)
- Strong E-E-A-T signals (author, date, citations)
- FAQ schema — frequently surfaces in browsing responses
- Allow `GPTBot` and `OAI-SearchBot` in robots.txt

**Robots UA:** `GPTBot`, `OAI-SearchBot`

---

### Perplexity

**Confidence:** confirmed

Perplexity crawls the web in real-time for most queries. Fresh, well-structured
content with clear sourcing gets cited frequently.

**Optimisation levers:**
- Content freshness (publish + update dates visible)
- Clear heading structure (Perplexity extracts sections)
- External citations (Perplexity favours pages that cite sources)
- Allow `PerplexityBot` in robots.txt

**Robots UA:** `PerplexityBot`

---

### Google AI Overviews

**Confidence:** confirmed

Google AI Overviews pull from Google's search index. Pages that rank well
and have strong E-E-A-T + structured markup are most likely to be cited.

**Optimisation levers:**
- Traditional SEO ranking (prerequisite)
- FAQPage and HowTo schema
- E-E-A-T: author credentials, original reporting, citations
- Core Web Vitals (page speed affects crawl budget)

**Robots UA:** `Googlebot` (standard)

---

### Claude (Anthropic)

**Confidence:** confirmed (training) / likely (claude.ai search)

Claude's knowledge comes from training data. The claude.ai interface with web
search uses crawled content — exact retrieval mechanism not publicly specified.

**Optimisation levers:**
- High-quality, well-structured content (training signal)
- Allow `ClaudeBot` and `anthropic-ai` in robots.txt

**Robots UA:** `ClaudeBot`, `anthropic-ai`

---

### Microsoft Copilot / Bing AI

**Confidence:** confirmed

Copilot uses Bing's index. Bing Webmaster Tools and standard SEO practices apply.

**Optimisation levers:**
- Bing Webmaster Tools submission
- Schema markup (Bing reads JSON-LD)
- PageSpeed (Bing's crawl budget is sensitive to slow pages)

**Robots UA:** `Bingbot`

---

### Meta AI

**Confidence:** likely

Meta AI appears to use web retrieval, with a preference for public social and
news content. Exact citation mechanism is not publicly documented.

**Optimisation levers (likely):**
- Facebook/Instagram brand presence
- News and media mentions
- Allow `meta-externalagent` in robots.txt

**Robots UA:** `meta-externalagent` (unconfirmed stable)

---

## Chinese Platforms

### DeepSeek (深度求索)

**Confidence:** likely

DeepSeek uses a hybrid of training data and internet search. It shows strong
preference for authoritative, well-cited content — particularly from Zhihu,
academic sources, and major tech media.

**Optimisation levers (likely):**
- Zhihu presence — DeepSeek frequently cites Zhihu answers
- Academic / research content (CNKI, arXiv)
- Structured, factual writing style
- Baidu indexing (DeepSeek search likely piggybacks on Baidu)

**Note:** DeepSeek's retrieval sources are not publicly documented in detail.
Zhihu citation pattern is observed, not confirmed by DeepSeek.

---

### Doubao (豆包) — ByteDance

**Confidence:** hypothesis

Doubao is ByteDance's AI assistant. It likely leverages ByteDance's content
ecosystem (Toutiao, Douyin, Xigua) and possibly Bing via licensing, but
retrieval architecture is not publicly documented.

**Optimisation levers (hypothesis):**
- 今日头条 (Toutiao) content presence
- 微信公众号 (WeChat Official Account) content
- Structured, SEO-friendly Chinese content that Bing or Baidu indexes
- Allow `Bytespider` in robots.txt (ByteDance's crawler)

**Robots UA:** `Bytespider`

---

### ERNIE Bot / Baidu (文心一言)

**Confidence:** likely

文心一言 is tightly integrated with Baidu Search. Pages that rank in Baidu
search and have good Baidu indexing are the primary citation source.

**Optimisation levers (likely):**
- Baidu Search indexing (Baidu Webmaster Tools, Baidu sitemap)
- 百度百科 (Baidu Baike) listing for brand entity
- Chinese-language content optimised for Baidu
- Allow `Baiduspider` in robots.txt

**Robots UA:** `Baiduspider`, `Baiduspider-image`

---

### Kimi (Moonshot AI / 月之暗面)

**Confidence:** likely

Kimi is known for strong long-document understanding and web retrieval. It
appears to index the open web and frequently cites Zhihu, major tech media,
and well-structured reference pages.

**Optimisation levers (likely):**
- Long-form, comprehensive content (Kimi handles long context well)
- Zhihu presence
- Clear structure (Kimi extracts sections accurately)
- Content completeness — Kimi rewards pages that answer a topic fully

---

### Qwen (通义千问) — Alibaba

**Confidence:** hypothesis

通义千问 is Alibaba's AI assistant. It likely integrates with Alibaba's
e-commerce and enterprise data, and possibly retrieves from Baidu/Bing.
Exact retrieval architecture not published.

**Optimisation levers (hypothesis):**
- 淘宝 / 天猫 product listings (for e-commerce)
- 钉钉 / 企业微信 enterprise content
- Standard Chinese web content indexed by Baidu

---

### Hunyuan (混元) — Tencent

**Confidence:** hypothesis

混元 likely draws from Tencent's ecosystem (微信, 腾讯新闻) and web retrieval.
Not publicly documented.

**Optimisation levers (hypothesis):**
- 微信公众号 content
- 腾讯新闻 coverage
- Standard web indexing

---

### Spark (讯飞星火) — iFlytek

**Confidence:** hypothesis

星火 focuses on enterprise and education use cases. Likely uses a mix of
training data and licensed content rather than open web retrieval.

---

### ChatGLM (智谱清言) — Zhipu AI

**Confidence:** hypothesis

ChatGLM uses training data from Chinese web corpus. Web retrieval capability
exists but citation patterns are not well documented publicly.

**Optimisation levers (hypothesis):**
- High-quality Chinese academic / technical content
- Presence in Chinese open web corpus
