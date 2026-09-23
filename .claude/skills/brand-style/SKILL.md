---
name: brand-style
description: Copy-edits an Insights report into Parcel & Pine house style, covering voice, number and unit formatting, dates, pp vs %, capitalisation, topics and tags, and the team's preferred words (members, Pine+, FC). Use when asked to proofread, copy-edit, polish or make a report or report.json "on brand".
---

# Brand style and copy-editing

Apply house style to `reports/<id>/index.html` and `reports/<id>/report.json`. This is line-level editing. Don't restructure the argument (that is `storytelling-review`) or redesign charts (that is `visualization-review`). The full guide is `shared/brand/BRAND.md`. Read sections 1, 3, 6 and 11 before editing.

## Procedure

1. Read the whole report, including `report.json`.
2. Run the mechanical checks below and fix what they find.
3. Do a read-through for voice.
4. **Never change a number's value.** Only change how it is written. If two places disagree, flag it and don't guess.
5. Either edit the files in place (the default when asked to "apply" or "fix") or return a change list (when asked to "review"). Then run `node scripts/validate.mjs <id>`.

Quick scans (from the repo root):

```bash
F=reports/<id>/index.html
grep -noiE 'subscriber|pine ?plus|pineplus|pine\+ ?member(ship)?s? plus|warehouse worker|picker|fulfillment|behavior|program\b|utiliz|personaliz' $F
grep -noE '[0-9]+(\.[0-9]+)? ?(percent|per cent)|[0-9] %|[0-9]+(\.[0-9]+)?% points|percentage points' $F
grep -noE '\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* [0-9]{1,2}(st|nd|rd|th)|[0-9]{1,2}/[0-9]{1,2}/[0-9]{2,4}|\b20[0-9]{2}-[0-9]{2}-[0-9]{2}\b|Sept\b' $F
grep -noE ' - |--|[0-9] ?- ?[0-9]' $F   # hyphens that should be en dashes or minus signs
grep -noiE '\b(leverage|utili[sz]e|synerg|going forward|interestingly|it is (recommended|worth noting)|may potentially|could possibly)\b' $F
```

## Voice

- Use active voice with a named actor: "We found…", "Membership product will test…".
- One idea per sentence. Split sentences over ~30 words.
- Lead with the finding, then the evidence. Every number gets a comparison.
- Cut filler: "interestingly", "it is worth noting that", "in order to" (→ "to"), "going forward".
- Hedge once, precisely. Replace "may potentially suggest" with a CI or a single "likely".

## Numbers, units and dates

| Rule | Wrong | Right |
|---|---|---|
| Difference between two rates = **pp** | churn fell 3% (12.0% → 9.0%) | churn fell 3.0 pp (−25%) |
| Relative change = **%** | AOV up 4 pp | AOV up 4% ($142 → $148) |
| No space before %, a space before pp | 18.6 %, 3pp | 18.6%, 3 pp |
| Words for "percent" only in running text if at all; prefer the symbol | 18.6 percent | 18.6% |
| Thousands separators; counts are whole numbers | 96400 members, 3412.0 | 96,400 members, 3,412 |
| Compact currency ≥ $10k | $600,000 a year | $0.6M a year |
| Significant figures match precision | 18.6392% | 18.6% |
| CIs: give the level, the same unit, an en dash | CI: 7.7-11.9 | 95% CI 7.7–11.9 pp |
| Ranges: en dash, no spaces | 15.9 - 16.9%, Sep 2025 - Mar 2026 | 15.9–16.9%, Sep 2025–Mar 2026 |
| Negatives: minus sign `−` (`&minus;`) | -8% vs plan | −8% vs. plan |
| Multipliers: × | 2.2x | 2.2× |
| Sample size | N=3412, (n:3412) | n = 3,412 |
| Dates in prose: `Mon D, YYYY`, 3-letter month | 15th September 2026, 9/15/26, Sept 15 | Sep 15, 2026 |
| Months and periods | September '26, Q3-26 | Sep 2026, Q3 2026, H1 2026 |
| ISO dates only in `report.json` | Published 2026-09-15 | Published Sep 15, 2026 |
| Survey and index changes | NPS up 3% | NPS +3 pts |
| Money | 59 dollars, $59.00/year | $59 a year, $6.99 a month |
| Time | 2.5hrs, 35 mins | 2.5 h, 35 min (in tables and charts); "35 minutes" in prose |

Numbers from one to nine are written as words in running prose when they are not measurements ("three orders", "four FCs"). Use digits for measurements, money, percentages and anything in a table.

## Capitalisation and naming

