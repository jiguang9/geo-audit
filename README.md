# geo-audit

> GEO (Generative Engine Optimization) diagnostic skill for AI search visibility

Diagnoses how content is discovered, cited, and referenced by AI systems —
ChatGPT, Perplexity, Claude, Google AI Overviews, DeepSeek, Doubao (豆包),
ERNIE Bot (文心一言), Kimi, Qwen (通义千问), and more.

Traditional SEO gets you ranked. GEO gets you **cited**.

## Why this one?

| Capability | geo-audit | Typical GEO/SEO skills |
|-----------|-----------|------------------------|
| China AI platforms (DeepSeek, 豆包, 文心, Kimi, 通义) + Bytespider/baiduspider crawler rules + 知乎/百度百科 presence | ✅ First-class | ❌ Western platforms only |
| Evidence-based scoring — presence scored `unknown` (N/75), never fake-zeroed; per-dimension confidence (●/◐/○) | ✅ | Rarely |
| Citation failure taxonomy (T-ACCESS / T-INDEX / C-MATCH / C-ANSWER / A-AUTH / A-FRESH / P-ABSENCE) auto-diagnosed with per-code fixes | ✅ | ❌ |
| Audit → **fix** closure: pre-filled llms.txt generator, JSON-LD templates written into your repo by the agent | ✅ | Audit-only |
| Score history + trend diff between runs | ✅ `--save` | Paid SaaS |
| CI gate via GitHub Action | ✅ Zero-dep | Rare |
| Bilingual reports (中文 / English) | ✅ `--lang` | Single language |

## Install

```bash
npx skills add https://github.com/jiguang9/geo-audit --skill geo-audit
```

Works with: Claude Code, Codex, OpenClaw, Hermes, Cursor, Windsurf

## Update

`npx skills add` copies files as a plain folder (no `.git`), so `git pull`
and `npx` both fail inside sandboxed shells like Codex. Use `update.sh` instead
— it only needs `curl` or `wget`:

```bash
bash ~/.codex/skills/geo-audit/update.sh
# Adjust the path to wherever the skill is installed
```

`update.sh` auto-selects the best available method: `git pull` → `curl` → `wget`.

## Usage

### As a skill (in your agent)

Trigger the `geo-audit` skill by describing what you want:

```
Run a GEO audit on https://example.com
Check my AI search visibility for [brand]
Why isn't my content cited by ChatGPT?
做一次 GEO 诊断
```

The skill runs automated checks immediately and outputs a scored report with
actionable recommendations.

### As a CLI tool

```bash
# Full audit — Markdown report (stdout)
node tools/audit.js https://example.com --brand "Brand"

# English report
node tools/audit.js https://example.com --brand "Brand" --lang en

# Save a score snapshot; future runs auto-show a trend table
node tools/audit.js https://example.com --save

# Flags can appear in any order
node tools/audit.js --brand "Brand" --industry SaaS https://example.com

# JSON output for scripting / agent processing
node tools/audit.js https://example.com --json

# Generate a pre-filled llms.txt from your live site (title, description, key pages)
node tools/llms-txt-generator.js https://example.com > llms.txt

# Individual checks
node tools/sitemap-checker.js https://example.com
node tools/robots-checker.js https://example.com
node tools/llms-txt-checker.js https://example.com
node tools/schema-inspector.js https://example.com
node tools/content-structure.js https://example.com
```

**Named flags** (all optional, override context file):

| Flag | Example | Notes |
|------|---------|-------|
| `--brand` | `--brand "Acme"` | Brand name in report header |
| `--industry` | `--industry SaaS` | SaaS / ecommerce / media / B2B / local |
| `--market` | `--market China` | China / US / global |
| `--lang` | `--lang en` | Report language: `zh` (default) or `en` |
| `--save` | `--save` | Save score snapshot to `.agents/geo-audit-history/` |

### Score history & trends

Run with `--save` to persist a snapshot. Every later audit of the same domain
automatically shows a **Score Trend** table (previous vs. current, with per-
dimension deltas). Totals are normalized to 0-100 so runs before and after
presence evidence stay comparable. Commit `.agents/geo-audit-history/` to
track GEO progress in git.

### GitHub Action (CI gate)

Fail a PR when the GEO score regresses:

