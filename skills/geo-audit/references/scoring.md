# Scoring Model Reference

Documents the GEO Score calculation logic. See `tools/score.js` for implementation.

## Dimensions and Weights

| Dimension | Weight | Source |
|-----------|--------|--------|
| Structure extractability | 30 | Automated (schema-inspector + content-structure) |
| Authority / credibility | 25 | Automated + user evidence |
| Third-party presence | 25 | Evidence-based only |
| Technical accessibility | 20 | Automated (robots-checker + llms-txt-checker + schema-inspector) |
| **Total** | **100** | |

---

## Structure Extractability (30 pts)

| Sub-signal | Max pts | Logic |
|------------|---------|-------|
| H1–H3 hierarchy | 8 | H1=1: +4, H2≥2: +2, H3≥1: +2 |
| FAQ schema or Q&A | 8 | FAQPage schema: 8, FAQ class/details: 4, Q-sentences≥3: 2 |
| Tables and lists | 6 | min(6, tables×2 + OL + UL) |
| Paragraph independence | 5 | Heuristic: self-contained paras +3, rich Q&A +2 |
| Canonical URL | 3 | Present: 3, absent: 0 |

**Heuristic note:** Paragraph independence is a `low`–`medium` confidence
heuristic from `content-structure.js`. It is based on observable signals
(paragraph length, question density, structural elements), not semantic
understanding. Treat as indicative, not definitive.

---

## Authority / Credibility (25 pts)

| Sub-signal | Max pts | Logic |
|------------|---------|-------|
| External citations | 8 | ≥10 domains: 8, ≥5: 5, ≥2: 3, <2: 0 |
| Author attribution | 6 | Detected: 6, absent: 0 |
| Publication + modified dates | 6 | Both: 6, publish only: 3, neither: 0 |
| Schema authority signals | 5 | min(5, count of Article/Organization/WebSite × 2) |
| Original research | 5 | User confirms: 5, not confirmed: 0 |

---

## Third-Party Presence (25 pts)

**This dimension is evidence-based only.** Do not estimate or assume.
If the user provides no evidence, set `raw = null` and mark as `unknown`.

| Sub-signal | Max pts | Logic |
|------------|---------|-------|
| Wikipedia + Baidu Baike | 8 | Wikipedia EN: +4, Baidu Baike: +2, Wikipedia ZH: +2 |
| Review / comparison platforms | 7 | min(7, count × 2) |
| Media and industry mentions | 6 | min(6, count × 2) |
| Social / brand entity coverage | 4 | min(4, count) |

When presence is `unknown`, the total score is computed over 75 (known
dimensions only) and displayed as `XX/75 (presence unknown)`. The level
is calculated from the 75-point scale proportionally.

---

## Technical Accessibility (20 pts)

| Sub-signal | Max pts | Logic |
|------------|---------|-------|
| robots.txt AI crawler access | 8 | 0 blocked: 8, ≤2 blocked: 5, more: max(0, 8 - blocked×2) |
| llms.txt present + valid | 4 | llms.txt + valid: 3, exists but invalid: 1, llms-full.txt: +1 |
| JSON-LD Schema blocks | 5 | min(5, count × 2) |
| Meta completeness | 3 | title: +1, description: +1, canonical: +1 |

**llms.txt note:** Absence of llms.txt does **not** reduce the score.
It is a bonus signal only. Many major AI platforms do not yet require it.

---

## Maturity Levels

Levels are calibrated on the full 100-point scale. When presence is unknown,
scale the 75-point known total proportionally before determining level.

| Level | Score (100-pt) | Description |
|-------|----------------|-------------|
| 1 | 0–20 | AI crawlers blocked or page unreachable |
| 2 | 21–40 | Reachable but structurally poor, rarely cited |
| 3 | 41–60 | Basic GEO in place, occasional citations |
| 4 | 61–80 | Strong structure + authority, regular citations |
| 5 | 81–100 | Full GEO optimisation, high-frequency citation |

---

## Veto Gate and Overall Verdict

The four-dimension score is a sum, but a high structure/authority score is
meaningless if AI systems cannot fetch the page at all. To prevent a misleadingly
high total, `computeGeoScore` applies **hard veto conditions** and emits a
top-line **verdict** (see `tools/score.js`).

### Veto conditions

| Code | Dimension | Trigger |
|------|-----------|---------|
| `V-ACCESS` | Technical | An AI/search crawler is blocked at high citation risk (`citationRisk === 'high'`), **or** the target page is unreachable / unparseable (`schemaResult.error`) |

When any veto is active, the **normalised score is capped at 40** (level ≤ 2),
no matter how strong the other dimensions are. The uncapped value is preserved as
`rawTotal`, and `capped: true` is set so the report can show
`（原始分 X，因否决项封顶至 Y）`. Presence-unknown scoring (the /75 denominator)
is respected — the cap is computed from `totalMax`.

`V-ACCESS` overlaps with the `T-ACCESS` failure diagnostic code, but the two serve
different roles: `T-ACCESS` explains the fix, `V-ACCESS` enforces the score cap and
the verdict.

### Verdict

| Verdict | Symbol | Condition |
|---------|--------|-----------|
| `block` | 🔴 被阻断 / Blocked | Any veto is active — AI cannot fetch or cite the page right now |
| `ship` | 🟢 可引用 / Citable | No veto, normalised ≥ 61 (level ≥ 4), and technical raw ≥ 8 |
| `fix` | 🟡 需修复 / Needs work | Reachable, but not yet strong enough to be reliably cited |

The verdict is derived only from dimension scores and tool results that
`score.js` already receives, so it does not depend on report-layer diagnostics.
It renders as a badge at the top of the report, above the narrative and score table.

---

## Score Interpretation Notes

- A score of 60+ on technical + structure alone (without presence data) suggests
  the on-page work is solid; presence is the remaining gap.
- A score below 30 on technical accessibility usually means crawlers are blocked
  or the page is unreachable — fix this before all other work.
- Authority scores below 10 usually indicate missing authorship and dates —
  quick fixes with high ROI.
- Presence scores are almost always the hardest to improve; they require
  months of content and relationship work.
