---
name: storytelling-review
description: Reviews a draft Insights report's narrative (headline-as-finding, so-what, pyramid structure, short version, storyline headers, jargon, hedging, recommendations) and returns a scored rubric plus quote-to-rewrite fixes. Use when asked to review, critique or tighten the story or writing of a report.
---

# Storytelling review

Judge whether a report in `reports/<id>/index.html` gets a busy reader to the right decision quickly. You are reviewing the **argument and the writing**. Charts belong to `visualization-review` and copy mechanics (number formats, spelling, word list) to `brand-style`. Mention those only if they damage the story.

The standard is `shared/brand/BRAND.md` (sections 1 and 2). The benchmark for "good" is `reports/month-3-member-churn/index.html`.

## Procedure

1. **Read `reports/<id>/report.json` and the HTML in full.** Note the type: `article`s may skip KPIs and recommendations but still need a short version.
2. **Do the 30-second read.** Read only the `h1`, `.pp-subtitle`, `.pp-tldr` and KPI tiles. Write down, in one sentence, what you think the reader should do. If you can't, that is the top finding of your review.
3. **Do the skeleton read.** List every `h2` in order (strip `pp-num`). Do they form an argument that someone could follow without the body text?
4. **Do the close read.** Go section by section: does the `pp-lede` state the takeaway, does the evidence support it, is there a "so what"?
5. **Check the recommendations and methodology** against the claims made above them.
6. **Score the rubric, then write the prioritised suggestions.** Quote the exact text from the HTML. Never paraphrase the "quote" side.

To pull the skeleton quickly:

```bash
grep -oE '<h1>.*</h1>|<h2>.*</h2>|class="pp-fig-title">[^<]*' reports/<id>/index.html | sed -E 's/<[^>]+>//g; s/class="pp-fig-title">/  [fig] /'
```

## Rubric

Score each criterion from 1 to 5. 5 = it could ship as is. 3 = the reader gets there, but with effort. 1 = missing or misleading.

| # | Criterion | What a 5 looks like | Common failures |
|---|---|---|---|
| 1 | **Headline states the finding** | The `h1` is a sentence with a subject, a verb and a number or direction ("…churn twice as fast in month 3…") | Topic labels ("Q3 churn analysis"), questions, puns |
| 2 | **So what** | The subtitle or short version says why it matters (money, members, risk) and what to do | Findings with no implication. The reader is left asking "and?" |
| 3 | **Pyramid principle** | Answer first, then supporting findings, then evidence. The recommendation is visible before the method | Chronological order ("First we pulled data…"). The conclusion only appears in the last section |
| 4 | **Short version stands alone** | 3–5 items with bold lead sentences. Quantified, with comparisons. Ends with an owned recommendation. Nothing in it needs the body to make sense | Items that say "see section 3". Undefined terms. No recommendation |
| 5 | **Headers form a storyline** | Each `h2` is a finding, and read in sequence they make the argument | "Background / Data / Results / Next steps" |
| 6 | **Evidence supports claims** | Each claim has a number, a comparison, and a figure or table nearby. Causal words only where the design supports them | "Drives", "causes" or "because" on observational data. Cherry-picked segments |
| 7 | **Plain language** | Jargon defined once or replaced. Short sentences. Active voice with named actors | "Leverage", "utilise", unexplained "hazard", "AUC" or "CUPED" in the short version |
| 8 | **Confidence is calibrated** | Uncertainty is stated once, precisely (CI, n, design), where it matters | A hedge in every sentence ("may potentially suggest"), or none at all on a small sample |
| 9 | **Recommendations are actionable** | A verb-first action, the expected impact, **an owner and a date** in `pp-owner` | "Consider exploring…", "Owner: TBD", no date, more than 5 recommendations |
| 10 | **Caveats are proportionate** | Limitations sized to the claim. A `caveat` callout only where a reader could draw the wrong conclusion | Caveats that undo the headline, or a methodology section missing limitations |

**Overall:** report the mean, plus a verdict. **Ship** means every score is 4 or higher. **Ship after fixes** means no score below 3. **Rework** means any score of 1–2 on criteria 1–5.

## What to look for

**Headlines and ledes**
- Test: could the headline be wrong? If no finding could ever make it false, it is a topic, not a finding.
- The `h1`, `<title>` and `report.json` `title` should all match.
- Every `pp-lede` should be the section's takeaway. If the first sentence is method ("We segmented…"), the takeaway is buried.

**So what**
- For each finding, ask "so what?" twice. The second answer is usually the sentence that is missing.
- Look for an `insight` callout ("So what", "Why this matters") after the key evidence. Suggest one if the implication is only implied.
- Tie impact to business units the reader cares about: members, orders, $ contribution, hours, NPS points.

**Jargon and hedging.** Flag these and propose a plain alternative:

| Flag | Prefer |
|---|---|
| leverage, utilise, synergies, actionable insights | use, (cut), specific action |
| statistically significant uplift | lifted X by Y (95% CI a–b) |
| it was found / it is recommended | we found / we recommend (the Retention squad) … |
| may potentially, could possibly, seems to suggest | pick one hedge, or state the CI |
| hazard, AUC, CUPED, diff-in-diff (in the short version) | a plain description; keep the term for Methodology |
| interestingly, notably, it is worth noting that | (delete) |
| further analysis is needed | name the analysis, the owner and the date, or cut |

**Proportion**
- A 40% claim from n = 60 needs a visible caveat. A ±0.5 pp CI on n = 52,100 doesn't need three paragraphs of caveats.
- Observational comparisons must not be written as effects ("switching to annual makes members stay"). Recommend a test instead.
- Check that the limitations named in `pp-method` are acknowledged wherever they bite, not only in the appendix.

**Consistency.** The numbers in the short version, KPIs, body and `report.json` `key_findings` and `summary` must match. Flag any mismatch as a story problem: it erodes trust.

## Output format

Respond in exactly this structure:

```markdown
## Storytelling review: <report id>

**30-second read:** <what a VP would take away, in one sentence>
**Verdict:** Ship | Ship after fixes | Rework · mean score X.X / 5

| # | Criterion | Score | Evidence |
|---|---|---|---|
| 1 | Headline states the finding | 4 | "<short quote>". Finding plus number, but the comparison is missing |
| … | … | … | … |

### Storyline as written
01 <h2 text> · 02 <h2 text> · …

### Prioritised suggestions
**P1: must fix before publishing**
1. **<location, e.g. h1 / Short version item 2 / §03 lede / Rec 2>** (<criterion #>)
   > <exact quote from the HTML>

   → <rewrite, ready to paste>

   *Why:* <one line>

**P2: should fix**
…

**P3: nice to have**
…

### What works
- <1–3 specific strengths to keep>
```

Guidelines:
- **P1** covers anything that would mislead, a missing finding in the headline or short version, recommendations without an owner or date, and number mismatches. **P2** covers structure and clarity. **P3** covers polish.
- Give 5–15 suggestions in total. Merge repeated patterns into one item ("same hedge in §02 and §04") rather than listing each.
- Rewrites must use only numbers that already appear in the report. If a rewrite needs a number the report doesn't have, write `[number needed: …]`. Never invent data.
- Keep rewrites in house voice (see `BRAND.md` section 1): active, plain, and quantified with a comparison.
- If asked to apply the fixes, edit `reports/<id>/index.html` (and `report.json` if the title or summary changed), then run `node scripts/validate.mjs <id>`.
