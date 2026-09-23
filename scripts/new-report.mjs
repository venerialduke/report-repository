#!/usr/bin/env node
// Scaffold a new report from the starter template.
// Usage: node scripts/new-report.mjs <id> --title "Headline" --area "Marketing" --owner "Name <email>" [--type article]
import fs from "node:fs";
import path from "node:path";
import { ROOT, REPORTS_DIR, config } from "./lib/common.mjs";

const [id, ...rest] = process.argv.slice(2);
if (!id || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) {
  console.error('Usage: node scripts/new-report.mjs <kebab-case-id> --title "..." --area "..." --owner "Name <email>" [--type report|article]');
  process.exit(1);
}
const opt = {};
for (let i = 0; i < rest.length; i += 2) opt[rest[i].replace(/^--/, "")] = rest[i + 1];
const dest = path.join(REPORTS_DIR, id);
if (fs.existsSync(dest)) { console.error(`reports/${id} already exists`); process.exit(1); }

const areas = config().areas.map((a) => a.name);
if (opt.area && !areas.includes(opt.area)) { console.error(`Unknown area. Choose one of:\n  ${areas.join("\n  ")}`); process.exit(1); }

const src = path.join(ROOT, "shared/templates/report-starter");
fs.mkdirSync(dest, { recursive: true });
const today = new Date().toISOString().slice(0, 10);
const meta = JSON.parse(fs.readFileSync(path.join(src, "report.json"), "utf8"));
const [, oname, oemail] = (opt.owner || "").match(/^(.*?)\s*<(.+)>$/) || [, opt.owner || meta.owners[0].name, meta.owners[0].email];
Object.assign(meta, {
  id, title: opt.title || meta.title, type: opt.type || "report", area: opt.area || meta.area,
  owners: [{ name: oname, email: oemail, role: "Author" }], published: today, updated: today, status: "draft",
});
fs.writeFileSync(path.join(dest, "report.json"), JSON.stringify(meta, null, 2) + "\n");
let html = fs.readFileSync(path.join(src, "index.html"), "utf8");
html = html.replaceAll("Your headline states the finding, not the topic", opt.title || meta.title)
  .replaceAll("Customer &amp; Growth", (opt.area || meta.area).replace("&", "&amp;"))
  .replaceAll("Your Name", oname);
fs.writeFileSync(path.join(dest, "index.html"), html);
console.log(`Created reports/${id}/ — edit index.html and report.json, then run: npm run check`);
