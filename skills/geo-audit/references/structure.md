# Structure Extractability Reference

AI systems cite content they can parse cleanly. This module covers the structural
signals that make content extractable by LLMs.

## Why structure matters

AI models don't read pages — they extract passages. A page gets cited when the
model can isolate a self-contained, authoritative answer from it. Poor structure
means good content gets ignored, even if it ranks well in traditional search.

## Heading Hierarchy (H1–H3)

**What to check:**
- Exactly one `<h1>` per page (the page title)
- Multiple `<h2>` that each introduce a distinct topic
- `<h3>` for sub-points within H2 sections
- No skipped levels (H1 → H3 without H2)

**Why it matters:** AI systems use heading structure to understand page sections.
A heading like "What is X?" signals a directly quotable answer block below it.

**Fix:** Restructure so each major question or topic gets its own H2. Write H2s
as questions or clear topic labels, not marketing phrases.

## FAQ and Q&A Blocks

**What to check:**
- `FAQPage` JSON-LD schema present
- `<details>/<summary>` pattern used for Q&A
- FAQ section with `class="faq"` or similar

**Why it matters:** FAQPage schema is one of the most reliable signals for AI
citation. Google AI Overviews, ChatGPT Search, and Perplexity all heavily weight
structured Q&A for featured answers.

**Fix:** Add FAQPage schema to any page with Q&A content. Use `tools/templates/faq-schema.json`
as a starting point. Write answers that are self-contained — they should make
sense without reading the question.

## Tables and Lists

**What to check:**
- Comparison tables for product features or pricing
- Ordered lists for step-by-step processes
- Unordered lists for feature sets, benefits

**Why it matters:** Tables and lists signal structured data. AI systems extract
them as discrete, citable facts rather than prose summaries.

**Fix:** Convert paragraph-format comparisons and feature lists into tables.
Use ordered lists (`<ol>`) for any sequence that has a clear order.

## Paragraph Independence

**Heuristic — confidence: low to medium**

Each paragraph should ideally answer a single, implicit question. A reader
(or AI) should be able to extract any paragraph without losing meaning.

**Signals (from `content-structure.js`):**
- Avg words per paragraph: 40–200 is optimal (too short = fragments, too long = walls)
- Question sentence count: indicates Q&A orientation
- Definition sentences ("X is...", "X refers to..."): quotable by AI

**Fix:** Break long paragraphs into focused units. Start paragraphs with the
conclusion, not the context. Avoid burying the key fact in sentence 4.

## Canonical URL

**What to check:** `<link rel="canonical" href="...">` present on every page

**Why it matters:** Duplicate content confuses AI systems about which URL to
cite. Canonical ensures citation credit goes to the right page.

**Fix:** Add canonical tags. For paginated content, canonical to the first page
unless each page has unique, substantial content.

## Scoring contribution (out of 30)

| Signal | Points |
|--------|--------|
| Proper H1–H3 hierarchy | 0–8 |
| FAQ schema or Q&A structure | 0–8 |
| Tables + lists count | 0–6 |
| Paragraph independence (heuristic) | 0–5 |
| Canonical present | 0–3 |
