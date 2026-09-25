# Publishing a report on the Insights Hub

## 1. Scaffold

```bash
npm run new -- <id> --title "Headline that states the finding" --area "<Area>" --owner "Your Name <you@parcelandpine.com>" [--type article]
```

- `id` is kebab-case, stable, and becomes the URL (`report.html?id=<id>`). Don't rename it after publishing.
- Areas are listed in `site.config.json`. To add one, add it there (name, slug, description, colour). Each area gets a landing page at `area.html?a=<slug>`. Two optional fields customise it: `intro`, a longer description for the page header, and `links`, which appear in the side panel:

  ```json
  { "name": "Marketing", "slug": "marketing", "description": "…", "color": "#4a3aa7",
    "intro": "Media effectiveness, CRM and brand health. Owned by Lena Kowalski.",
    "links": [{ "label": "Marketing dashboard", "url": "https://…" }] }
  ```

This creates `reports/<id>/index.html` and `reports/<id>/report.json` from `shared/templates/report-starter/`.

### Starting from a Google Doc or Slides deck?

Ask Claude Code in this repo to *"import this Google Slides deck as a report"* and give it a link or an exported file. The **import-google-doc** skill will:
- extract the text, tables, images, native chart data and speaker notes (`scripts/import/extract.py`);
- propose all the metadata and ask you to confirm it in one round;
- restructure the content into the house format, with numbers kept exactly as they appear in the source;
- leave `<!-- IMPORT: … -->` flags where something needs your decision. CI won't let a report be marked `final` until they're resolved.

Export formats: Docs as `.docx` (*File → Download → Microsoft Word*), Slides as `.pptx` (*File → Download → Microsoft PowerPoint*). A link works only if the file is shared "Anyone with the link". One-time setup: `pip install -r scripts/import/requirements.txt`.

## 2. Write the report

- Keep the starter's structure: masthead → **short version** → KPI tiles → numbered, finding-led sections → recommendations (owner + date) → methodology & limitations.
- Link shared assets **relatively**: `../../shared/brand/report.css` and `../../shared/brand/charts.js`. Put images and other files next to `index.html` and link them relatively too.
- **Charts** are JSON inside a `.pp-chart` div, so they render the same on the site, in PDFs and in bundles. The AI and search can also read the numbers. See the [chart gallery](../shared/templates/chart-gallery/) for every type.

```html
<figure class="pp-figure">
  <p class="pp-fig-title">Month 3 is where monthly members leave</p>
  <p class="pp-fig-sub">Monthly churn by month of tenure · % of members</p>
  <div class="pp-chart"><script type="application/json">
    { "type": "column", "format": "pct1", "highlight": ["M3"],
      "categories": ["M1","M2","M3","M4"], "series": [{ "name": "Churn", "values": [8.1, 8.6, 18.6, 8.4] }] }
  </script></div>
  <figcaption>Source: dw.fct_membership_events, Sep 2025–Mar 2026 cohorts.</figcaption>
</figure>
```

- Every chart automatically gets a toolbar: **Expand** opens an enlarged view, and readers can download the data as **CSV**, copy it, or save the chart as **PNG/SVG** (title, legend and source included). To turn this off, set `"downloads": false` on a chart, or add `<meta name="pp:downloads" content="false">` to hide it for the whole report. Charts pasted in as images can't offer data downloads, which is another reason to use chart JSON.
- Already have an HTML report built elsewhere (notebook export, Quarto, R Markdown)? That's fine. Drop it in as `index.html`. The hub still indexes its text, and the viewer, PDF export, AI and comments all work. Using the shared stylesheet is recommended but not required.

## 3. Fill in `report.json`

| field | notes |
|---|---|
| `title`, `subtitle` | Must match the HTML. |
| `type` | `report` or `article` (explainers, guides, methods). |
| `area` | Exactly one area from `site.config.json`. |
| `topics` | 2–4 broad themes in Title Case. Reuse existing topics (see `catalog.json`) where you can. |
| `tags` | 4–8 lowercase kebab-case keywords. |
| `owners` | `[{ name, email, role }]`. These people answer questions. |
| `published`, `updated` | `YYYY-MM-DD`. Bump `updated` when you revise. |
| `status` | `final`, `draft` (shown with a Draft badge) or `superseded`. |
| `summary` | 2–3 sentences a VP could forward. |
| `key_findings` | 3–5 quantified statements, shown in the viewer rail. |
| `code` | `[{ label, path }]`. `path` is relative to `teamRepo` in `site.config.json`, or a full URL. |
| `data_sources` | Tables, surveys and tools used. |
| `related` | Ids of related reports. |

The `report-metadata` Claude skill can draft this from your HTML.

## 4. Check, preview, review

```bash
npm run check   # validates metadata + chart JSON, rebuilds catalog.json / search-index.json / feed.xml
npm run serve   # http://localhost:8000
```

Open a pull request. CI runs the same validation. Before asking a human reviewer, ask Claude (Claude Code in this repo picks up `.claude/skills/` automatically):

- "Use the **storytelling-review** skill on reports/<id>"
- "Use the **visualization-review** skill on reports/<id>"
- "Use the **brand-style** skill on reports/<id>"

Every pull request gets a Netlify **deploy preview** link (posted as a comment on the PR), so reviewers can read the report exactly as it will appear. Merging to `main` publishes it at https://insights-headlines.netlify.app. Commit the regenerated `catalog.json`, `search-index.json` and `feed.xml` with your report; CI checks this. If the repo has an `ANTHROPIC_API_KEY` secret, a workflow on `main` then adds the report's AI summary.

## Pre-PR checklist

- [ ] Headline and section headers state findings, not topics
- [ ] The short version stands on its own
- [ ] Every chart has a takeaway title, units, and a source line
- [ ] Numbers in the prose match the charts and KPI tiles
- [ ] Recommendations have an owner and a date
- [ ] Methodology states population, period, method and limitations
- [ ] `report.json` is complete; `npm run check` passes
- [ ] No customer PII, and people data reported only in groups of 10 or more
