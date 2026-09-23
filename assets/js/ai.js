// AI summaries with Claude. Runs in the reader's browser with their own API key (or via a proxy
// configured in site.config.json → ai.proxyUrl). Without a key, "Copy prompt" works with any Claude app.
import { $, $$, esc, icon, loadCatalog, loadConfig, loadIndex, store, toast, fmtDate, selection } from "./core.js";

const SDK_URL = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.128.0/+esm";
const KEY = "pp-ai-key";
const MODEL = "pp-ai-model";
const MAX_REPORTS = 25;

const MODES = {
  summary: { label: "Summary", multi: false },
  exec: { label: "Exec brief", multi: false },
  synth: { label: "Synthesise", multi: true },
  ask: { label: "Ask a question", multi: false },
};

const SYSTEM = `You are the research assistant built into the Parcel & Pine Insights Hub, where the Insights team publishes internal analytics reports.
Your readers are busy colleagues across the business. Help them understand the reports quickly and accurately.

- Work only from the reports provided in <report> tags. If the answer isn't in them, say so plainly and don't fill gaps from general knowledge.
- Keep numbers exactly as the reports state them, including units, time periods and confidence intervals. Don't round in ways that change meaning.
- When more than one report is provided, name the report title in [square brackets] after each claim so readers can trace it.
- Flag caveats, draft status, or small samples when they matter for the conclusion.
- Write in plain, direct English. Use Markdown: short headings, bullets, **bold** for the few numbers that matter most. No preamble.`;

function instructions(mode, n, question) {
  if (mode === "ask") return `Answer this question using the report${n > 1 ? "s" : ""} above:\n\n${question}\n\nIf the reports only partly answer it, say what's covered, what isn't, and who the owners are so the reader can follow up.`;
  if (mode === "exec") return n > 1
    ? `Write an executive brief covering these ${n} reports for a VP with 60 seconds to spare: a one-line bottom line, then up to 6 bullets combining the most decision-relevant findings (with numbers and [report] citations), then "Decisions needed" and "Watch-outs".`
    : `Write an executive brief for a VP with 60 seconds to spare: a one-line bottom line, 3–5 bullets with the most decision-relevant findings (with numbers), then "Decisions needed" and "Watch-outs" (caveats or confidence issues). Keep it under 180 words.`;
  if (mode === "synth") return `Synthesise across these ${n} reports:
1. **Bottom line**: two sentences on what they tell us together.
2. **Common threads**: themes that show up in more than one report, with [report] citations.
3. **Tensions & differences**: where the reports disagree, use different definitions, or cover different populations or periods.
4. **Combined implications**: what the business should do, and who owns it.
5. **Gaps**: what none of the reports answer, and a suggested next analysis.`;
  return n > 1
    ? `For each report, give a heading with its title, then a 2-sentence bottom line and 3 bullets with the key numbers. Finish with one short "Across these reports" paragraph.`
    : `Summarise this report in about 150–200 words: a one-sentence bottom line, then "Key findings" (3–5 bullets with the numbers), "Recommended actions" (who does what) and "Caveats".`;
}

async function buildContext(ids) {
  const [cat, text] = await Promise.all([loadCatalog(), loadIndex().catch(() => ({}))]);
  const reps = ids.map((id) => cat.reports.find((r) => r.id === id)).filter(Boolean).slice(0, MAX_REPORTS);
  const blocks = reps.map((r) => `<report id="${r.id}" title="${r.title.replace(/"/g, "'")}">
Area: ${r.area} · Type: ${r.type} · Status: ${r.status}
Published: ${r.published}${r.updated && r.updated !== r.published ? ` (updated ${r.updated})` : ""}
Owners: ${(r.owners || []).map((o) => `${o.name}${o.role ? ` (${o.role})` : ""}`).join(", ")}
Author summary: ${r.summary}
${r.key_findings?.length ? "Author key findings:\n" + r.key_findings.map((f) => "- " + f).join("\n") + "\n" : ""}
Full text:
${text[r.id] || "(full text unavailable)"}
</report>`);
  return { reps, context: blocks.join("\n\n") };
}

