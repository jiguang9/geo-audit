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

## Phase 0 — Load Context

Check the user's project root for `.agents/geo-audit-context.md`.

If the file exists, read it and proceed to Phase 1.

If it does not exist, collect the following before continuing:

1. **URL** — the target website (must be publicly accessible)
2. **Brand name** — how the brand is referred to in AI answers
3. **Industry** — SaaS / e-commerce / content media / local business / B2B
4. **Target AI platforms** — all, or specific (ChatGPT, Perplexity, DeepSeek, 豆包, 文心一言, etc.)
5. **Target market / language** — China, US, global; Chinese, English, bilingual
6. **Top 3 queries** — the questions the user most wants AI to cite them for
7. **Competitors** — 2–3 competitor or peer brands to benchmark against

Do not write collected context back into the skill directory. Offer to save it to `.agents/geo-audit-context.md` in the user's project root for future runs.

## Phase 1 — Automated Technical Checks

Run the following tools against the target URL. Each tool is a standalone Node.js script requiring no external dependencies.

```bash
node tools/robots-checker.js <url>
node tools/llms-txt-checker.js <url>
node tools/schema-inspector.js <url>
node tools/content-structure.js <url>
```

Or run all at once with the main entry:

```bash
node tools/audit.js <url>           # Markdown report
node tools/audit.js <url> --json    # JSON for further processing
```

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

Only output recommendations for the platforms the user selected in Phase 0. Do not speculate about platforms not selected.

## Phase 5 — Monitoring

Provide a monitoring plan using `references/monitor.md`. Include:
- Recommended tools for the user's market (global vs. China)
- Monthly audit cadence
- KPIs to track

## Output Format

```
## GEO Diagnostic Report — {Brand} ({Date})
> {URL}

### GEO Score: XX/100  Level X
| Dimension           | Score  | Status |
|---------------------|--------|--------|
| Structure           | XX/30  | 🔴/🟡/🟢 |
| Authority           | XX/25  | 🔴/🟡/🟢 |
| Third-party presence| XX/25  | 🔴/🟡/🟢 |
| Technical access    | XX/20  | 🔴/🟡/🟢 |

### Technical Checks
(robots.txt / llms.txt / Schema output)

### Key Findings
✅ ...
❌ ...
⚠️ ...

### Priority Action List
1. [This week] ...
2. [This month] ...
3. [Long term] ...

### Platform-Specific Recommendations
(only for selected platforms)
```
