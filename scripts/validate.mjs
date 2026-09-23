#!/usr/bin/env node
// Validate every report folder: metadata schema, links, chart JSON. Exit 1 on errors.
// Usage: node scripts/validate.mjs [report-id ...]
import fs from "node:fs";
import path from "node:path";
import { REPORTS_DIR, readJSON, config, reportDirs, chartBlocks } from "./lib/common.mjs";

const cfg = config();
const AREAS = new Set(cfg.areas.map((a) => a.name));
const TYPES = new Set(["report", "article"]);
const STATUSES = new Set(["final", "draft", "superseded"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const all = reportDirs();
const targets = process.argv.slice(2).length ? process.argv.slice(2) : all;
const ids = new Set(all);
let errors = 0, warnings = 0;

const err = (id, msg) => { errors++; console.error(`✖ ${id}: ${msg}`); };
const warn = (id, msg) => { warnings++; console.warn(`⚠ ${id}: ${msg}`); };

for (const id of targets) {
  const dir = path.join(REPORTS_DIR, id);
  let m;
  try { m = readJSON(path.join(dir, "report.json")); } catch (e) { err(id, `report.json unreadable: ${e.message}`); continue; }
  const req = (k, t) => {
    const v = m[k];
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return err(id, `missing required field "${k}"`);
    if (t === "array" && !Array.isArray(v)) err(id, `"${k}" must be an array`);
    if (t === "string" && typeof v !== "string") err(id, `"${k}" must be a string`);
  };
  ["id", "title", "type", "area", "published", "status", "summary"].forEach((k) => req(k, "string"));
  ["topics", "tags", "owners"].forEach((k) => req(k, "array"));

  if (!KEBAB.test(id)) err(id, "folder name must be kebab-case");
  if (m.id && m.id !== id) err(id, `id "${m.id}" must equal folder name`);
  if (m.type && !TYPES.has(m.type)) err(id, `type must be one of ${[...TYPES].join(", ")}`);
  if (m.area && !AREAS.has(m.area)) err(id, `area "${m.area}" is not in site.config.json`);
  if (m.status && !STATUSES.has(m.status)) err(id, `status must be one of ${[...STATUSES].join(", ")}`);
  for (const k of ["published", "updated"]) if (m[k] && !DATE.test(m[k])) err(id, `${k} must be YYYY-MM-DD`);
  if (m.updated && m.published && m.updated < m.published) err(id, "updated is before published");
  (m.tags || []).forEach((t) => KEBAB.test(t) || warn(id, `tag "${t}" should be lowercase kebab-case`));
  (m.owners || []).forEach((o, i) => {
    if (!o || !o.name) err(id, `owners[${i}] needs a name`);
    if (o && o.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.email)) err(id, `owners[${i}].email looks invalid`);
  });
  (m.code || []).forEach((c, i) => { if (!c.label || !c.path) err(id, `code[${i}] needs label and path`); });
  (m.related || []).forEach((r) => { if (!ids.has(r)) warn(id, `related id "${r}" does not exist`); if (r === id) err(id, "related lists itself"); });
  if (m.key_findings && !Array.isArray(m.key_findings)) err(id, "key_findings must be an array");
  if (m.summary && m.summary.length > 600) warn(id, "summary is long (>600 chars) — keep it to 2–3 sentences");

  const htmlPath = path.join(dir, "index.html");
  if (!fs.existsSync(htmlPath)) { err(id, "index.html missing"); continue; }
  const html = fs.readFileSync(htmlPath, "utf8");
  if (!/<title>[^<]+<\/title>/.test(html)) err(id, "index.html has no <title>");
  if (!html.includes("shared/brand/report.css")) warn(id, "does not link shared/brand/report.css");
  if (/(href|src)="\/(?!\/)/.test(html)) err(id, "root-absolute links (/...) break on GitHub Pages project sites — use relative paths");
  chartBlocks(html).forEach((b, i) => {
    let c;
    try { c = JSON.parse(b.raw); } catch (e) { return err(id, `chart #${i + 1} JSON invalid: ${e.message}`); }
    const n = (c.categories || []).length;
    if (!n) err(id, `chart #${i + 1} has no categories`);
    (c.series || []).forEach((s) => { if (!Array.isArray(s.values) || s.values.length !== n) err(id, `chart #${i + 1} series "${s.name}" has ${s.values?.length} values for ${n} categories`); });
  });
}

console.log(`\n${targets.length} report(s) checked · ${errors} error(s) · ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
