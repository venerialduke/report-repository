# Parcel & Pine Insights: brand and style guide

This is how an Insights report should read and look. It covers voice, structure, type, colour, charts, numbers and accessibility. Everything here is already built into `shared/brand/report.css`, `shared/brand/charts.js` and the starter template in `shared/templates/report-starter/`. If you use those, most of this guide happens by default. The guide covers the choices the tools can't make for you.

Good examples to copy: `reports/month-3-member-churn/`, `reports/checkout-redesign-ab-test/`, `reports/last-mile-delivery-sla-review/`.

---

## 1. Voice and tone

We write for a busy VP who reads the headline, the short version and one chart, then decides what to do. Every other reader gets the same material in more depth.

**Principles**

1. **Plain and direct.** Short sentences. One idea each. If a sentence needs a semicolon, it is probably two sentences.
2. **The headline is the finding.** Titles, section headers and chart titles all say what we found, not what we looked at.
3. **Active voice, named actors.** "The Retention squad will test…", not "It is recommended that a test be conducted…".
4. **Every number gets a comparison.** A number alone means nothing to the reader. Compare it with last year, the plan, a control group, another segment, or the business as a whole.
5. **Say how sure we are, once, in the right place.** State confidence plainly ("95% CI 7.7–11.9 pp", "directional only, n = 180"). Don't spread hedges like "may", "might" and "potentially" through every sentence.
6. **"We" for the Insights team.** Name other teams: "Membership product", "FP&A", "Pine Fleet ops".

| Don't | Do |
|---|---|
| Analysis of member churn by tenure | Monthly Pine+ members churn twice as fast in month 3 |
| Conversion was 3.59%. | Conversion rose to 3.59% from 3.40% in control (+5.6%). |
| It was observed that there may potentially be an uplift. | The new checkout lifted conversion by 5.6% (95% CI 2.9–8.3%). |
| Leverage synergies to optimise the funnel. | Remove the second address step; it is where 40% of drop-off happens. |
| Further analysis is recommended. | Jonah Feld will add the metric to the weekly dashboard by Oct 9, 2026. |
| Interestingly, the data suggests… | (Delete it. Just state the finding.) |

---

## 2. Report anatomy

Every report follows the same order, so readers always know where to look. The starter template has all of these blocks with the right classes.

| # | Block | Markup | What goes in it |
|---|---|---|---|
| 1 | **Masthead** | `header.pp-masthead` | Brand line (`Report · September 2026`), eyebrow = area, `h1` headline-as-finding, `p.pp-subtitle` (one sentence: why it matters or what to do), byline with author, `Published`, and `Data through`. |
| 2 | **The short version** | `section.pp-tldr` > `ol` | 3–5 items. Each opens with a bold finding sentence, then the evidence. The last item is the recommendation with owners. A reader who stops here should still know what to do. |
| 3 | **KPI tiles** | `div.pp-kpis` > `div.pp-kpi` | 3–4 tiles: label, value, delta with its comparison. One tile can give the sample size or population. |
| 4 | **Numbered sections** | `h2` with `span.pp-num` (`01`, `02`…) | The header is a finding. Open with `p.pp-lede`, the takeaway in 1–2 sentences, then the evidence: figures, tables, callouts. |
| 5 | **Recommendations** | `ol.pp-recs` | A bold action, then why and the expected impact, then `span.pp-owner` with `Owner: <team or person> · By: <date>`. |
| 6 | **Methodology** | `section.pp-method` > `dl` | Population, Period, Definitions, Method, Limitations. Plain language first, technical detail after. |
| 7 | Footnotes, footer | `div.pp-footnotes`, `footer.pp-footer` | Keep the footer from the template. |

**Articles** (`type: "article"`: methods, glossaries, playbooks) use the same shell. They may skip KPI tiles and recommendations, but they still lead with a short version.

**Callouts.** Use them sparingly, no more than one per section:

- `pp-callout insight` for the "so what" of a section.
- `pp-callout caveat` for the limitation a reader must not miss at that point.
- `pp-callout recommendation` for a recommendation that belongs inline (articles especially).

**Section headers read as a storyline.** Read only the `h2`s in order. They should tell the whole argument:

> 01 Monthly members leave in a sharp spike at month 3, not gradually
> 02 Annual members don't have a month-3 problem
> 03 Promo-driven joiners are the most fragile
> 04 A third order within 60 days is the clearest early signal of who stays
> 05 Recommendations

Not: "01 Background · 02 Data · 03 Results · 04 Discussion".

**Recommendations need an owner and a date.** "Owner: Retention squad with CRM · Launch by: Oct 20, 2026". If there is no date yet, give the decision point instead ("Before: Black Friday 2026 member campaign"). "Owner: TBD" is not a recommendation.

---

## 3. Typography

| Role | Font | Token | Notes |
|---|---|---|---|
| Headlines (`h1`, `h2`, pull quotes) | **Newsreader** 500/600 | `--font-display` | Sentence case. No full stop at the end. |
| Body, tables, UI, chart text | **Inter** 400–700 | `--font-sans` | Numbers in tables are right-aligned (`td.num`). |
| Code, table names | System mono | `--font-mono` | `dw.fct_orders`, `analyses/...` paths. |

- **Sentence case everywhere:** headlines, section headers, chart titles, table headers. Proper nouns keep their capitals (Pine+, Pine Fleet, Dallas FC, Black Friday).
- Keep headlines under about 120 characters. If you need more, move the second clause to the subtitle.
- Use `<strong>` for the one phrase per paragraph that carries the finding. Don't bold whole sentences in body text.
- Use `<em>` to introduce a defined term ("the *hazard*") or to name another report.

---

## 4. Colour

Tokens live in `shared/brand/tokens.css`. **Never hard-code hex values in a report.** Use the CSS variables, or leave colour to `charts.js`.

| Token | Hex | Use |
|---|---|---|
| `--brand-pine` | `#1d4a3c` | Primary brand: masthead accents, links, recommendation callouts. |
| `--brand-clay` | `#c8643b` | Accent, used sparingly: pull-quote rule, insight callouts. Never as a series colour. |
| `--brand-sand` | `#f4f1ea` | Warm paper background. |
| `--ink-1/2/3` | `#0f1714` / `#4a524e` / `#7c837f` | Text: primary, secondary, captions. |
| `--series-1..8` | see tokens | Chart series, in fixed order (section 5). |
| `--viz-muted` | `#cfcdc4` | De-emphasised bars when one is highlighted. |
| `--good`, `--warning`, `--serious`, `--critical` | | **Status only.** Badges and KPI deltas. Never used as a series colour. Always paired with an icon or word. |

---

## 5. Chart rules

Charts are declared as JSON inside `<div class="pp-chart">` and drawn by `shared/brand/charts.js` (types `column`, `bar`, `line`, `stacked`, `stacked-bar`). Wrap each one in `figure.pp-figure` with a title, subtitle and source.

```html
<figure class="pp-figure">
  <p class="pp-fig-title">Black Friday promo joiners churn at twice the organic rate in month 3</p>
  <p class="pp-fig-sub">Monthly-plan members · month-3 churn by acquisition channel · dashed line = all (18.6%)</p>
  <div class="pp-chart"><script type="application/json">
  { "type": "bar", "format": "pct1", "highlight": ["Black Friday promo"], "ref": { "value": 18.6 },
    "categories": ["Black Friday promo", "Paid social", "Checkout upsell", "Organic / direct"],
    "series": [{ "name": "Month-3 churn", "values": [26.8, 24.1, 16.4, 11.7] }] }
  </script></div>
  <figcaption>Source: dw.fct_member_status_daily, dw.fct_member_acquisition. Joiners Sep 2025–Mar 2026.</figcaption>
</figure>
```

### The rules