- **Sentence case** for the `h1`, `h2`, chart titles, table headers, callout titles and KPI labels. Keep capitals for proper nouns: Pine+, Pine Fleet, Pine Points, Pine Days, Black Friday, Cyber Week, Dallas FC, Denver HQ.
- **Areas** are written exactly as in `site.config.json`: `Customer & Growth`, `Product & Digital`, `Operations & Supply Chain`, `Marketing`, `Finance & Pricing`, `People & Workplace`, `Methods & Standards`. In HTML, `&` is `&amp;`.
- **Topics** (`report.json`) are Title Case and reuse existing values: `Retention`, `Membership`, `Customer Behaviour`, `Experimentation`, `Fulfilment`, `Delivery`, `Survey Research`. Keep British spellings where they exist in the catalog (`Behaviour`, `Personalisation`).
- **Tags** are lowercase kebab-case: `pine-plus`, `ab-test`, `last-mile`, `black-friday`. No spaces, capitals or underscores. The validator warns on these.
- **Team names** are capitalised as proper nouns only when they are the team's name: "the Retention squad", "Membership product", "FP&A", "Growth marketing".
- **Data tables** go in `<code>` or plain monospace in captions, exactly as named: `dw.fct_orders`.

## Words and phrases

| Use | Not | Notes |
|---|---|---|
| **Pine+** | Pine Plus, PinePlus, Pine+ Plus, P+ | Always exactly `Pine+`. In a kebab-case tag: `pine-plus` |
| **members** (Pine+) | subscribers, users, loyalty customers | "Subscribers" only for email-list subscribers |
| **customers** | users, shoppers, buyers | Active customer = purchased in the trailing 12 months (metric glossary) |
| **monthly plan / annual plan** | monthly subscription, yearly tier | |
| **churn** (noun), **cancel** (member action) | attrition (for members), unsubscribe | "Attrition" is for employees (`fc-associate-attrition`) |
| **FC** / fulfilment centre | warehouse, DC, distribution center | Spell out on first use: "fulfilment centre (FC)" |
| **FC associates** | workers, pickers, warehouse staff | |
| **Pine Fleet** | our trucks, in-house fleet | The in-house last-mile network in 6 metros |
| **carrier partners** | 3PLs, vendors | |
| **big & bulky**, **white-glove** | large items, oversized | |
| **Pine Points** | rewards, points, cashback | |
| **Pine Days** | summer sale, Prime Day | |
| **AOV** | basket size (when meaning $) | Define on first use: "average order value (AOV)" |
| **conversion** | CVR, conv. | CVR is fine in tables once defined |
| **test**, **experiment** | A/B (as a noun) | Tag: `ab-test` |
| **uplift** or **lift** | improvement, bump | Pick one per report |
| **statistically significant** | stat sig, sig. | Better still, give the CI |
| **we recommend** | it is recommended, we suggest considering | |
| **use** | leverage, utilise | |
| **about**, **~** (in tables) | approximately, circa, c. | |
| **vs.** (with the full stop) | versus, v., vs | House standard in prose, KPI deltas and key findings |
| **fulfilment, behaviour, programme, personalisation, utilisation, colour, centre** | fulfillment, behavior, program, personalization, utilization, color, center | House spelling in prose. Leave ids, file names and code as they are (for example `hybrid-office-utilization`) |

## report.json copy

- `title` exactly equals the `h1`, and `subtitle` exactly equals `.pp-subtitle`.
- `summary` is 3 sentences or fewer, uses the same numbers as the report, and has no Markdown or HTML.
- `key_findings` are sentences with the same formatting rules (pp, en dashes, `vs.`). Straight quotes inside JSON strings must be escaped, so prefer typographic quotes (“ ”, ’).
- `owners[].role` is the person's real title from `docs/SAMPLE-CONTENT-BIBLE.md`.

## HTML typography

- Use typographic quotes and apostrophes (“ ” ’) in prose. Use `&amp;` for `&`.
- Em dash `—` without surrounding spaces is not house style. Use ` — ` sparingly, and prefer a full stop.
- Units in table headers (`AOV ($)`) or in every cell, not a mix.
- Don't bold whole sentences in body text. Bold is for the lead sentence of short-version items and recommendations.

## Output when reviewing (not applying)

```markdown
## Brand style review: <id>
**Summary:** <n> edits · <n> number-format · <n> word-list · <n> voice · <n> metadata

| # | Where | Current | Change to | Rule |
|---|---|---|---|---|
| 1 | §02 para 1 | "subscribers who cancel" | "members who cancel" | Words: members |
| 2 | KPI tile 1 | "-3%" | "−3.0 pp" | pp vs %, minus sign |
```

Group repeated issues ("'Pine Plus' ×4: §01, §03, Rec 2, report.json summary") instead of listing each occurrence.
