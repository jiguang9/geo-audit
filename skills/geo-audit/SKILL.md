---
name: geo-audit
description: >-
  When the user wants to audit, diagnose, or improve how their content is
  discovered, cited, or referenced by AI systems — including ChatGPT,
  Perplexity, Claude, Google AI Overviews, DeepSeek, Doubao (豆包), ERNIE Bot
  (文心一言), Kimi, and Qwen (通义千问). Triggers on: GEO audit, AI SEO, AI
  visibility check, AI citation analysis, LLM SEO, AI search optimization,
  生成式引擎优化, AI 搜索诊断, 被 AI 引用, why isn't AI citing my content.
version: 1.0.0
---

# geo-audit

Diagnose and improve content visibility across AI search systems.
Traditional SEO gets you ranked. GEO gets you **cited**.

## Security Boundaries

Before running any check:

- Only fetch publicly accessible URLs provided by the user
- Do not scan localhost, private IPs (10.x, 192.168.x, 172.16–31.x), or .local / .internal domains
- Do not bypass authentication or scrape paywalled content
- Make at most one HTTP request per check — no crawling, no spidering
- For third-party presence checks, ask the user to supply evidence; do not scrape competitor or review sites

## Phase 0 — Start Immediately

**Run the audit now. Do not ask questions first.**

1. Extract the URL from the user's message. If no URL was given, ask for one — that is the only required input.
2. Check if the user already mentioned a brand name in their message. If yes, pass it via `--brand`. If not, skip the flag — the report will use the domain name.
3. Check the user's project root for `.agents/geo-audit-context.md`. If it exists, read it for additional context (brand, industry, market); pass what's available as CLI flags.
4. Run the audit (see Phase 1). Do **not** ask the user to fill in industry, platforms, queries, competitors, or market before running.

After the audit is complete and results are shown, you may briefly note (in one sentence) that adding context to `.agents/geo-audit-context.md` will improve presence scoring — but only if presence was marked unknown.

## Phase 1 — Automated Technical Checks

Run four commands in sequence. Each takes a few seconds.