```yaml
# .github/workflows/geo-audit.yml
name: GEO Audit
on:
  schedule: [{ cron: '0 6 * * 1' }]   # weekly
  workflow_dispatch:
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: jiguang9/geo-audit@main
        with:
          url: https://example.com
          brand: 'Acme'
          min-score: 60        # 0 = report-only
          lang: en
```

The full Markdown report lands in the job summary; the job fails if the
normalized score drops below `min-score`.

## What the Report Covers

Each audit produces a Markdown report with:

- **总裁决 / Verdict** — top-line 🟢 Citable / 🟡 Needs work / 🔴 Blocked gate; a hard veto (e.g. AI crawlers blocked, `V-ACCESS`) caps the score at level 2 and shows the uncapped raw score
- **GEO Score** — 4-dimension score (0–100) with confidence indicators
- **关键技术证据** — robots.txt crawler access, llms.txt status, Schema markup found/missing, article-page authority signals, quotable content blocks
- **Schema 缺失属性** — attribute-level gaps beyond type-level (e.g. `Organization.sameAs`, `Article.dateModified`, `Product.offers`)
- **引用失败诊断** — auto-diagnosed failure codes (T-ACCESS / T-INDEX / C-MATCH / C-ANSWER / A-AUTH / A-FRESH / P-ABSENCE) with per-code fix guidance
- **引用证据矩阵** — query × platform citation matrix (when `citationEvidence` provided in context)
- **第三方存在感验证** — search links for GitHub, G2, 知乎, Product Hunt, 百度百科, Capterra to verify brand presence
- **P0 / P1 / P2 actions** — prioritised fixes with copy-paste code templates
- **推荐监控查询** — 7–10 concrete queries to test monthly across AI platforms

## GEO Score

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Structure extractability | 30 | Headings, FAQ schema, tables/lists, quotable paragraphs |
| Authority / credibility | 25 | Citations, authorship, freshness, Organization schema |
| Third-party presence | 25 | Zhihu, Wikipedia, review sites, media mentions |
| Technical accessibility | 20 | robots.txt, llms.txt, Schema markup, canonical |

When third-party presence evidence is not provided, that dimension is scored `unknown`
and the total is shown as `N/75` rather than penalising with a zero.

**Score → Maturity level:**

| Level | Score | Status |
|-------|-------|--------|
| 1 | 0–20 | AI crawlers blocked or unreachable |
| 2 | 21–40 | Reachable but rarely cited |
| 3 | 41–60 | Occasionally cited |
| 4 | 61–80 | Regularly cited across platforms |
| 5 | 81–100 | High-frequency citation, strong authority |

## AI Platforms Covered

**Global:** ChatGPT, ChatGPT Search, Perplexity, Google AI Overviews, Claude,
Microsoft Copilot, Meta AI

**China:** DeepSeek, Doubao (豆包), ERNIE Bot (文心一言), Qwen (通义千问),
Kimi

## Context File

Create `.agents/geo-audit-context.md` (or `.json`) in your project root to
provide additional context. The skill reads it automatically on every run.

### Markdown format

```markdown
url: https://example.com
brand: Acme
industry: SaaS
market: global
platforms: ChatGPT, Perplexity, Google AI Overviews
queries: what is the best X tool, how to do Y, X vs competitor
competitors: CompetitorA, CompetitorB
```

### Presence evidence (unlocks the 25-pt presence dimension)

```markdown
presence: {"hasWikipedia": false, "hasBaiduBaike": false, "hasZhihu": true, "reviewPlatformCount": 2, "mediaMentionCount": 5, "socialPlatformCount": 3}
```

### Citation evidence (enables query × platform matrix)

```markdown
citationEvidence: [{"query": "best X tool", "platform": "ChatGPT", "brandMentioned": true, "officialUrlCited": false, "competitorsCited": ["CompA"]}, {"query": "best X tool", "platform": "Perplexity", "brandMentioned": false, "officialUrlCited": false, "competitorsCited": []}]
```

### JSON format

Alternatively, use `.agents/geo-audit-context.json` with the same keys as a JSON object.

## Tests

```bash
npm test
```

Uses Node.js built-in test runner (`node:test`), zero dependencies. Covers:
robots.txt parsing (RFC-compliant, wildcard, multi-UA, deep paths), llms.txt
validation, schema inspection, content structure + extractable block detection,
CLI argument ordering, failure taxonomy, citation matrix, and report rendering.

## License

MIT
