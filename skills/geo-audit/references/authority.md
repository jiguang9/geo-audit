# Authority and Credibility Reference

AI systems favour content from sources they assess as credible. This module
covers the signals that build citation-worthiness.

## External Citations and Data Sources

**What to check:**
- Links to authoritative external sources (studies, statistics, official reports)
- Number of unique external domains linked (aim for 5+)
- Sources are credible (academic, government, industry reports)

**Why it matters:** Pages that cite their sources are more likely to be cited
themselves. AI systems treat outbound links to credible sources as a credibility
proxy — similar to academic citation logic.

**Fix:** Support every key claim with a linked source. Prefer official statistics
over secondary summaries. For China-specific content, link to 国家统计局, 工信部
reports, or peer-reviewed Chinese academic papers (CNKI).

## Author Attribution

**What to check:**
- Author name visible on the page
- Author bio or credentials linked
- `"author"` field in Article JSON-LD schema
- `rel="author"` link

**Why it matters:** Named, credentialed authors increase E-E-A-T (Experience,
Expertise, Authoritativeness, Trustworthiness) — the framework Google and many
AI systems use to assess content quality.

**Fix:** Add visible author bylines with a short bio (title, relevant credentials,
link to profile). For company blogs, name the actual author rather than using
a generic "Team" byline.

## Publication and Modification Dates

**What to check:**
- `<time datetime="...">` tag present
- `"datePublished"` in JSON-LD schema
- `"dateModified"` in JSON-LD schema
- Visible date on the page (not just in schema)

**Why it matters:** Perplexity and ChatGPT Search strongly favour recent content.
A missing date signals staleness. A modified date tells AI systems the content
is actively maintained.

**Fix:** Add publish dates to all articles and guides. Update `dateModified`
whenever content is meaningfully revised. Show dates visibly on the page —
not just in metadata.

## Original Research and Statistics

**What to check (user-provided evidence):**
- Does this site publish original surveys, datasets, or analyses?
- Are there proprietary statistics that other sites link to?

**Why it matters:** Content with original data gets cited as a primary source.
If you publish a "State of X" report or original survey, AI systems treat you
as a reference — not just a commentator.

**Fix:** Invest in at least one original research piece per quarter. Even a
100-respondent survey can generate citable statistics. Publish findings with
clear methodology.

## Schema Authority Signals

**What to check:**
- `Article` schema with author, date, publisher
- `Organization` schema with name, url, logo, sameAs (Wikipedia, LinkedIn, etc.)
- `WebSite` schema with search action

**Fix:** Add `Organization` schema to your homepage. Populate `sameAs` with
links to your Wikipedia entry, LinkedIn page, and Wikidata entity. This helps
AI systems resolve your brand as a known entity.

## Scoring contribution (out of 25)

| Signal | Points |
|--------|--------|
| External citations (unique domains linked) | 0–8 |
| Author attribution | 0–6 |
| Publication + modification dates | 0–6 |
| Schema authority signals | 0–5 |
| Original research / statistics | 0–5 (user evidence) |