// ---------- tiny, safe markdown ----------
function md(src) {
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const line of src.split("\n")) {
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) { close(); out.push(`<h3>${inline(m[2])}</h3>`); }
    else if ((m = line.match(/^\s*[-*•]\s+(.*)/))) { if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) { if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; } out.push(`<li>${inline(m[1])}</li>`); }
    else if (!line.trim()) close();
    else { close(); out.push(`<p>${inline(line)}</p>`); }
  }
  close();
  return out.join("");
}

// ---------- dialog plumbing ----------
function dialog(id, html) {
  // Always build a fresh element so listeners from a previous opening don't pile up.
  document.getElementById(id)?.remove();
  const d = document.createElement("dialog");
  d.id = id;
  d.className = "modal";
  document.body.appendChild(d);
  d.innerHTML = html;
  d.addEventListener("click", (e) => { if (e.target === d || e.target.closest("[data-close]")) d.close(); });
  d.showModal();
  return d;
}

const getKey = () => store.get(KEY, "") || sessionStorage.getItem(KEY) || "";

export async function openSettings(onSaved) {
  const cfg = await loadConfig();
  const key = getKey();
  const d = dialog("ai-settings", `
    <div class="modal-head"><h2>${icon("gear")} AI settings</h2><button class="btn ghost icon" data-close aria-label="Close">${icon("x")}</button></div>
    <form class="modal-body" id="ai-settings-form">
      ${cfg.ai?.proxyUrl ? `<div class="notice">This hub uses a shared AI gateway, so you don’t need your own key.</div>` : `
      <p style="margin-top:0;color:var(--text-2);font-size:14px">AI features call the Claude API directly from your browser. Add an Anthropic API key to turn them on. Without one, you can still use <b>Copy prompt</b> and paste it into Claude.</p>
      <div class="field"><label for="ai-key">Anthropic API key</label>
        <input class="input" id="ai-key" type="password" autocomplete="off" placeholder="sk-ant-…" value="${esc(key)}">
        <span class="hint">Stored only in this browser. It’s sent only to api.anthropic.com, never to this site or GitHub.</span></div>
      <label style="display:flex;gap:8px;align-items:center;font-size:14px"><input type="checkbox" id="ai-remember" ${store.get(KEY, "") ? "checked" : ""}> Remember on this device (otherwise it’s kept for this tab only)</label>`}
      <div class="field"><label for="ai-model">Model</label>
        <input class="input" id="ai-model" value="${esc(store.get(MODEL, "") || cfg.ai?.model || "claude-opus-5")}">
        <span class="hint">Default: ${esc(cfg.ai?.model || "claude-opus-5")}</span></div>
      <div class="notice" style="margin-top:10px">When you generate a summary, the text of the selected reports is sent to Anthropic’s API. Follow your data-handling policy for internal documents.</div>
    </form>
    <div class="modal-foot">
      ${key ? `<button class="btn ghost" id="ai-forget">Forget key</button>` : ""}
      <button class="btn" data-close>Cancel</button><button class="btn primary" id="ai-save">Save</button>
    </div>`);
  $("#ai-settings-form", d).addEventListener("submit", (e) => { e.preventDefault(); $("#ai-save", d).click(); });
  $("#ai-forget", d)?.addEventListener("click", () => { store.del(KEY); sessionStorage.removeItem(KEY); toast("API key removed"); d.close(); });
  $("#ai-save", d).addEventListener("click", () => {
    const k = $("#ai-key", d)?.value.trim();
    if (k !== undefined) {
      store.del(KEY); sessionStorage.removeItem(KEY);
      if (k) { if ($("#ai-remember", d).checked) store.set(KEY, k); else sessionStorage.setItem(KEY, k); }
    }
    const m = $("#ai-model", d).value.trim();
    if (m && m !== cfg.ai?.model) store.set(MODEL, m); else store.del(MODEL);
    d.close();
    toast("AI settings saved");
    onSaved?.();
  });
}

