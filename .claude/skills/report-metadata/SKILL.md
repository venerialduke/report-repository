---
name: report-metadata
description: Generates or improves report.json for an existing report, covering summary, quantified key findings, topics and tags consistent with catalog.json, related reports by overlap, then validates it. Use when a report's metadata is missing, placeholder, thin or failing validation.
---

# Report metadata

Write `reports/<id>/report.json` so the report is findable in the Insights Hub (search, filters, carousels, RSS, AI summaries) and so the viewer's metadata rail is accurate. **Every fact in the metadata must come from `reports/<id>/index.html`.** Never invent numbers, owners or code paths.

The schema is in `docs/PLAN.md` ("Report metadata"). The validator is `scripts/validate.mjs`. A good reference is `reports/month-3-member-churn/report.json`.

## Procedure

### 1. Read the sources

- `reports/<id>/index.html`, in full. The key parts are the `h1`, `.pp-subtitle`, `.pp-eyebrow` (area), `.pp-byline` (author, published date), `.pp-tldr`, KPI tiles, `h2`s, `pp-recs`, `pp-method` and `figcaption`s (data sources).
- The existing `reports/<id>/report.json`, if there is one. Keep correct values. Replace starter placeholders (`"example-tag"`, `"Your Name"`, `"analyses/your-project/notebook.ipynb"`, `"warehouse.table_name"`).
- `site.config.json` for the valid areas, and `docs/SAMPLE-CONTENT-BIBLE.md` for owner names, emails and roles.
- The vocabulary in use. Build it from the report folders, which may be newer than `catalog.json`:

```bash
node -e 'const fs=require("fs"),t={},g={};for(const d of fs.readdirSync("reports")){try{const m=JSON.parse(fs.readFileSync(`reports/${d}/report.json`,"utf8"));m.topics.forEach(x=>t[x]=(t[x]||0)+1);m.tags.forEach(x=>g[x]=(g[x]||0)+1)}catch{}}const s=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+"("+v+")").join(", ");console.log("TOPICS:",s(t));console.log("\nTAGS:",s(g))'
```

### 2. Fill each field

| Field | How to write it |
|---|---|
| `id` | Equal to the folder name, kebab-case. Never rename an existing id: links and comments depend on it. |
| `title` | Copied exactly from the `h1` (decode `&amp;` to `&`). |
| `subtitle` | Copied exactly from `.pp-subtitle`. |
| `type` | `report` if it has findings and recommendations. `article` for methods, glossaries, playbooks and retros. |
| `area` | Exactly one area from `site.config.json`, matching the eyebrow. |
| `topics` | 2–4 broad themes in Title Case, reused from the vocabulary (see step 3). |
| `tags` | 4–8 specific keywords in kebab-case (see step 3). |
| `owners` | `[{ "name", "email", "role" }]` for each byline author, with roles from the content bible (for example `"Senior Analyst, Customer"`, not `"Author"`). |
| `published` | ISO `YYYY-MM-DD`, from the byline "Published" date. |
| `updated` | ISO date on or after `published`. Set it to today when the content changes materially. |
| `status` | `draft` (in review), `final`, or `superseded` (add the replacing report to `related`). |
| `summary` | See step 4. |
| `key_findings` | See step 4. |
| `code` | `[{ "label", "path" }]`. `path` is relative to the `insights-analysis` repo (`teamRepo` in `site.config.json`), e.g. `analyses/2026-09-member-churn/01_cohort_build.sql`, or a full URL. Label each file by what it does ("Cohort build (SQL)", "Survival curves & hazards"), in pipeline order. If the report doesn't say where the code is, ask. Don't guess a path. |
| `data_sources` | Warehouse tables and named sources taken from the figcaptions and the methodology, e.g. `dw.fct_orders`, `"Qualtrics — Pine+ cancel flow survey"`. Remove duplicates. |
| `related` | 2–4 ids (see step 5). |
| `ai_summary` | **Never write this field.** `scripts/generate-summaries.mjs` generates it. |

### 3. Choose topics and tags

**Topics** are for browsing, so keep the set small and shared.
- Reuse existing topics wherever one fits: `Retention`, `Membership`, `Customer Behaviour`, `Experimentation`, `Fulfilment`, `Delivery`, `Survey Research`, `Customer Experience`, `Digital Experience`, `CRM`, `Pricing`, `Forecasting`, and so on.
- Use Title Case and keep existing spellings (`Behaviour`, `Personalisation`, `Fulfilment`).
- Create a new topic only if nothing fits and at least one other existing or likely report would share it. Say in your response that you created it.
- The area is not a topic. Don't repeat "Marketing" as a topic in a Marketing report.

