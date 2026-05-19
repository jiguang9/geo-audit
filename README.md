# geo-audit

> GEO (Generative Engine Optimization) diagnostic skill for AI search visibility

Diagnoses how content is discovered, cited, and referenced by AI systems —
ChatGPT, Perplexity, Claude, Google AI Overviews, DeepSeek, Doubao (豆包),
ERNIE Bot (文心一言), Kimi, Qwen (通义千问), and more.

Traditional SEO gets you ranked. GEO gets you **cited**.

## Install

```bash
npx skills add https://github.com/jiguang9/geo-audit --skill geo-audit
```

Works with: Claude Code, Codex, OpenClaw, Hermes, Cursor, Windsurf

## Update

`npx skills add` copies files as a plain folder — `git pull` will fail with
"not a git repository". Update by re-running the install command instead:

```bash
# Re-install to get the latest version
npx skills add https://github.com/jiguang9/geo-audit --skill geo-audit

# Or use the bundled script (adjust path as needed)
bash ~/.codex/skills/geo-audit/update.sh
```

## Usage

### As a skill (in your agent)

Trigger the `geo-audit` skill by describing what you want:

```
Run a GEO audit on https://example.com
Check my AI search visibility for [brand]
Why isn't my content cited by ChatGPT?
做一次 GEO 诊断
```

The skill collects context, runs automated checks, and outputs a scored report.

### As a CLI tool

```bash
# Full audit — Markdown report
node tools/audit.js https://example.com

# Full audit — JSON output (for scripting / agent processing)
node tools/audit.js https://example.com --json

# Individual checks
node tools/robots-checker.js https://example.com
node tools/llms-txt-checker.js https://example.com
node tools/schema-inspector.js https://example.com
node tools/content-structure.js https://example.com
```

## GEO Score

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Structure extractability | 30 | Headings, FAQ, tables, paragraph independence |
| Authority / credibility | 25 | Citations, authorship, freshness, schema signals |
| Third-party presence | 25 | Zhihu, Wikipedia, review sites, media mentions |
| Technical accessibility | 20 | robots.txt, llms.txt, Schema markup, canonical |

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
Gemini, Microsoft Copilot, Meta AI

**China:** DeepSeek, Doubao (豆包), ERNIE Bot (文心一言), Qwen (通义千问),
Kimi, Hunyuan (混元), Spark (讯飞星火), ChatGLM (智谱清言)

## Context File

Create `.agents/geo-audit-context.md` in your project root to skip interactive
collection on subsequent runs. The skill will read it automatically.

Required fields:
- `url` — target website
- `brand` — brand name
- `industry` — SaaS / ecommerce / media / local / B2B
- `platforms` — target AI platforms
- `market` — China / US / global, language preference
- `queries` — top 3 queries you want to be cited for
- `competitors` — 2–3 competitor brands

## Tests

```bash
npm test
```

Uses Node.js built-in test runner (`node:test`), zero dependencies.

## License

MIT
