#!/usr/bin/env node
// Pre-generate AI summaries for every report with Claude, cached in data/ai-summaries.json.
// Only new or changed reports (by content hash) are sent to the API.
// Usage: ANTHROPIC_API_KEY=... node scripts/generate-summaries.mjs [--force] [id ...]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { ROOT, REPORTS_DIR, readJSON, reportDirs, extract, config } from "./lib/common.mjs";

const CACHE = path.join(ROOT, "data/ai-summaries.json");
const args = process.argv.slice(2);
const force = args.includes("--force");
const only = args.filter((a) => !a.startsWith("--"));
const model = process.env.AI_MODEL || config().ai?.model || "claude-opus-5";

if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
  console.log("No ANTHROPIC_API_KEY set; skipping AI summaries.");
  process.exit(0);
}

const SYSTEM = `You write the "AI summary" panel for internal analytics reports on the Parcel & Pine Insights Hub.
Readers see it beside the report, so it has to make sense by itself and be accurate.
- Use only the report. Keep numbers exactly as stated, with their comparisons and units.
- Write 2 short paragraphs of plain text (no Markdown, no bullets, no headings): first the bottom line and the 2–3 findings that matter most; then what the authors recommend and the most important caveat.
- 90–130 words in total. No preamble such as "This report…"; start with the finding.`;

const cache = fs.existsSync(CACHE) ? readJSON(CACHE) : {};
const client = new Anthropic();
let made = 0, skipped = 0, failed = 0;

for (const id of reportDirs()) {
  if (only.length && !only.includes(id)) continue;
  const dir = path.join(REPORTS_DIR, id);
  const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  const meta = readJSON(path.join(dir, "report.json"));
  const hash = crypto.createHash("sha256").update(html).update(JSON.stringify(meta)).digest("hex").slice(0, 16);
  if (!force && cache[id]?.hash === hash) { skipped++; continue; }

  const { text } = extract(html);
  try {
    const params = {
      model,
      max_tokens: 16000,
      system: SYSTEM,
      output_config: { effort: "medium" },
      messages: [{ role: "user", content: `<report title="${meta.title.replace(/"/g, "'")}" status="${meta.status}">\n${text}\n</report>\n\nWrite the AI summary panel for this report.` }],
    };
    const withFallback = ["claude-opus-5", "claude-fable-5-1"].includes(model);
    const msg = withFallback
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await client.messages.create(params);
    if (msg.stop_reason === "refusal") { console.warn(`⚠ ${id}: model declined; leaving previous summary`); failed++; continue; }
    const summary = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
    if (!summary) { failed++; continue; }
    cache[id] = { hash, model: msg.model, generated: new Date().toISOString().slice(0, 10), summary };
    made++;
    console.log(`✓ ${id}`);
  } catch (e) {
    failed++;
    console.error(`✖ ${id}: ${e.status || ""} ${e.message}`);
    if (e instanceof Anthropic.AuthenticationError) break;
  }
}

// Drop entries for deleted reports
const live = new Set(reportDirs());
for (const id of Object.keys(cache)) if (!live.has(id)) delete cache[id];

fs.mkdirSync(path.dirname(CACHE), { recursive: true });
fs.writeFileSync(CACHE, JSON.stringify(cache, null, 2) + "\n");
console.log(`AI summaries: ${made} generated, ${skipped} unchanged, ${failed} failed`);
