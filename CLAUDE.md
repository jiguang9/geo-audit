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

Use dynamic injection to run tools and embed results:

```
!`node tools/audit.js https://example.com --html`
!`node tools/robots-checker.js https://example.com`
!`node tools/schema-inspector.js https://example.com`
```

The `--html` flag writes a self-contained HTML dashboard to the current directory
and prints a compact score summary inline. Share the file path with the user.

## Context

Read `.agents/geo-audit-context.md` from the user's project root before running.
If absent, collect: URL, brand name, industry, target AI platforms, target
market/language, top 3 queries, and 2–3 competitor brands.

Do not write context back to the skill installation directory.

## Security

Only fetch publicly accessible URLs. Block localhost, private IPs (10.x, 192.168.x,
172.16-31.x), .local / .internal domains, and any URL requiring authentication.
