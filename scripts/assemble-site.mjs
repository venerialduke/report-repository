#!/usr/bin/env node
// Copy only the public site into _site/ (what Netlify publishes). Keeps docs, scripts, skills,
// node_modules and scratch folders out of the deployed site.
// Usage: node scripts/assemble-site.mjs [outDir]
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/common.mjs";

const OUT = path.resolve(ROOT, process.argv[2] || "_site");
const INCLUDE = [
  "index.html", "area.html", "report.html", "bundle.html", "resources.html",
  "site.config.json", "catalog.json", "search-index.json", "feed.xml",
  "assets", "shared", "reports",
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let files = 0;
for (const item of INCLUDE) {
  const src = path.join(ROOT, item);
  if (!fs.existsSync(src)) { console.error(`✖ missing ${item}`); process.exit(1); }
  fs.cpSync(src, path.join(OUT, item), {
    recursive: true,
    filter: (p) => !/(^|[\\/])(\.DS_Store|__pycache__)$/.test(p),
  });
}
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
files = count(OUT);
console.log(`_site: ${files} files ready to publish (${path.relative(ROOT, OUT) || OUT})`);
