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

Run all checks at once with the main entry. Always use `--html` to generate the visual report.

```bash
# Minimal — just a URL (works immediately, no context needed)
node tools/audit.js <url> --html

# With brand name (use when brand is known)
node tools/audit.js <url> --html --brand "品牌名"

# With full context
node tools/audit.js <url> --html --brand "深信服" --industry SaaS --market China

# JSON for programmatic use
node tools/audit.js <url> --json
```

Pass `--brand` only when you already know the brand name — never ask for it before running.
After running, tell the user the HTML report path so they can open it in a browser.

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