export async function openAI(initialIds) {
  const cfg = await loadConfig();
  const cat = await loadCatalog();
  let ids = [...new Set(initialIds)].filter((id) => cat.reports.some((r) => r.id === id));
  let mode = ids.length > 1 ? "synth" : "summary";
  let running = null;

  const d = dialog("ai-dialog", `
    <div class="modal-head"><h2>${icon("sparkle")} AI summary</h2><button class="btn ghost icon" data-close aria-label="Close">${icon("x")}</button></div>
    <div class="modal-body">
      <div style="font-size:13px;font-weight:600;margin-bottom:4px">Reports</div>
      <div class="ai-sel" id="ai-sel"></div>
      <div class="seg" id="ai-modes" role="group" aria-label="Mode"></div>
      <div class="field" id="ai-q-wrap" hidden><label for="ai-q">Your question</label>
        <textarea class="input" id="ai-q" placeholder="e.g. What should the Retention squad do first, and how confident are we?"></textarea></div>
      <div id="ai-keynote"></div>
      <div class="ai-out" id="ai-out" aria-live="polite"><span class="muted">Choose a mode, then select <b>Generate</b>.</span></div>
    </div>
    <div class="modal-foot">
      <button class="btn ghost" id="ai-settings">${icon("gear")}Settings</button>
      <span style="flex:1"></span>
      <button class="btn" id="ai-copy-prompt" title="Copy the full prompt (with report text) to paste into Claude">${icon("copy")}Copy prompt</button>
      <button class="btn" id="ai-copy-out" hidden>${icon("copy")}Copy result</button>
      <button class="btn primary" id="ai-go">${icon("sparkle")}Generate</button>
    </div>`);
  d.addEventListener("close", () => running?.abort(), { once: true });

  const paint = () => {
    const sel = ids.map((id) => cat.reports.find((r) => r.id === id));
    const extra = selection.ids().filter((id) => !ids.includes(id) && cat.reports.some((r) => r.id === id));
    $("#ai-sel", d).innerHTML = sel.map((r) => `<span class="chip on" title="${esc(r.title)}">${esc(r.title.length > 48 ? r.title.slice(0, 46) + "…" : r.title)}${ids.length > 1 ? `<button data-rm="${esc(r.id)}" aria-label="Remove" style="border:0;background:none;color:inherit;cursor:pointer;padding:0 0 0 4px">×</button>` : ""}</span>`).join("")
      + (extra.length ? `<button class="chip" id="ai-add-sel">+ Add ${extra.length} selected</button>` : "");
    if (!MODES[mode] || (MODES[mode].multi && ids.length < 2)) mode = "summary";
    $("#ai-modes", d).innerHTML = Object.entries(MODES).filter(([, m]) => !m.multi || ids.length > 1)
      .map(([k, m]) => `<button type="button" data-mode="${k}" aria-pressed="${k === mode}">${m.label}</button>`).join("");
    $("#ai-q-wrap", d).hidden = mode !== "ask";
    const hasKey = !!(getKey() || cfg.ai?.proxyUrl);
    $("#ai-keynote", d).innerHTML = hasKey ? "" : `<div class="notice warn" style="margin-top:12px">No API key set. <a href="#" id="ai-add-key">Add a key</a> to generate here, or use <b>Copy prompt</b> and paste it into <a href="https://claude.ai/new" target="_blank" rel="noopener">Claude</a>.</div>`;
    $("#ai-add-key", d)?.addEventListener("click", (e) => { e.preventDefault(); openSettings(() => openAI(ids)); });
    $("#ai-go", d).disabled = !hasKey;
  };
  paint();

  d.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mode]")?.dataset.mode;
    if (m) { mode = m; paint(); if (m === "ask") $("#ai-q", d).focus(); }
    const rm = e.target.closest("[data-rm]")?.dataset.rm;
    if (rm) { ids = ids.filter((x) => x !== rm); paint(); }
    if (e.target.closest("#ai-add-sel")) { ids = [...new Set([...ids, ...selection.ids()])]; mode = "synth"; paint(); }
  });
  $("#ai-settings", d).addEventListener("click", () => openSettings(() => openAI(ids)));

  const prompt = async () => {
    const q = $("#ai-q", d).value.trim();
    if (mode === "ask" && !q) { $("#ai-q", d).focus(); toast("Type a question first"); return null; }
    const { context, reps } = await buildContext(ids);
    return { user: `${context}\n\n${instructions(mode, reps.length, q)}`, reps };
  };

  $("#ai-copy-prompt", d).addEventListener("click", async () => {
    const p = await prompt();
    if (!p) return;
    try { await navigator.clipboard.writeText(`${SYSTEM}\n\n${p.user}`); toast("Prompt copied. Paste it into Claude."); }
    catch { toast("Couldn’t access the clipboard"); }
  });
  $("#ai-copy-out", d).addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("#ai-out", d).dataset.raw || ""); toast("Result copied"); } catch { /* */ }
  });

  $("#ai-go", d).addEventListener("click", async () => {
    const p = await prompt();
    if (!p) return;
    const out = $("#ai-out", d);
    const go = $("#ai-go", d);
    running?.abort();
    out.classList.add("loading");
    out.innerHTML = `<span class="muted">Reading ${p.reps.length} report${p.reps.length > 1 ? "s" : ""}…</span>`;
    go.disabled = true;
    $("#ai-copy-out", d).hidden = true;
    let raw = "";
    try {
      const { default: Anthropic } = await import(SDK_URL);
      const client = new Anthropic({
        apiKey: getKey() || "via-proxy",
        baseURL: cfg.ai?.proxyUrl || undefined,
        dangerouslyAllowBrowser: true,
      });
      const model = store.get(MODEL, "") || cfg.ai?.model || "claude-opus-5";
      const params = {
        model,
        max_tokens: cfg.ai?.maxTokens || 4000,
        system: SYSTEM,
        messages: [{ role: "user", content: p.user }],
        output_config: { effort: "medium" },
      };
      // Server-side refusal fallbacks are supported on these models; omit elsewhere.
      const withFallback = ["claude-opus-5", "claude-fable-5-1"].includes(model);
      const stream = withFallback
        ? client.beta.messages.stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
        : client.messages.stream(params);
      running = stream;
      stream.on("text", (t) => { raw += t; out.innerHTML = md(raw); });
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") raw += "\n\n*The model declined to complete this request.*";
      if (msg.stop_reason === "max_tokens") raw += "\n\n*Stopped at the length limit.*";
      out.innerHTML = md(raw) + `<p class="muted" style="font-size:12px;margin-top:12px">Generated by ${esc(msg.model)} from ${p.reps.length} report${p.reps.length > 1 ? "s" : ""} · ${fmtDate(new Date().toISOString().slice(0, 10))}. Check anything important against the source report.</p>`;
      out.dataset.raw = raw;
      $("#ai-copy-out", d).hidden = false;
    } catch (err) {
      if (err?.name === "AbortError" || /abort/i.test(err?.message || "")) return;
      const status = err?.status;
      const why = status === 401 ? "The API key was rejected. Check it in Settings."
        : status === 429 ? "Rate limited. Wait a moment and try again."
        : status === 400 ? `The API rejected the request: ${err.message}`
        : status >= 500 ? "The Claude API is having trouble. Try again shortly."
        : `Couldn’t reach the Claude API (${err?.message || err}). Your network may block it. Use Copy prompt instead.`;
      out.innerHTML = (raw ? md(raw) : "") + `<div class="notice warn">${esc(why)}</div>`;
    } finally {
      out.classList.remove("loading");
      go.disabled = false;
      running = null;
    }
  });
}