**Step 1 — Sitemap overview** (understand the site's content scope)

```bash
node tools/sitemap-checker.js <url>
```

This returns total page count, blog post count, last update date, and 2–3 sample URLs to spot-check.

**Step 2 — Full homepage audit** (always include `--html` for the visual dashboard)

```bash
node tools/audit.js <url> --html --brand "品牌名"
# or without brand if not known:
node tools/audit.js <url> --html
```

Pass `--brand` only when already known.

**Step 3 — Spot-check 2–3 key pages** using sample URLs from Step 1

Pick one from each category (about/team page, a blog post, a product/tool page):

```bash
node tools/schema-inspector.js <url>/about
node tools/schema-inspector.js <url>/blog/any-representative-post
node tools/schema-inspector.js <url>/product-or-tool-page
```

Record what schema types were found (or missing) on each page — these go in the "关键证据" section.

## Phase 2 — Three-Pillar Evaluation

After the automated checks, evaluate the three GEO pillars using the reference modules:

- **Structure** → `references/structure.md` — content extractability
- **Authority** → `references/authority.md` — credibility signals
- **Presence** → `references/presence.md` — third-party footprint (evidence-based, see note below)

**Presence note:** The automated tools cannot check Zhihu, Wikipedia, Baidu Baike, G2, or media sites. Ask the user to confirm or search for:
- Does the brand have a Zhihu topic or answers? (知乎)
- Is it listed on Wikipedia or Baidu Baike (百度百科)?
- Any review platform listings (G2, Capterra, Trustpilot, 36Kr, etc.)?
- Media / industry blog mentions in the past 12 months?
- Competitor comparison articles that include the brand?

Score this dimension only from confirmed evidence. Mark as `unknown` if evidence is not provided.

## Phase 3 — Score and Report

Scoring model (100 points total):

| Dimension | Weight | Notes |
|-----------|--------|-------|
| Structure extractability | 30 | Automated |
| Authority / credibility | 25 | Automated + user evidence |
| Third-party presence | 25 | Evidence-based; `unknown` if not provided |
| Technical accessibility | 20 | Automated |

See `references/scoring.md` for breakdown rules.

**Maturity levels:**

| Level | Score | Description |
|-------|-------|-------------|
| 1 | 0–20 | AI crawlers blocked or unreachable |
| 2 | 21–40 | Reachable but rarely cited |
| 3 | 41–60 | Occasionally cited |
| 4 | 61–80 | Regularly cited |
| 5 | 81–100 | High-frequency citation, strong authority |

## Phase 4 — Platform-Specific Guidance

After scoring, provide targeted recommendations for the user's selected AI platforms. Each platform has different citation patterns and optimisation levers. See `references/platforms.md` for platform-by-platform guidance with confidence levels (`confirmed`, `likely`, `hypothesis`).

If the user specified target platforms in their message or context file, focus recommendations on those. Otherwise, default to the top global platforms (ChatGPT, Perplexity, Google AI Overviews) plus the top China platforms (DeepSeek, Doubao, ERNIE Bot) when market context suggests China.

## Phase 5 — Monitoring

Provide a monitoring plan using `references/monitor.md`. Include:
- Recommended tools for the user's market (global vs. China)
- Monthly audit cadence
- KPIs to track

## Output Format

Write the report directly in the conversation — do not reference the tool's stdout table. The HTML file is the visual dashboard; the conversation response is the full analysis.

```
## GEO 诊断报告 — {Brand}（{Date}）
**目标网站**: {URL}
**行业/市场**: {industry / market if known}
**诊断方法**: robots.txt、llms.txt、Schema、内容结构（首页自动检测）+ sitemap 概览 + {N} 个页面抽查

### 总体结论

[2–3 句话：当前 GEO 状态 + 最大短板 + 优先方向。不要只罗列发现，要给出判断。
例："站内内容主题集中，但首页缺少机器可读的实体信号（Organization schema、canonical），
文章页无作者/日期 schema，使 AI 系统难以判断权威性，这是当前被引用率低的核心原因。"]

### GEO 得分

| 维度 | 得分 | 判断 |
|------|-----:|------|
| 技术可访问性 | XX/20 | [一句话] |
| 内容可摘取性 | XX/30 | [一句话] |
| 实体与权威信号 | XX/25 | [一句话] |
| 第三方存在感 | XX/25 或 unknown | [一句话] |
| **总分** | **XX/100** | **Level X：[描述]** |

### 关键证据

列出每个检查点的具体发现（有 URL 就带 URL）：

- `robots.txt` — [是否允许主流 AI 爬虫]
- `/llms.txt` — [存在/404/内容质量]
- `/sitemap.xml` — [共 N 个页面，M 篇博客，最近更新 YYYY-MM-DD]
- `/`（首页）— [发现哪些 schema，缺哪些，是否有 canonical]
- `/{about-page}` — [抽查结果：有无 Person/Organization schema]
- `/{blog-post}` — [抽查结果：有无 BlogPosting/Article、作者、日期]
- `/{tool-or-product-page}` — [抽查结果：有无 WebApplication/Product schema]

### P0：本周做

[最高优先级，1–3 项，每项必须包含可直接复制的代码示例]

**1. 上线 /llms.txt**（如果缺失）

给出完整的 llms.txt 内容模板，填入该站点的实际信息：
```txt
# {domain}

> {一句话站点定位}

## Key pages
- Home: {url}/
- {页面名}: {url}/{path}
...

## Core topics
- {主题 1}
- {主题 2}
```

**2. 首页补 canonical + Organization JSON-LD**（如果缺失）

给出完整代码，用实际品牌名/URL/描述填充占位符。

**3. FAQ / FAQPage JSON-LD**（如果首页有 FAQ 文案但无 schema）

给出完整代码示例。

### P1：本月做

[中优先级，2–4 项，可以只给指导方向，不强制要代码]

**4. 博客模板补 BlogPosting JSON-LD + 作者 + 日期**
**5. 每篇核心文章加可引用摘要（40–80 字，开头给结论）**
**6. 建立核心主题 Hub 页**

### P2：持续做

**7. 建立第三方存在感**（知乎、GitHub、小红书/公众号、工具目录、Wikipedia/百度百科）
**8. 文章增加数据与外部引用**

### 推荐监控

每月人工测试以下查询，记录 ChatGPT、Perplexity、Google AI Overviews、DeepSeek、豆包是否引用本站：

- {根据站点主题生成 7–10 个具体查询，不要写通用占位符，要是真实的搜索问题}
```
