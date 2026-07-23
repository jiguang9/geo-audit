# geo-audit — Claude Code Plugin

GEO (Generative Engine Optimization) diagnostic skill. Audits content visibility
and citation potential across global and Chinese AI platforms.

## Skill

`geo-audit` — Full GEO diagnostic covering structure extractability, authority
signals, third-party presence, and technical accessibility.

**Triggers:** GEO audit, AI SEO, AI visibility check, AI citation analysis,
LLM SEO, AI search optimization, 生成式引擎优化, AI 搜索诊断, 被 AI 引用

## Quick Start

```bash
npx skills add https://github.com/jiguang9/geo-audit --skill geo-audit
```

## Running Tools (Claude Code)

Run the full audit first, then spot-check individual pages:

```bash
# Full audit (Markdown report to stdout)
node tools/audit.js https://example.com --brand "Brand Name"

# Generate a pre-filled llms.txt (title/description/pages from the live site)
node tools/llms-txt-generator.js https://example.com

# Individual checks
node tools/robots-checker.js https://example.com
node tools/llms-txt-checker.js https://example.com
node tools/sitemap-checker.js https://example.com
node tools/schema-inspector.js https://example.com/about
node tools/content-structure.js https://example.com/blog/post
```

Flags (`--brand`, `--industry`, `--market`, `--lang zh|en`) can appear in any
order relative to the URL. `--json` outputs structured JSON. `--save` writes a
score snapshot to `.agents/geo-audit-history/`; later runs of the same domain
automatically render a Score Trend section.

## Report Sections

The Markdown report includes:

- **总裁决** — top-line 🟢 可引用 / 🟡 需修复 / 🔴 被阻断 gate; a hard veto (`V-ACCESS`: AI crawlers blocked or page unreachable) caps the score at level 2 and displays the uncapped `rawTotal`
- **GEO 得分** — 4-dimension score with confidence symbols (●/◐/○)
- **关键技术证据** — robots.txt, llms.txt, Schema types found/missing, Schema attribute gaps (`Organization.sameAs`, `Article.dateModified`, etc.), article-page author/date signals, quotable content blocks and missing block types
- **引用证据矩阵** — query × platform matrix when `citationEvidence` is in context
- **第三方存在感验证** — search links for manual brand presence checks (shown when presence is unknown)
- **引用失败诊断** — auto-diagnosed failure codes (T-ACCESS / T-INDEX / C-MATCH / C-ANSWER / A-AUTH / A-FRESH / P-ABSENCE) with specific fix guidance
- **P0 / P1 / P2 actions** — prioritised fixes with copy-paste code snippets
- **推荐监控** — concrete queries to test monthly on AI platforms

## Context File

Read `.agents/geo-audit-context.md` (or `.json`) from the user's project root
before running. Supported fields:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Target website |
| `brand` | string | Brand name for report header |
| `industry` | string | SaaS / ecommerce / media / B2B / local |
| `market` | string | China / US / global |
| `platforms` | string | Comma-separated target AI platforms |
| `queries` | string | Top queries to be cited for |
| `competitors` | string | Competitor brands |
| `presence` | JSON object | Third-party presence evidence (unlocks 25-pt dimension) |
| `citationEvidence` | JSON array | Query × platform citation test results |

**presence** object fields: `hasWikipedia`, `hasBaiduBaike`, `hasZhihu` (bool),
`reviewPlatformCount`, `mediaMentionCount`, `socialPlatformCount` (int).

**citationEvidence** array item fields: `query`, `platform`, `brandMentioned`,
`officialUrlCited` (bool), `competitorsCited` (string array).

Do not write context back to the skill installation directory.

## Security

Only fetch publicly accessible URLs. Block localhost, private IPs (10.x, 192.168.x,
172.16-31.x), .local / .internal domains, and any URL requiring authentication.
Make at most one HTTP request per check — no crawling, no spidering.
