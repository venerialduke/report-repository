# Turning on shared comments (giscus)

The viewer shows a **Discussion** section under each report. Until giscus is configured, comments are stored only in the reader's browser, and the page labels them "Prototype mode".

[giscus](https://giscus.app) stores comments as **GitHub Discussions** in this repo: one discussion per report, created automatically the first time someone comments. Readers sign in with GitHub to comment or react.

## Setup (about 5 minutes)

1. The repo must be **public** (a giscus requirement).
2. **Settings → General → Features → Discussions**: enable.
3. In **Discussions**, create a category named **Report comments**, with the format **Announcement** so only giscus and maintainers can start threads.
4. Install the giscus GitHub App on this repo: <https://github.com/apps/giscus>.
5. Go to <https://giscus.app>, enter `ventiduke/report-repository`, and choose the **Report comments** category. Copy `data-repo-id` and `data-category-id` from the generated snippet.
6. Fill them in `site.config.json`:

```json
"comments": {
  "provider": "giscus",
  "giscus": {
    "repo": "ventiduke/report-repository",
    "repoId": "R_kgDO…",
    "category": "Report comments",
    "categoryId": "DIC_kwDO…",
    "mapping": "specific",
    "theme": "preferred_color_scheme"
  }
}
```

Each report maps to the discussion titled `report:<id>`, so renaming a report's title never orphans its comments. Renaming its **id** does.

## Alternatives for internal-only hosting

- **Utterances**: similar, but uses Issues.
- **Internal hosting behind SSO**: a small comments API (e.g. a Cloudflare Worker + D1, or an internal service) can replace `assets/js/comments.js`. The module has a single `mountComments(el, report, cfg)` entry point.
