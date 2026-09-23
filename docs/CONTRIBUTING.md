# Publishing a report on the Insights Hub

## 1. Scaffold

```bash
npm run new -- <id> --title "Headline that states the finding" --area "<Area>" --owner "Your Name <you@parcelandpine.com>" [--type article]
```

- `id` is kebab-case, stable, and becomes the URL (`report.html?id=<id>`). Don't rename it after publishing.
- Areas are listed in `site.config.json`. To add one, add it there (name, slug, description, colour).

This creates `reports/<id>/index.html` and `reports/<id>/report.json` from `shared/templates/report-starter/`.

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

Merging to `main` deploys the site. If the repo has an `ANTHROPIC_API_KEY` secret, the deploy also generates the report's AI summary.

## Pre-PR checklist

- [ ] Headline and section headers state findings, not topics
- [ ] The short version stands on its own
- [ ] Every chart has a takeaway title, units, and a source line
- [ ] Numbers in the prose match the charts and KPI tiles
- [ ] Recommendations have an owner and a date
- [ ] Methodology states population, period, method and limitations
- [ ] `report.json` is complete; `npm run check` passes
- [ ] No customer PII, and people data reported only in groups of 10 or more
