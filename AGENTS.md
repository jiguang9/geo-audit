# geo-audit — GEO Diagnostic Skill

Generative Engine Optimization (GEO) diagnostic skill for AI search visibility.
Audits how content is discovered, cited, and referenced by AI systems worldwide.

## Supported Agent Environments

Claude Code, Codex, OpenClaw, Hermes, Cursor, Windsurf, GitHub Copilot

## Installation

```bash
npx skills add https://github.com/jiguang9/geo-audit --skill geo-audit
```

## Update

`npx skills add` installs as a plain folder (no `.git`). In sandboxed shells
like Codex, both `git pull` and `npx` may be unavailable. Use the bundled
script — it only requires `curl` or `wget`:

```bash
bash ~/.codex/skills/geo-audit/update.sh
# Adjust path to wherever the skill is installed
```

The script tries: git pull → curl → wget, in that order.

## Skills

| Skill | Trigger | Description |
|-------|---------|-------------|
| `geo-audit` | GEO audit, AI SEO, AI visibility, AI citation, 生成式引擎优化 | Full GEO diagnostic across structure, authority, presence, and technical access |

## Context File Convention

This skill reads `.agents/geo-audit-context.md` from the **user's project root** (not the skill directory).

- If the file exists → load it before running the audit
- If not → the skill will collect the required inputs interactively
- Never write user site context back into the skill installation directory

## Tools

All tools are zero-dependency Node.js scripts (requires Node ≥ 18).

```bash
# Full audit (HTML dashboard + inline summary)
node tools/audit.js https://example.com --html --brand "Brand"

# Full audit (Markdown output)
node tools/audit.js https://example.com

# Full audit (JSON output for programmatic use)
node tools/audit.js https://example.com --json

# Individual tools
node tools/sitemap-checker.js https://example.com
node tools/robots-checker.js https://example.com
node tools/llms-txt-checker.js https://example.com
node tools/schema-inspector.js https://example.com
node tools/content-structure.js https://example.com
```

## Security Boundaries

- Only diagnoses publicly accessible URLs provided by the user
- Does not scan localhost, private IPs, or internal networks
- Does not bypass authentication or scrape paywalled content
- Does not make high-frequency requests (one fetch per check)
- Third-party presence checks require user-provided evidence

## References

- `skills/geo-audit/references/structure.md` — Content structure module
- `skills/geo-audit/references/authority.md` — Authority building module
- `skills/geo-audit/references/presence.md` — Third-party presence module
- `skills/geo-audit/references/monitor.md` — Monitoring & review module
- `skills/geo-audit/references/platforms.md` — Platform strategies with confidence levels
- `skills/geo-audit/references/scoring.md` — Scoring model documentation