1. **Pick the chart for the job.** Comparing categories: `bar` (long labels, or ranked) or `column` (few, short labels). Change over time: `line` (or `column` for 12 or fewer periods of a single series). Parts of a whole across groups: `stacked-bar` set to 100%. Want exact values? Use a `pp-table` instead of a chart.
2. **Categorical palette in fixed order, never cycled.** Series 1 is always `--series-1`, series 2 is always `--series-2`, and so on. Don't reorder series to get a colour you like, and don't override `color` except to keep one entity the same colour across charts in the same report. **More than 8 series is a design failure:** group the tail into "Other" or split the chart into small multiples.
3. **Highlight one thing, mute the rest.** On a single-series chart, `"highlight": ["Month 3"]` colours the story bar and greys the others (`--viz-muted`). Highlight one bar, or two at most when both are the point. If everything is highlighted, nothing is.
4. **One y-axis. Never dual-axis.** Two measures with different units get two charts side by side, or an indexed line (base = 100).
5. **Two or more series need a legend, plus direct labels where there are 4 or fewer.** `charts.js` adds the legend automatically and direct-labels `line` charts with 2–4 series. For 5 or more series, rely on the legend and reconsider the chart.
6. **The chart title states the takeaway.** `pp-fig-title` is a sentence the reader should believe after looking. Units, population and n go in `pp-fig-sub`.
7. **Every chart has a source line.** `figcaption` names the tables or survey and the period. Put caveats here too ("Axis starts at 40%", "CIs within ±0.5 pp, omitted").
8. **Status colours are reserved.** Green, amber and red mean good, warning and bad in badges and KPI deltas. Don't use them to colour series, and don't imply "good vs bad" with series colours.
9. **No pie charts with more than 3 slices.** `charts.js` has no pie type on purpose. For parts of a whole, use a single `stacked-bar` row or a sorted `bar`.
10. **Bars start at zero.** Only `line` charts may use a non-zero `yMin`, and when they do, say so in the caption.
11. **Sort bars by value** unless the categories have a natural order (tenure months, age bands, days of the week).
12. **Keep it clean.** Values are labelled on single-series charts by default (`labels`), so don't also add gridline-level precision. Use `ref` for a benchmark ("dashed line = target 95%") instead of an extra series.

| Don't | Do |
|---|---|
| Title: "Churn by channel" | Title: "Paid-social joiners churn at twice the organic rate" |
| Revenue ($) and conversion (%) on left and right axes | Two small charts, or index both to 100 |
| 7 coloured bars, all equally loud | 1 highlighted bar, 6 muted |
| Pie with 6 reasons for cancelling | Sorted bar of 6 reasons, top 2 highlighted |
| Red series for "Dallas" because Dallas is late | Default series colour, plus a `pp-badge bad` in the table |
| No source | `Source: dw.fct_shipments, Jun–Aug 2026.` |

---

## 6. Number formatting

| Rule | Example |
|---|---|
| **pp vs %.** Use percentage points (pp) for the difference between two rates. Use % for relative change. When it matters, give both. | Churn fell from 12.0% to 9.0%: **−3.0 pp** (−25%). |
| Thousands separators; no decimals on counts. | 96,400 members |
| Compact large money values. | $1.14B, $0.6M, $142 AOV |
| Significant figures follow precision. Two or three are usually enough. Don't report 18.6392%. | 18.6% · ~3,000 members · about $0.6M |
| Rates: one decimal place when the differences are small, whole numbers when they are large. Be consistent within a chart. | 5.2% vs. 5.6% · 38% vs. 22% |
| **Confidence intervals:** give the interval with its level, in the same unit as the estimate. | +9.8 pp (95% CI 7.7–11.9 pp) |
| Say whether a result is significant in words, not just with p. | +0.9 pts, not significant (p = 0.41) |
| Ranges use an en dash with no spaces. | 15.9–16.9%, Sep 2025–Mar 2026 |
| Negative numbers use a true minus sign (−, `&minus;`). | −8% vs. plan |
| Multipliers use ×. | 2.2× the average |
| Sample sizes are written as `n = 3,412`. | |
| Dates in prose: `Mon D, YYYY`. Months: `Sep 2026`. ISO (`2026-09-15`) only in `report.json`. | Published Sep 15, 2026 |
| Survey scales use "pts" for index or NPS changes. | NPS +3 pts vs. wave 3 |

**KPI deltas.** In `pp-kpi-delta`, `up` draws ▲ and `down` draws ▼. By default `up` is green and `down` is red. When direction and good/bad disagree, add `bad` or `good`: churn rising is `up bad` (red ▲) and cost falling is `down good` (green ▼). Always state the comparison in words too, e.g. `+3.5 pp vs. web`.

