// Insights Hub — shared helpers: data loading, header, theme, selection, cards.

const cache = {};
async function getJSON(url) {
  if (!cache[url]) cache[url] = fetch(url, { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
    return r.json();
  });
  return cache[url];
}
export const loadConfig = () => getJSON("site.config.json");
export const loadCatalog = () => getJSON("catalog.json");
export const loadIndex = () => getJSON("search-index.json").then((rows) => Object.fromEntries(rows.map((r) => [r.id, r.text])));

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function fmtDate(iso, opts = { month: "short", day: "numeric", year: "numeric" }) {
  if (!iso) return "";
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", opts);
}
export function daysAgo(iso) {
  return Math.round((Date.now() - new Date(iso + "T12:00:00").getTime()) / 864e5);
}
export function relDate(iso) {
  const d = daysAgo(iso);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 14) return `${d} days ago`;
  return fmtDate(iso);
}

export const store = {
  get(k, fb) { try { const v = localStorage.getItem(k); return v === null ? fb : JSON.parse(v); } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};

// ---------- icons ----------
const P = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  check: '<path d="M5 12.5 10 17l9-10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  pdf: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h4M10 17h4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  db: '<ellipse cx="12" cy="5.5" rx="7" ry="2.5"/><path d="M5 5.5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-13M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  back: '<path d="M15 6l-6 6 6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  rss: '<path d="M5 11a8 8 0 0 1 8 8M5 5a14 14 0 0 1 14 14"/><circle cx="6" cy="18" r="1.3"/>',
  file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
};
export const icon = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ""}</svg>`;

// ---------- theme ----------
export function initTheme() {
  const t = store.get("pp-theme", null);
  if (t) document.documentElement.dataset.theme = t;
}
function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}
function toggleTheme() {
  const next = isDark() ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  store.set("pp-theme", next);
  renderThemeBtn();
}
function renderThemeBtn() {
  const b = $("#theme-btn");
  if (b) { b.innerHTML = icon(isDark() ? "sun" : "moon"); b.title = isDark() ? "Light mode" : "Dark mode"; }
}

// ---------- header / footer ----------
export async function mountChrome(active) {
  initTheme();
  const cfg = await loadConfig();
  const header = document.createElement("header");
  header.className = "topbar";
  header.innerHTML = `<div class="wrap">
    <a class="brand" href="./"><img src="shared/brand/logo.svg" alt="">${esc(cfg.siteName)} <small>· ${esc(cfg.orgName)}</small></a>
    <nav class="nav" aria-label="Main">
      <a href="./" ${active === "home" ? 'aria-current="page"' : ""}>Browse</a>
      <a href="./?view=all" ${active === "all" ? 'aria-current="page"' : ""}>All reports</a>
      <a href="resources.html" ${active === "resources" ? 'aria-current="page"' : ""}>Resources</a>
    </nav>
    <span class="spacer"></span>
    ${active === "home" || active === "all" ? "" : `<form class="top-search" action="./" role="search">${icon("search")}<input name="q" type="search" placeholder="Search reports…" aria-label="Search reports"></form>`}
    <button class="btn ghost icon" id="ai-settings-btn" title="AI settings" aria-label="AI settings">${icon("gear")}</button>
    <button class="btn ghost icon" id="theme-btn" aria-label="Toggle dark mode"></button>
  </div>`;
  document.body.prepend(header);
  renderThemeBtn();
  $("#theme-btn").addEventListener("click", toggleTheme);
  $("#ai-settings-btn").addEventListener("click", async () => (await import("./ai.js")).openSettings());

  const foot = document.createElement("footer");
  foot.className = "site-foot";
  foot.innerHTML = `<div class="wrap foot-areas" aria-label="Areas">${(cfg.areas || []).map((a) => `<a href="area.html?a=${encodeURIComponent(a.slug)}"><i style="background:${a.color}"></i>${esc(a.name)}</a>`).join("")}</div>
    <div class="wrap"><span>${esc(cfg.orgName)} Insights · Internal prototype hosted on GitHub Pages</span>
    <span><a href="resources.html">Contribute a report</a> · <a href="feed.xml">RSS</a> · Questions? ${esc(cfg.helpChannel || "")}</span></div>`;
  document.body.appendChild(foot);
  mountTray();
  return cfg;
}

export function toast(msg) {
  // Inside an open modal the toast must live in the dialog (top layer) to be visible
  const host = $("dialog[open]") || document.body;
  let t = $(".toast", host);
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); host.appendChild(t); }
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("on"), 2200);
}

// ---------- selection ----------
const SEL = "pp-selection";
export const selection = {
  ids() { return store.get(SEL, []); },
  has(id) { return this.ids().includes(id); },
  toggle(id) {
    const ids = this.ids();
    const i = ids.indexOf(id);
    if (i === -1) ids.push(id); else ids.splice(i, 1);
    store.set(SEL, ids);
    window.dispatchEvent(new CustomEvent("selection-change"));
    return i === -1;
  },
  clear() { store.set(SEL, []); window.dispatchEvent(new CustomEvent("selection-change")); },
};
window.addEventListener("storage", (e) => { if (e.key === SEL) window.dispatchEvent(new CustomEvent("selection-change")); });

async function mountTray() {
  const tray = document.createElement("div");
  tray.className = "tray";
  tray.hidden = true;
  tray.setAttribute("role", "region");
  tray.setAttribute("aria-label", "Selected reports");
  document.body.appendChild(tray);
  const cat = await loadCatalog().catch(() => ({ reports: [] }));
  const byId = Object.fromEntries(cat.reports.map((r) => [r.id, r]));
  const render = () => {
    const ids = selection.ids().filter((id) => byId[id]);
    tray.hidden = !ids.length;
    tray.innerHTML = `<span class="label">${ids.length} selected</span>
      <span class="names">${esc(ids.map((id) => byId[id].title).join(" · "))}</span>
      <button class="btn sm primary" data-act="ai">${icon("sparkle")}<span class="txt">AI summary</span></button>
      <button class="btn sm" data-act="pdf">${icon("pdf")}<span class="txt">PDF bundle</span></button>
      <button class="btn sm" data-act="clear" title="Clear selection" aria-label="Clear selection">${icon("x")}</button>`;
    $$(".select-toggle").forEach((b) => b.setAttribute("aria-pressed", String(ids.includes(b.dataset.id))));
  };
  tray.addEventListener("click", async (e) => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    const ids = selection.ids();
    if (act === "clear") selection.clear();
    if (act === "pdf") window.open(`bundle.html?ids=${ids.map(encodeURIComponent).join(",")}`, "_blank");
    if (act === "ai") (await import("./ai.js")).openAI(ids);
  });
  window.addEventListener("selection-change", render);
  render();
}

// ---------- cards ----------
const AV = ["#2a78d6", "#eb6834", "#1baf7a", "#4a3aa7", "#e34948", "#008300", "#c8643b", "#1d4a3c"];
export function avatarColor(name) { let h = 0; for (const c of name || "") h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; }
export const initials = (n) => (n || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function areaSlug(cat, areaName) {
  return (cat.areas.find((a) => a.name === areaName) || {}).slug || "";
}
export const areaURL = (cat, areaName) => `area.html?a=${encodeURIComponent(areaSlug(cat, areaName))}`;

export function areaColor(cat, areaName) {
  return (cat.areas.find((a) => a.name === areaName) || {}).color || "var(--accent)";
}

export function cardHTML(r, cat, { snippet = "", highlight = null } = {}) {
  const hl = (s) => (highlight ? highlight(esc(s)) : esc(s));
  const isNew = daysAgo(r.published) <= 21;
  const pills = [
    r.type === "article" ? '<span class="pill article">Article</span>' : "",
    r.status === "draft" ? '<span class="pill draft">Draft</span>' : "",
    r.status === "superseded" ? '<span class="pill superseded">Superseded</span>' : "",
    isNew && r.status !== "draft" ? '<span class="pill new">New</span>' : "",
  ].join("");
  const sel = selection.has(r.id);
  return `<article class="card" style="--area-color:${areaColor(cat, r.area)}">
    <div class="band"></div>
    <button class="select-toggle" data-id="${esc(r.id)}" aria-pressed="${sel}" title="Select for AI summary / PDF bundle" aria-label="Select ${esc(r.title)}">${icon("check")}</button>
    <div class="body">
      <div class="meta-top"><a class="area" href="${areaURL(cat, r.area)}">${esc(r.area)}</a>${pills}</div>
      <h3><a href="report.html?id=${encodeURIComponent(r.id)}">${hl(r.title)}</a></h3>
      <p class="summary">${hl(r.summary)}</p>
      ${snippet ? `<p class="snippet"><span>${snippet}</span></p>` : ""}
      <div class="tags">${(r.tags || []).slice(0, 4).map((t) => `<a class="chip" href="./?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}</div>
    </div>
    <div class="foot"><span class="owners">${esc((r.owners || []).map((o) => o.name).join(", "))}</span><span title="Published ${esc(r.published)}">${relDate(r.published)} · ${r.reading_minutes} min</span></div>
  </article>`;
}

export function wireCardSelection(root = document) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest(".select-toggle");
    if (!b) return;
    e.preventDefault();
    const on = selection.toggle(b.dataset.id);
    b.setAttribute("aria-pressed", String(on));
    toast(on ? "Added to selection" : "Removed from selection");
  });
}
