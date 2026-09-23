---
name: report-construction
description: Builds a new Insights Hub report end to end, covering scaffolding, HTML in house style, chart JSON, report.json metadata, code links and validation. Use when someone asks to create, draft, or add a report or article to this repo, or to turn analysis results into a publishable report.
---

# Report construction

Build a new report in `reports/<id>/` that looks and reads like the rest of the Insights Hub, passes CI and appears correctly in the catalog.

Before writing, read these:
- `shared/brand/BRAND.md`: voice, anatomy, chart and number rules. It is the source of truth.
- `shared/templates/report-starter/index.html` and `report.json`: the skeleton you will fill.
- `reports/month-3-member-churn/index.html`: the reference for tone and density.
- `site.config.json`: the valid `areas`.
- `docs/SAMPLE-CONTENT-BIBLE.md`: company facts. New numbers must be consistent with them (for example ~480k Pine+ members, AOV ≈ $142, 4 FCs).

## 1. Gather inputs

Get these from the user (or the analysis they share) before scaffolding. Ask only for what's missing:
- **The finding.** One sentence, with a number and a comparison. This becomes the headline.
- **Area:** one of `Customer & Growth`, `Product & Digital`, `Operations & Supply Chain`, `Marketing`, `Finance & Pricing`, `People & Workplace`, `Methods & Standards`.
- **Type:** `report` (an analysis with recommendations) or `article` (methods, glossary, playbook).
- **Owner(s):** name, email, role (see the team table in `docs/SAMPLE-CONTENT-BIBLE.md`).
- The data, the period ("data through" date), the population and n, the method, and the limitations.
- Code paths in the `insights-analysis` repo.

## 2. Scaffold

Choose a kebab-case id that describes the subject, not the finding: `returns-root-cause-analysis`, `peak-2026-capacity-plan`. Check it isn't taken with `ls reports/`.

```bash
npm run new -- <id> --title "Headline that states the finding" --area "Marketing" --owner "Lena Kowalski <lena.kowalski@parcelandpine.com>"
# add --type article for articles
```

This copies the starter into `reports/<id>/` and sets the id, title, area, owner, dates (today) and `status: "draft"`. It does **not** update any of these, so fix them by hand:
- The brand line `Report · January 2026` (use the publication month; `Article · …` for articles).
- The byline dates `Published <b>…</b>` and `Data through <b>…</b>` (format `Sep 15, 2026`).
- The `<title>` suffix, which stays `— Parcel &amp; Pine Insights`.
- `owners[0].role` in `report.json`, which is set to `"Author"`. Replace it with their real role.
- The placeholder `code`, `data_sources`, `key_findings`, `summary`, `topics` and `tags`.

## 3. Write the HTML

Keep the template's structure and classes (full details in `BRAND.md` section 2). The order:

1. `header.pp-masthead`: `.pp-brandline`, `.pp-eyebrow` (area; escape `&` as `&amp;`), `h1`, `p.pp-subtitle`, `.pp-byline`.
2. `section.pp-tldr` with `<h2>The short version</h2>` and an `ol` of 3–5 `li`. Each starts with `<strong>Finding sentence.</strong>` followed by the evidence. The last `li` is the recommendation, with owners in `<em>`.
3. `div.pp-kpis` with 3–4 `div.pp-kpi` tiles (`.pp-kpi-label`, `.pp-kpi-value`, `.pp-kpi-delta`). Add `up`/`down` for direction (green ▲ / red ▼ by default). Add `bad` or `good` when direction and good/bad disagree, e.g. `up bad` for rising churn.
4. Sections: `<h2><span class="pp-num">01</span>Finding as a sentence</h2>`, then `p.pp-lede`, then the evidence.
5. Figures: `figure.pp-figure` > `p.pp-fig-title` + `p.pp-fig-sub` + `div.pp-chart` + `figcaption` (source).
6. Tables: `div.pp-table-wrap` > `table.pp-table` with `<caption>`, `th.num`/`td.num`, `tr.total`, and `span.pp-badge good|warn|bad` for status.
7. Callouts, at most one per section: `div.pp-callout insight|caveat|recommendation` > `div.pp-callout-title` + `p`.
8. Quotes (research): `blockquote.pp-quote` with a `cite`.
9. Recommendations: `ol.pp-recs` > `li` with `<strong>Action.</strong>`, why and impact, then `<span class="pp-owner">Owner: X · By: Oct 20, 2026</span>`.
10. `section.pp-method` > `dl` with `dt`/`dd` for Population, Period or Definitions, Method, Limitations.
11. `div.pp-footnotes` if needed. Keep the template's `footer.pp-footer` and the `<script src="../../shared/brand/charts.js">` at the end of the body.

Rules the validator enforces or that break Pages:
- Use **relative paths only** (`../../shared/brand/report.css`). A root-absolute `href="/..."` fails CI.
- Keep a non-empty `<title>`.
- Put images and CSVs next to `index.html` in the report folder and link them relatively.

## 4. Charts

A chart is JSON in a `<script type="application/json">` inside `div.pp-chart`. Options are listed in the header of `shared/brand/charts.js`:

