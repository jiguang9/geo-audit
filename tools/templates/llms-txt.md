# {Site Name}
> {One or two sentences describing what this site is and who it's for.}

## {Section: e.g. Docs, Blog, API, Products}

- [{Page Title}]({https://example.com/page}): {One-line description of what the page covers}
- [{Page Title}]({https://example.com/page-2}): {One-line description}

## {Section: e.g. About}

- [{About Us}]({https://example.com/about}): {Company background and mission}

## Optional: llms-full.txt

> Create /llms-full.txt as a more detailed companion file for AI systems
> that can process longer context. Include full page descriptions, key
> statistics, and complete product/feature lists.

---

**Field reference**

| Field | Required | Description |
|-------|----------|-------------|
| `# Title` | Yes | Site name (H1) |
| `> Description` | Yes | 1–2 sentence site summary (blockquote) |
| `## Section` | No | Category heading for related links |
| `- [Title](url): desc` | No | Individual page link with description |

**Placement:** Put `llms.txt` at your domain root: `https://yourdomain.com/llms.txt`

**Notes**
- Keep descriptions factual and concise — AI systems parse these literally
- Prioritise your most informative, authoritative pages
- Update whenever major pages are added or removed
- For Chinese sites: content in Chinese is fully valid
