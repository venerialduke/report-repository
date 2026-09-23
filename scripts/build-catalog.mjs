#!/usr/bin/env node
// Build catalog.json (metadata), search-index.json (full text) and feed.xml from reports/*.
// Usage: node scripts/build-catalog.mjs
import fs from "node:fs";
import path from "node:path";
import { ROOT, REPORTS_DIR, readJSON, config, reportDirs, extract, frontMatter } from "./lib/common.mjs";

const cfg = config();
const aiPath = path.join(ROOT, "data/ai-summaries.json");
const ai = fs.existsSync(aiPath) ? readJSON(aiPath) : {};
const reports = [];
const index = [];

for (const id of reportDirs()) {
  const dir = path.join(REPORTS_DIR, id);
  const meta = readJSON(path.join(dir, "report.json"));
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const { text, headings, charts, words } = extract(html);
  reports.push({
    ...meta,
    id,
    updated: meta.updated || meta.published,
    url: `reports/${id}/`,
    headings,
    charts,
    words,
    reading_minutes: Math.max(1, Math.round(words / 230)),
    ...(ai[id]?.summary ? { ai_summary: ai[id].summary, ai_summary_model: ai[id].model, ai_summary_date: ai[id].generated } : {}),
  });
  index.push({ id, text });
}

reports.sort((a, b) => (b.published || "").localeCompare(a.published || "") || a.title.localeCompare(b.title));

// Shared resources: Claude skills + templates
const skillsDir = path.join(ROOT, ".claude/skills");
const skills = fs.existsSync(skillsDir)
  ? fs.readdirSync(skillsDir).filter((d) => fs.existsSync(path.join(skillsDir, d, "SKILL.md"))).sort().map((d) => {
      const fm = frontMatter(fs.readFileSync(path.join(skillsDir, d, "SKILL.md"), "utf8"));
      return { id: d, name: fm.name || d, description: fm.description || "", path: `.claude/skills/${d}/SKILL.md` };
    })
  : [];

const catalog = {
  generated: new Date().toISOString(),
  site: { name: cfg.siteName, org: cfg.orgName },
  areas: cfg.areas.map((a) => ({ ...a, count: reports.filter((r) => r.area === a.name).length })),
  reports,
  skills,
};

fs.writeFileSync(path.join(ROOT, "catalog.json"), JSON.stringify(catalog, null, 2) + "\n");
fs.writeFileSync(path.join(ROOT, "search-index.json"), JSON.stringify(index) + "\n");

// RSS feed (relative links are resolved against SITE_URL when set, e.g. in CI)
const base = (process.env.SITE_URL || "").replace(/\/?$/, "/");
const x = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
const items = reports.filter((r) => r.status !== "draft").slice(0, 30).map((r) => `  <item>
    <title>${x(r.title)}</title>
    <link>${x(base + "report.html?id=" + r.id)}</link>
    <guid isPermaLink="false">${x(r.id)}</guid>
    <pubDate>${new Date(r.published + "T12:00:00Z").toUTCString()}</pubDate>
    <category>${x(r.area)}</category>
    <description>${x(r.summary)}</description>
  </item>`).join("\n");
fs.writeFileSync(path.join(ROOT, "feed.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${x(cfg.orgName + " " + cfg.siteName)}</title>
  <link>${x(base)}</link>
  <description>${x(cfg.tagline)}</description>
${items}
</channel></rss>
`);

console.log(`catalog.json: ${reports.length} reports, ${skills.length} skills · search-index.json · feed.xml`);
