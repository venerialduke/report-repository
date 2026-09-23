// Client-side search: weighted fields + full text, prefix matching, snippets. No dependencies.
import { esc } from "./core.js";

const STOP = new Set("a an and are as at be by for from how in into is it of on or our that the this to was we what when where which who why with vs".split(" "));
const FIELDS = [
  ["title", 10], ["tags", 6], ["topics", 6], ["area", 3], ["owners", 4],
  ["summary", 3], ["key_findings", 3], ["headings", 2], ["subtitle", 2], ["text", 1],
];

export const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
export function tokens(q) {
  return norm(q).split(/[^a-z0-9$%.+]+/).map((t) => t.replace(/^\.+|\.+$/g, "")).filter((t) => t && !STOP.has(t));
}

function fieldText(r, f, fulltext) {
  if (f === "text") return fulltext[r.id] || "";
  if (f === "owners") return (r.owners || []).map((o) => o.name).join(" ");
  const v = r[f];
  return Array.isArray(v) ? v.join(" ") : v || "";
}

/** Score reports against a query. Returns [{r, score, snippet}] sorted by score. */
export function search(reports, q, fulltext = {}) {
  const toks = tokens(q);
  if (!toks.length) return reports.map((r) => ({ r, score: 0, snippet: "" }));
  const phrase = norm(q).trim();
  const out = [];
  for (const r of reports) {
    let score = 0, matchedAll = true;
    const docs = FIELDS.map(([f, w]) => [norm(fieldText(r, f, fulltext)), w, f]);
    for (const [i, t] of toks.entries()) {
      const last = i === toks.length - 1;
      const re = new RegExp(`(^|[^a-z0-9])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${last ? "" : "(?![a-z0-9])"}`, "g");
      let tokScore = 0;
      for (const [d, w] of docs) {
        const n = (d.match(re) || []).length;
        if (n) tokScore += w * (1 + Math.log(n));
      }
      if (!tokScore) matchedAll = false;
      score += tokScore;
    }
    if (!matchedAll) continue; // AND semantics
    if (phrase.includes(" ") && norm(r.title).includes(phrase)) score += 25;
    if (phrase.includes(" ") && norm(fulltext[r.id] || "").includes(phrase)) score += 6;
    out.push({ r, score, snippet: snippetFor(fulltext[r.id] || "", toks) });
  }
  return out.sort((a, b) => b.score - a.score);
}

export function highlighter(q) {
  const toks = tokens(q).filter((t) => t.length > 1);
  if (!toks.length) return (s) => s;
  const re = new RegExp(`(${toks.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  // operate on escaped html text only (no tags inside)
  return (html) => html.replace(re, "<mark>$1</mark>");
}

function snippetFor(text, toks) {
  if (!text) return "";
  const lower = norm(text);
  // Prefer a match in the body over one in the masthead (title/subtitle are already on the card)
  let at = -1;
  for (const t of toks) {
    const body = lower.indexOf(t, Math.min(400, lower.length));
    at = body !== -1 ? body : lower.indexOf(t);
    if (at !== -1) break;
  }
  if (at === -1) return "";
  const start = Math.max(0, lower.lastIndexOf("\n", at) + 1, at - 90);
  let end = Math.min(text.length, at + 150);
  const nl = text.indexOf("\n", at);
  if (nl !== -1 && nl < end && nl - start > 60) end = nl;
  const raw = (start > 0 ? "…" : "") + text.slice(start, end).replace(/\n/g, " ") + (end < text.length ? "…" : "");
  return highlighter(toks.join(" "))(esc(raw));
}