| key | values |
|---|---|
| `type` | `column` · `bar` (horizontal, long labels) · `line` · `stacked` · `stacked-bar` |
| `categories` | x labels (or y for `bar`) |
| `series` | `[{ "name": "...", "values": [...] }]`. The number of values must equal the number of categories (CI checks). Use `null` for gaps. |
| `format` | `num` · `int` · `dec1` · `pct` · `pct1` · `pp` · `usd` · `usd2` · `x` · `min` · `days` · `hrs` · or `{ "prefix", "suffix", "decimals", "compact" }` |
| `highlight` | `["Category"]`. Single-series only. Mutes the others. |
| `ref` | `{ "value": 95, "label": "Target 95%" }`, a dashed reference line |
| `yMin` / `yMax` | `line` only for a non-zero `yMin`. Use `yMax: 100` for 100% stacks. |
| `labels` | on by default for single series with 12 or fewer categories; `false` to hide |
| `height`, `yLabel`, `directLabels` | rarely needed |

Values are in display units: `pct` expects `18.6`, not `0.186`.

```html
<figure class="pp-figure">
  <p class="pp-fig-title">Dallas misses its delivery promise twice as often as any other FC</p>
  <p class="pp-fig-sub">Parcel orders · % delivered after promised date · Jun–Aug 2026 · n = 1.9M</p>
  <div class="pp-chart">
    <script type="application/json">
    { "type": "bar", "format": "pct1", "highlight": ["Dallas TX"], "ref": { "value": 5, "label": "SLA 5%" },
      "categories": ["Dallas TX", "Reno NV", "Columbus OH", "Allentown PA"],
      "series": [{ "name": "Late deliveries", "values": [9.8, 4.6, 4.1, 3.9] }] }
    </script>
  </div>
  <figcaption>Source: dw.fct_shipments, dw.dim_fc. Excludes big &amp; bulky (white-glove) orders.</figcaption>
</figure>
```

Follow the chart rules in `BRAND.md` section 5: the title states the takeaway, one highlight, one y-axis, fixed palette order, bars start at zero, no pies, and a source under every chart. The data table is generated automatically from the JSON.

## 5. report.json

Fields and their constraints are in `docs/PLAN.md` ("Report metadata"). To generate or improve the metadata, follow `.claude/skills/report-metadata/SKILL.md`. In short:

- `title` is identical to the `h1`. `subtitle` is identical to `.pp-subtitle`.
- `summary` is 1–3 sentences a VP could forward unedited, with the key number and the recommendation.
- `key_findings` are 3–5 standalone, quantified sentences taken from the short version. Every number must appear in the HTML.
- **Topics** (Title Case, 2–4) and **tags** (kebab-case, 4–8): reuse existing ones first. List what already exists with:

  ```bash
  node -e 'const c=require("./catalog.json");const t={},g={};c.reports.forEach(r=>{r.topics.forEach(x=>t[x]=(t[x]||0)+1);r.tags.forEach(x=>g[x]=(g[x]||0)+1)});console.log(t);console.log(g)'
  ```

  Add a new topic only when none fits and it would plausibly hold other reports later. Tags can be more specific (`dallas-fc`, `black-friday`), but reuse spelling variants that already exist (for example `ab-test` rather than a new `a-b-test`).
- `code`: `[{ "label": "Cohort build (SQL)", "path": "analyses/2026-09-<project>/01_cohort_build.sql" }]`. Paths are relative to `teamRepo` in `site.config.json` (the `insights-analysis` repo). Order them as the pipeline runs and label them by what they do.
- `data_sources`: warehouse tables (`dw.fct_orders`) and named external sources ("Qualtrics — Pine+ cancel flow survey").
- `related`: 2–4 existing ids chosen by shared topics or tags, or by a report this one cites.
- `status`: `draft` while in review, `final` when merged for publication. Never set `ai_summary` by hand.

## 6. Validate and preview

```bash
node scripts/validate.mjs <id>   # this report only: schema, dates, chart JSON lengths, links
npm run check                    # validate everything + rebuild catalog.json, search-index.json, feed.xml
npm run serve                    # then open:
#   http://localhost:8000/reports/<id>/           the report on its own
#   http://localhost:8000/report.html?id=<id>     inside the hub viewer (metadata rail, code links)
#   http://localhost:8000/                        check the card and the search result
```

Fix every `✖` error. Treat `⚠` warnings (non-kebab tags, unknown related ids, a long summary) as errors unless there is a reason. In the preview, check that each chart renders, that the "View data table" disclosure appears, and that the page prints cleanly (Ctrl/Cmd+P).

Before handing off, run the review skills: `storytelling-review`, `visualization-review`, `brand-style`.

## Pre-PR checklist

- [ ] The folder name equals `report.json` `id`, and it is kebab-case.
- [ ] The `h1` equals `title` and states a finding with a number. `<title>` matches.
- [ ] The brand line month, the byline `Published` and `Data through` dates are real, formatted `Sep 15, 2026`.
- [ ] The short version has 3–5 items and ends with a recommendation that names an owner.
- [ ] 3–4 KPI tiles, each delta with a comparison. `up`/`down` are used only where direction and valence agree.
- [ ] Every `h2` has a `pp-num` and reads as a finding. Read in sequence, the `h2`s tell the story.
- [ ] Every figure has a takeaway title, a subtitle with units and n, and a source `figcaption`.
- [ ] Numbers in the prose, KPIs, tables and chart JSON agree exactly.
- [ ] Each recommendation has `pp-owner` with an owner and a date.
- [ ] The methodology covers population, period, method and limitations.
- [ ] `report.json`: summary of 3 sentences or fewer, 3–5 quantified key findings, reused topics and tags, `code` paths into `insights-analysis`, `related` ids that exist, a real role for each owner.
- [ ] Only relative links. No hard-coded colours. No pie charts.
- [ ] `npm run check` passes with 0 errors, and the report renders in `report.html?id=<id>`.