**Tags** are for search and precise filtering.
- Use lowercase kebab-case (`pine-plus`, `last-mile`, `black-friday`). The validator warns on anything else.
- Mix these kinds of tag: **subject** (`churn`, `returns`), **entity** (`pine-plus`, `pine-fleet`, `dallas-fc`), **method** (`survival-analysis`, `geo-holdout`, `difference-in-differences`, `ab-test`), **period or event** (`peak-2026`, `h1-2026`).
- Reuse the existing spelling of a concept. The catalog has both `ab-test` and `ab-testing`, so prefer `ab-test`, and never add a third variant. Use singular or plural as it already appears.
- Don't add tags that just repeat the topic words (`retention` alongside the topic `Retention`), or that apply to everything (`analysis`, `insights`, `data`).

### 4. Write the summary and key findings

**`summary`** is 1–3 sentences, 600 characters or fewer (the validator warns above that). A VP should be able to forward it unedited.
1. Sentence 1 gives the main finding with its number and comparison.
2. Sentence 2 gives the cause or the second most important finding.
3. Sentence 3 gives what we recommend, and who owns it where that fits.

It is plain text: no HTML, no Markdown, no "This report…" opener.

> ✗ This report analyses Pine+ churn and finds some interesting patterns across tenure months and channels.
>
> ✓ Monthly-plan Pine+ members churn at 18.6% in their third month, more than twice the rate of neighbouring months, while annual members show no such cliff. A third order within 60 days of joining is the strongest early signal of retention, so we recommend testing a month-2 order nudge and an annual-conversion offer.

**`key_findings`** are 3–5 standalone sentences. Take them mostly from the `.pp-tldr` and KPI tiles.
- Each one is **quantified with a comparison**: "18.6%, vs. an average of 8.4% in months 1, 2 and 4".
- Each one makes sense in isolation. They appear alone in the viewer rail and in AI context.
- Put the most decision-relevant finding first. Include the sized impact of the recommendation if the report gives one ("…would save about 3,000 members and about $0.6M a year").
- Every number must appear in the HTML and be formatted the same way (pp vs %, `vs.`, en dashes; see `.claude/skills/brand-style/SKILL.md`).
- Each finding is one sentence, about 200 characters or fewer.

### 5. Choose related reports by overlap

Score the candidates by shared topics and tags:

```bash
node -e '
const fs=require("fs"),id=process.argv[1];
const me=JSON.parse(fs.readFileSync(`reports/${id}/report.json`,"utf8"));
const all=fs.readdirSync("reports").filter(d=>d!==id&&fs.existsSync(`reports/${d}/report.json`)).map(d=>{try{return JSON.parse(fs.readFileSync(`reports/${d}/report.json`,"utf8"))}catch{return null}}).filter(Boolean);
const ov=(a=[],b=[])=>a.filter(x=>b.includes(x));
all.map(r=>{const t=ov(me.topics,r.topics),g=ov(me.tags,r.tags);return{id:r.id,score:3*t.length+2*g.length+(r.area===me.area?1:0),why:[...t,...g].join(", ")}})
 .filter(r=>r.score>0).sort((a,b)=>b.score-a.score).slice(0,8).forEach(r=>console.log(String(r.score).padStart(2),r.id.padEnd(40),r.why));' <id>
```

Then apply judgement:
- **Always include** any report the HTML cites by name (for example "which we cover in the *Pine+ LTV forecast*"), and the `metric-glossary-active-member` article if the report uses its definitions.
- Prefer reports with a real link (the same population, metric or decision) over coincidental tag matches.
- Include at least one report from another area where one is genuinely relevant.
- Choose 2–4 ids that exist. Never include the report itself. `superseded` reports must list their replacement.
- Consider adding the reverse link to the related report's `report.json` if it is clearly missing. Mention it in your response rather than editing silently.

### 6. Validate

```bash
node scripts/validate.mjs <id>   # schema, dates, area, kebab tags, related ids, summary length, chart JSON
npm run check                    # validate all + rebuild catalog.json / search-index.json / feed.xml
```

Fix all `✖` errors and all `⚠` warnings. Then confirm the rail looks right with `npm run serve` at `http://localhost:8000/report.html?id=<id>`.

## Output

Write the file with 2-space indentation, in the field order used by `shared/templates/report-starter/report.json`, with a trailing newline. Then reply with:
- a short diff summary (the fields added or changed, and why)
- any **new** topics or tags you created, and why no existing one fitted
- anything you couldn't source from the HTML (missing code paths, owner roles, data-through date) as questions for the author
- the validator result