---

## 7. Accessibility

- **Every chart already has a data table.** `charts.js` adds a "View data table" disclosure built from the JSON, and the build turns chart data into text for search and AI. So put the real numbers in the JSON. Don't round values in the data to make the chart prettier.
- **Don't use colour alone.** Pair every colour with something else: a label, a legend entry, a badge word (`<span class="pp-badge bad">High</span>`), a ▲/▼ glyph, or a line style. A highlighted bar must also be named in the title or subtitle.
- Write alt text for images. Use `alt=""` for decorative images (such as the logo in the brand line).
- Tables: a `<caption>`, `<th>` headers, `class="num"` on numeric cells, and `tr.total` for totals.
- Link text says where it goes ("see the *metric glossary*"), never "click here".
- Don't put text in images. Screenshots of dashboards need a caption that states the finding.

---

## 8. Tables

Use a table when readers need to look up exact values, or when you have more than three measures per row. Use a chart when the shape is the point. Often you want both: a chart for the story and a table for the detail (see section 03 of `reports/month-3-member-churn/`).

```html
<div class="pp-table-wrap">
  <table class="pp-table">
    <caption>Month-3 churn by acquisition channel, monthly plan</caption>
    <thead><tr><th>Channel</th><th class="num">Joiners</th><th class="num">M3 churn</th><th class="num">95% CI</th></tr></thead>
    <tbody>
      <tr><td>Black Friday promo</td><td class="num">9,899</td><td class="num">26.8% <span class="pp-badge bad">High</span></td><td class="num">25.8–27.8%</td></tr>
      <tr class="total"><td>All monthly joiners</td><td class="num">52,100</td><td class="num">18.6%</td><td class="num">18.2–19.0%</td></tr>
    </tbody>
  </table>
</div>
```

- Keep to about 8 rows and 6 columns. Anything bigger belongs in the linked notebook.
- Sort rows by the measure that matters, or keep a natural order. Put the total last.
- Use the same decimals in every cell of a column. Put units in the header (`AOV ($)`) or in every cell, not a mix.
- Use badges (`pp-badge good|warn|bad`) only for status against a threshold, and always with a word.

---

## 9. Worked example

**Before**

> ## 03 Channel analysis
> We analysed churn across acquisition channels. The results are shown in Figure 3. There appear to be some differences between channels, with promotional channels potentially having higher churn rates, although further analysis may be needed.

**After**

> ## 03 Promo-driven joiners are the most fragile; organic joiners hold up best
> Members who joined in the Black Friday promotion churn at 26.8% in month 3, more than twice the organic rate (11.7%). Paid-social joiners are close behind at 24.1%.

What changed: the header became a finding, the numbers came with a comparison, the reference to "Figure 3" went (the chart sits right below), and so did the three hedges.

---

## 10. Before you publish

- [ ] The headline, subtitle and short version stand alone. A reader who stops there knows what to do.
- [ ] Every `h2` and every chart title is a finding.
- [ ] Every number has a comparison. pp and % are used correctly. CIs are given where we estimated something.
- [ ] Every chart has a subtitle with units and n, a source line, one highlight at most (or none), and one y-axis.
- [ ] Numbers in the text match the chart JSON and tables exactly.
- [ ] Recommendations have an owner and a date.
- [ ] Methodology includes limitations that fit the size of the claim.
- [ ] `npm run check` passes.

---

## 11. Words we use

See `.claude/skills/brand-style/SKILL.md` for the full list. The essentials:

- **Pine+**, exactly: not "Pine Plus", "PinePlus" or "Pine+ Plus". Its people are **members**, not subscribers. "Subscribers" means email-list subscribers only.
- **Customers** are people who bought something in the trailing 12 months (see the *metric glossary*).
- **FC** (fulfilment centre): spell it out on first use. **FC associates**, not workers or pickers.
- **Pine Fleet**, **Pine Points**, **Pine Days**, **big & bulky**.
- Spelling in prose follows the house style: *fulfilment, behaviour, programme, personalisation, utilisation*.
