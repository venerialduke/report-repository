---
name: visualization-review
description: Reviews a report's charts and tables against the BRAND.md chart rules (chart choice, takeaway titles, highlight, axes, formats, palette, legends, prose-vs-data) and returns per-figure findings with fixed chart JSON. Use when asked to review or fix a report's charts, figures or tables.
---

# Visualization review

Review the figures in `reports/<id>/index.html`: the `figure.pp-figure` blocks with a `div.pp-chart` (JSON rendered by `shared/brand/charts.js`) and the `table.pp-table` blocks. The rules come from `shared/brand/BRAND.md` section 5 (charts), section 6 (numbers), section 7 (accessibility) and section 8 (tables). The chart options available are listed in the header comment of `shared/brand/charts.js`.

Don't review the narrative. That is `storytelling-review`. You do own whether **the numbers in the prose match the chart data**.

## Procedure

### 1. Dump every figure

Run this from the repo root. It prints each figure's title, subtitle, source, options and data:

```bash
node --input-type=module -e '
import fs from "node:fs"; import { chartBlocks } from "./scripts/lib/common.mjs";
const id = process.argv[1]; const html = fs.readFileSync(`reports/${id}/index.html`, "utf8");
const figs = [...html.matchAll(/<figure class="pp-figure">([\s\S]*?)<\/figure>/g)].map(m => m[1]);
figs.forEach((f, i) => {
  const t = (f.match(/pp-fig-title">([^<]*)/) || [])[1], s = (f.match(/pp-fig-sub">([^<]*)/) || [])[1], cap = (f.match(/<figcaption>([\s\S]*?)<\/figcaption>/) || [])[1];
  const b = chartBlocks(f)[0]; let c = null; try { c = b && JSON.parse(b.raw); } catch (e) { c = "INVALID JSON: " + e.message; }
  console.log(`\n#${i + 1} ${t}\n   sub: ${s}\n   src: ${cap ? cap.replace(/<[^>]+>/g, "") : "MISSING"}`);
  if (c && typeof c === "object") { console.log(`   type=${c.type} format=${JSON.stringify(c.format)} highlight=${JSON.stringify(c.highlight)} ref=${JSON.stringify(c.ref)} yMin=${c.yMin} yMax=${c.yMax}`); c.series.forEach(se => console.log(`   ${se.name}: ` + c.categories.map((k, j) => `${k}=${se.values[j]}`).join(", "))); } else console.log("   " + (c || "no chart (table/image)"));
});' <id>
```

Also run `node scripts/validate.mjs <id>`. It catches invalid JSON and mismatches between the number of values and categories.

### 2. Check each figure against the checklist

| Check | Rule | How to spot a problem |
|---|---|---|
| **Chart type** | Categories: `bar` (long or ranked labels) or `column`. Time: `line` (or `column` for 12 or fewer periods, single series). Part-to-whole: `stacked-bar` at `yMax: 100`. Exact lookup: a table | A `line` over unordered categories. A `column` with labels longer than ~12 characters. `stacked` where the reader needs to compare the middle segments. More than 8 categories as columns |
| **No pies with more than 3 slices** | `charts.js` has no pie type. Flag images or embedded pies | `<img>` or `<svg>` pies |
| **Title = takeaway** | `pp-fig-title` is a sentence the data proves | Titles like "Churn by channel". Titles the data contradicts, for example "doubles" when the ratio is 1.6× |
| **Subtitle** | Units, population, period, n in `pp-fig-sub` | No unit. No n on survey data |
| **Source** | `figcaption` names the tables or survey and the period | `src: MISSING` |
| **Highlight** | Single series: 0–2 categories in `highlight`, and they are the ones the title names | Highlight on a multi-series chart (ignored by `charts.js`). Highlighting everything. A highlight that doesn't match the title. A highlight string that doesn't exactly match a category |
| **One y-axis** | Never dual-axis. Mixed units get two charts | Series with different units in one chart (for example $ and %) |
| **Zero baseline** | `column`, `bar` and `stacked` start at 0. `line` may use `yMin`, but the caption must say so | `yMin` > 0 on bars. A truncated line axis without a caption note |
| **Format** | `format` matches the unit. Values are in display units (`pct` expects 18.6, not 0.186). `pp` only for differences between rates | Values ≤ 1 with `pct`. `pct` used for a difference in pp. Too many decimals (`pct1` where the differences are 10+ pts) |
| **Palette order** | Series take `--series-1..8` in array order. No `color` overrides unless an entity must keep one colour across the report's charts. Never status colours | A `"color"` key with hex values. Series reordered to "get green". More than 8 series |
| **Legend / labels** | 2+ series get an automatic legend. `line` charts with 2–4 series get direct labels (don't set `directLabels: false`) | Series `name`s that are cryptic ("s1", "grp_b"). A single series named "Value" |
| **Clutter** | One message per chart. `ref` for a benchmark, not an extra flat series | Flat "Target" series. `labels: true` on dense lines. More than 12 columns with labels |
| **Order** | Bars sorted by value unless the order is natural | Alphabetical categories on a ranked bar |
| **Colour alone** | Meaning must also appear in words (title, badge text, legend) | "the orange bar" in prose |

**Tables:** `div.pp-table-wrap` > `table.pp-table` with a `<caption>`. Numeric cells are `td.num` and header cells `th.num`. Decimals are consistent within a column. Totals go in `tr.total`, last. Badges are `pp-badge good|warn|bad` with a word, not colour only. The table should be about 8×6 or smaller.

### 3. Cross-check prose against data

For every number in the `h1`, `pp-tldr`, KPI tiles, `pp-lede` and body paragraphs that describes a charted quantity, find it in the JSON:
- It should match exactly, or be a correct rounding. "About 19%" for 18.6 is fine; "19.6%" is not.
- Check derived claims: "twice" and "2.2×" are ratios of the charted values, and "+9.8 pp" is a difference. Compute them.
- Check that shares sum to about 100 (allowing for rounding) in any part-to-whole chart, and that weighted segments reproduce the stated total where the caption claims they do.
- Check that table rows and chart values for the same measure agree.
- Check that `report.json` `key_findings` use the same numbers.

## Output format

~~~markdown
## Visualization review: <report id>

**Summary:** <N figures, M tables> · <count> must-fix · <one-line overall judgement>

### Figure 1: "<pp-fig-title>"
- **Verdict:** OK | Fix | Rework
- ✖ <must-fix issue>. Rule: BRAND.md §5.<n>
- ⚠ <should-fix issue>
- ✓ <what's right, if notable>

**Fixed spec**
```html
<p class="pp-fig-title">…</p>
<p class="pp-fig-sub">…</p>
<div class="pp-chart"><script type="application/json">
{ … corrected JSON … }
</script></div>
<figcaption>Source: …</figcaption>
```

### Table 1: "<caption>"
…

### Prose vs data
| Location | Text says | Data says | Fix |
|---|---|---|---|
| Short version item 2 | "churn at 28.1%" | 28.8 (Figure 4) | Change the text to 28.8% |
~~~

Rules for fixed specs:
- Output complete, valid JSON: double quotes, no trailing commas, and exactly as many values as categories. Keep the author's data values. Only reorder them (keeping category/value pairs aligned), reformat them, or split them across charts. **Never change a data value** unless the prose-vs-data table shows it is the chart that is wrong, and then say so.
- Include the title, subtitle and caption lines only when they change.
- If a chart should become two, give both specs. If it should become a table, give the table HTML.
- Skip the fixed spec for figures marked OK.

If asked to apply fixes, edit `reports/<id>/index.html` in place and re-run `node scripts/validate.mjs <id>`. Then preview with `npm run serve` at `http://localhost:8000/reports/<id>/` to confirm each chart renders.

## Example

**Before:** the title is a topic, there is no highlight, the labels are alphabetical, the unit is wrong and there is no source.

```json
{ "type": "column", "format": "pct",
  "categories": ["Delivery experience", "Don't order often enough", "Membership price", "Only joined for one sale"],
  "series": [{ "name": "Value", "values": [0.09, 0.38, 0.14, 0.22] }] }
```

**After** (`pp-fig-title`: "Most month-3 cancellers say they don't order often enough"):

```json
{ "type": "bar", "format": "pct", "highlight": ["Don't order often enough"],
  "categories": ["Don't order often enough", "Only joined for one sale", "Membership price", "Delivery experience"],
  "series": [{ "name": "Share of cancellers", "values": [38, 22, 14, 9] }] }
```

Plus `<figcaption>Source: Qualtrics Pine+ cancel-flow survey, month-3 cancellers, n = 3,412.</figcaption>`.
