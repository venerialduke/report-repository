---
name: import-google-doc
description: Converts a Google Doc or Google Slides deck (a link, a .docx/.pptx/.md export, or a Google Drive connector) into an Insights Hub report, asking the author for metadata. Use when someone wants to publish, import or turn a Google Doc, Slides deck or presentation into a Hub report.
---

# Import a Google Doc or Slides deck

Turn an existing Google Doc or Slides deck into a report in `reports/<id>/` that looks like it was written for the Hub. Keep the author's content and numbers exactly, restructure it into the house format, and ask the author for the metadata a document doesn't contain.

The mechanical part (text, lists, tables, images, native chart data, speaker notes) is done by `scripts/import/extract.py`. Your job is getting the file, the metadata interview, restructuring, and checking.

Read first: `shared/brand/BRAND.md` (house style and chart rules), `.claude/skills/report-construction/SKILL.md` (HTML structure, chart JSON, `report.json` fields), and `site.config.json` (valid areas).

## 0. Before you start: audience check

The Hub serves whatever is on `main`. **The prototype (Netlify free tier, https://insights-headlines.netlify.app) is public.** Before importing, tell the author where the report will be visible and confirm the document is OK to publish there. Don't proceed with confidential material on the public prototype.

## 1. Get the source file

Set up once: `pip install -r scripts/import/requirements.txt`.

Use the first route that works:

1. **Google Drive connector.** If tools for Google Drive are available in this session (search your tools for "drive" or "google"), use them to export the file: Docs as `.docx`, Slides as `.pptx`. Save it under `imports/`.
2. **A link** from the author:
   ```bash
   python3 scripts/import/extract.py --url "<docs.google.com link>" --out imports/<working-name>
   ```
   This only works if the file is shared "Anyone with the link". If it fails, ask the author to export it instead (route 3).
3. **An exported file.** Ask the author to export and share the path:
   - Google Docs: *File → Download → Microsoft Word (.docx)*. Markdown (.md) also works but loses images and tables.
   - Google Slides: *File → Download → Microsoft PowerPoint (.pptx)*.
   ```bash
   python3 scripts/import/extract.py path/to/file.pptx --out imports/<working-name>
   ```

`imports/` is git-ignored scratch space. The extractor writes:
- `outline.md`: read it in full. It is the whole document in order.
- `outline.json`: the same content, plus the exact chart data (`pp_chart`), `kpi_candidates` (large numbers on slides), speaker notes, and image paths.
- `assets/`: extracted images.

## 2. Metadata interview: one round, proposals first

Draft every field yourself from the content and the existing vocabulary, then ask the author to confirm or correct in **one** round. Don't ask field by field.

Build the vocabulary first, from topics and tags already in use:
```bash
node -e 'const c=require("./catalog.json");const t={},g={};c.reports.forEach(r=>{r.topics.forEach(x=>t[x]=(t[x]||0)+1);r.tags.forEach(x=>g[x]=(g[x]||0)+1)});console.log("TOPICS",Object.keys(t).join(", "));console.log("TAGS",Object.keys(g).join(", "))'
```

Present the proposal as a compact table:

| Field | Proposal | How you got it |
|---|---|---|
| id | `referral-pilot-readout` | from the title; check `reports/` for clashes |
| title | "Referred members churn less than half as often in month 3" | rewritten from the topic-style slide title (headline must be a finding) |
| subtitle | … | subtitle or first-slide tagline |
| type | report / article | findings and recommendations → report; explainer or guide → article |
| area | one of `site.config.json` areas | content |
| owners | name, email, role | doc author property, byline, or **ask** |
| status | `draft` | always draft on import; the author promotes it |
| published | date | doc date, or today |
| topics / tags | 2–4 / 4–8 | reuse vocabulary; new ones only if nothing fits |
| summary, key findings | 2–3 sentences; 3–5 quantified findings | drafted **only** from numbers in the document |
| code | `[{label, path}]` | **ask**; decks rarely link code. Empty is allowed |
| data sources | tables, surveys, tools | captions, footnotes, speaker notes, or **ask** |
| related | 2–4 report ids | overlap in topics and tags with `catalog.json` |

Then ask, preferably with the AskUserQuestion tool if it's available:
- **Always ask** for anything you couldn't find: owners (never guess emails), area if ambiguous, code links, data sources.
- **Confirm** the rewritten headline, the summary and the key findings.
- **Ask one question per chart pasted in as an image:** can the author share the underlying data (e.g. a CSV from the linked Sheet) so it becomes an interactive, downloadable chart? Otherwise it stays an image.

Proceed once area and owners are settled. For anything else the author doesn't answer, use your proposal and list it in the hand-off.

## 3. Build the report

Scaffold, then replace the template body:
```bash
npm run new -- <id> --title "<headline>" --area "<Area>" --owner "Name <email>"
mkdir -p reports/<id>/assets && cp imports/<working-name>/assets/* reports/<id>/assets/   # only the images you keep
```

### From a Google Doc
- **Title → `h1`, Subtitle → `.pp-subtitle`.** Byline: the owners, published date, and "Data through …" if stated.
- **An existing summary** ("Summary", "TL;DR", "Key takeaways") becomes `.pp-tldr`. If there isn't one, draft it from the body and mark it for the author to confirm.
- **Headings:**
  - Heading 1 → numbered `<h2><span class="pp-num">01</span>…</h2>` sections.
  - Heading 2 → `h3`.
  - Turn topic headings into findings where the content supports it ("Results" → "Conversion rose 2.1% with no change in returns").
- **Body text:** paragraphs, lists and **bold** carry over.
- **Tables** → `.pp-table` inside `.pp-table-wrap`. Put `class="num"` on numeric columns.
- **Images:** kept in `assets/` with real alt text; see the image rules below.

### From a Slides deck
A deck is not a document, so restructure it rather than transcribing it slide by slide:
- **Title slide** → masthead.
- **Agenda, section-divider, "Questions?" and "Thank you" slides** → drop.
- **Big-number slides** (`kpi_candidates`) → `.pp-kpis` tiles. The label comes from the text under each number.
- **Content slides:** each one becomes a section.
  - The slide title becomes the `h2`, rewritten as a finding if needed.
  - Bullets become a short lede plus a list or prose.
  - **Speaker notes often hold the real narrative and caveats.** Use them for prose, n-sizes and methodology.
- **Native charts** → `.pp-chart` JSON, starting from `pp_chart` in `outline.json`:
  - Fractions (see `_note`) are multiplied by 100 and use `"format": "pct"` or `"pct1"`.
  - Pick the chart type by BRAND.md rules, not by what the deck used. Pie charts become bars.
  - Add `highlight` for the category the slide is about.
  - Write `.pp-fig-title` as the takeaway, `.pp-fig-sub` with units and population, and a `figcaption` source.
- **Table slides** → `.pp-table`.
- **Recommendation or next-steps slides** → `.pp-recs`, each with `<span class="pp-owner">Owner: … · By: …</span>`. If a recommendation has no owner or date, ask; don't invent one.
- **Appendix and methodology slides** → `.pp-method`.

### Images
- **Charts or tables pasted as images:** rebuild them as chart JSON or a table if the author gave you the data. Otherwise keep the image inside a `.pp-figure` with a takeaway title and source, and flag it in the hand-off: its data can't be downloaded or searched.
- **Photos and diagrams that carry meaning:** keep them in `reports/<id>/assets/`, reference them relatively (`assets/…`), and write alt text describing what they show. File names are not alt text.
- **Logos, decorative shapes, background images:** drop.

### Fidelity rules (non-negotiable)
- **Never invent, round differently or "fix" a number.** Every number in the report must appear in the source.
- **Restructuring and rewording are fine; changing a conclusion is not.** Keep the author's caveats.
- **If something is unclear** (an unlabelled axis, a number with no unit, conflicting figures across slides), leave `<!-- IMPORT: … -->` in the HTML at that spot and list it in the hand-off.

## 4. Metadata file

Write `reports/<id>/report.json` with the confirmed fields, plus the source link, which the viewer shows as "Original document":
```json
"source": { "type": "google-slides", "url": "https://docs.google.com/presentation/d/…", "title": "Referral pilot readout (deck)", "imported": "2026-09-24" }
```
`type` is `google-docs` or `google-slides`. Omit `url` if the author doesn't want the original linked.

## 5. Check

```bash
npm run check          # validates metadata, chart JSON, links; rebuilds the catalog
npm run serve          # http://localhost:8000/report.html?id=<id>
```
Look at every chart for label collisions and wrong scales. Check that every image loads and every number matches the source.

## 6. Hand-off

Reply with:
1. **What was converted:** sections, charts rebuilt from data, tables, and images kept.
2. **What was dropped:** which slides or elements, and why.
3. **Open items:** every `IMPORT:` flag, every metadata field that used your proposal without confirmation, and image charts still missing data.
4. **Next steps:**
   - run the `storytelling-review` and `visualization-review` skills;
   - the author reads the full report against the original;
   - open a pull request with the report and the regenerated `catalog.json`, `search-index.json` and `feed.xml`.

Delete the `imports/<working-name>/` folder once the author is happy. It's scratch and never committed.
