// Landing page: hero search, What's New carousel, area carousels, faceted results.
import { $, $$, esc, icon, mountChrome, loadCatalog, loadIndex, cardHTML, wireCardSelection, selection, toast, fmtDate } from "./core.js";
import { search, highlighter } from "./search.js";

const FACETS = [
  ["area", "Area", (r) => [r.area]],
  ["type", "Type", (r) => [r.type]],
  ["topic", "Topic", (r) => r.topics || []],
  ["owner", "Owner", (r) => (r.owners || []).map((o) => o.name)],
  ["tag", "Tag", (r) => r.tags || []],
  ["status", "Status", (r) => [r.status]],
];
const LABEL = { report: "Report", article: "Article", final: "Final", draft: "Draft", superseded: "Superseded" };

let cat, fulltext = {}, state = {};

function readState() {
  const p = new URLSearchParams(location.search);
  state = { q: p.get("q") || "", sort: p.get("sort") || "", view: p.get("view") || "" };
  for (const [k] of FACETS) state[k] = p.getAll(k);
}
function writeState(push = false) {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  for (const [k] of FACETS) for (const v of state[k]) p.append(k, v);
  if (state.sort) p.set("sort", state.sort);
  if (state.view) p.set("view", state.view);
  const url = location.pathname + (p.toString() ? "?" + p : "");
  history[push ? "pushState" : "replaceState"](null, "", url);
}
const filtering = () => state.q || state.view === "all" || FACETS.some(([k]) => state[k].length);

async function main() {
  await mountChrome("home");
  readState();
  if (state.view === "all") $$('.nav a').forEach((a) => a.toggleAttribute("aria-current", a.getAttribute("href") === "./?view=all"));
  try {
    cat = await loadCatalog();
  } catch (e) {
    $("#main").innerHTML = `<div class="empty" style="margin-top:40px">Couldn’t load <code>catalog.json</code>. Run <code>npm run build</code> and serve the site over HTTP.<br><small>${esc(e.message)}</small></div>`;
    return;
  }
  const live = cat.reports;
  const latest = live.reduce((a, r) => (r.updated > a ? r.updated : a), "");
  const people = new Set(live.flatMap((r) => (r.owners || []).map((o) => o.name)));
  $("#hero-stats").innerHTML = `<span><b>${live.filter((r) => r.type === "report").length}</b> reports</span>
    <span><b>${live.filter((r) => r.type === "article").length}</b> articles</span>
    <span><b>${cat.areas.filter((a) => a.count).length}</b> areas</span>
    <span><b>${people.size}</b> authors</span>
    <span>Last updated <b>${fmtDate(latest)}</b></span>`;

  // quick chips: most-used topics
  const topicCounts = {};
  live.forEach((r) => (r.topics || []).forEach((t) => (topicCounts[t] = (topicCounts[t] || 0) + 1)));
  $("#quick-chips").innerHTML = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([t]) => `<button type="button" data-topic="${esc(t)}">${esc(t)}</button>`).join("");
  $("#quick-chips").addEventListener("click", (e) => {
    const t = e.target.closest("[data-topic]")?.dataset.topic;
    if (t) { state.topic = [t]; writeState(true); render(); }
  });

  renderBrowse();
  wireCardSelection(document);

  // Search input
  const q = $("#q");
  q.value = state.q;
  let timer;
  q.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(async () => { state.q = q.value.trim(); await ensureIndex(); writeState(); render(); }, 120);
  });
  $("#search-form").addEventListener("submit", (e) => { e.preventDefault(); state.q = q.value.trim(); writeState(true); render(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); q.focus(); }
    if (e.key === "Escape" && document.activeElement === q && q.value) { q.value = ""; state.q = ""; writeState(); render(); }
  });
  $("#sort").addEventListener("change", (e) => { state.sort = e.target.value; writeState(); render(); });
  $("#clear-filters").addEventListener("click", () => { state = { q: "", sort: "", view: "" }; FACETS.forEach(([k]) => (state[k] = [])); q.value = ""; writeState(true); render(); });
  $("#select-all").addEventListener("click", () => {
    const ids = $$("#grid .select-toggle").map((b) => b.dataset.id);
    ids.forEach((id) => selection.has(id) || selection.toggle(id));
    toast(`${ids.length} reports selected`);
  });
  $("#facets").addEventListener("click", (e) => {
    const c = e.target.closest("[data-facet]");
    if (!c) return;
    const { facet, value } = c.dataset;
    const arr = state[facet];
    const i = arr.indexOf(value);
    if (i === -1) arr.push(value); else arr.splice(i, 1);
    writeState(); render();
  });
  document.addEventListener("click", (e) => {
    // tag chips inside cards → filter in place instead of navigating
    const a = e.target.closest('a.chip[href^="./?tag="]');
    if (!a) return;
    e.preventDefault();
    state.tag = [decodeURIComponent(a.getAttribute("href").split("=")[1])];
    writeState(true); render(); window.scrollTo({ top: 0, behavior: "smooth" });
  });
  $$("[data-scroll]").forEach((b) => {
    b.innerHTML = icon(+b.dataset.dir < 0 ? "left" : "right");
    b.addEventListener("click", () => {
      const t = $("#track-" + b.dataset.scroll);
      t.scrollBy({ left: t.clientWidth * 0.9 * +b.dataset.dir, behavior: "smooth" });
    });
  });
  window.addEventListener("popstate", () => { readState(); q.value = state.q; render(); });

  if (state.q) await ensureIndex();
  render();
}

let indexPromise;
function ensureIndex() {
  indexPromise ||= loadIndex().then((t) => (fulltext = t)).catch(() => ({}));
  return indexPromise;
}

function renderBrowse() {
  const visible = cat.reports.filter((r) => r.status !== "superseded");
  $("#track-new").innerHTML = visible.slice(0, 10).map((r) => cardHTML(r, cat)).join("");
  $("#track-areas").innerHTML = cat.areas.filter((a) => a.count).map((a) => `
    <button class="area-tile" style="--area-color:${a.color}" data-area="${esc(a.name)}">
      <span class="dot">${esc(a.name.split(/[ &]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join(""))}</span>
      <h3>${esc(a.name)}</h3><p>${esc(a.description)}</p>
      <span class="n">${a.count} ${a.count === 1 ? "item" : "items"} →</span>
    </button>`).join("");
  $("#track-areas").addEventListener("click", (e) => {
    const t = e.target.closest("[data-area]");
    if (t) { state.area = [t.dataset.area]; writeState(true); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
  $("#area-rows").innerHTML = cat.areas.filter((a) => a.count).map((a) => {
    const rs = visible.filter((r) => r.area === a.name);
    if (!rs.length) return "";
    const key = "area-" + a.slug;
    return `<section class="section" aria-labelledby="${key}-h">
      <div class="section-head">
        <div><h2 id="${key}-h">${esc(a.name)}</h2><p>${esc(a.description)}</p></div>
        <div class="actions">
          <button class="btn sm ghost" data-area-all="${esc(a.name)}">See all ${rs.length}</button>
          <button class="btn icon sm" data-scroll="${key}" data-dir="-1" aria-label="Scroll left"></button><button class="btn icon sm" data-scroll="${key}" data-dir="1" aria-label="Scroll right"></button>
        </div>
      </div>
      <div class="carousel"><div class="track" id="track-${key}">${rs.map((r) => cardHTML(r, cat)).join("")}</div></div>
    </section>`;
  }).join("");
  $("#area-rows").addEventListener("click", (e) => {
    const t = e.target.closest("[data-area-all]");
    if (t) { state.area = [t.dataset.areaAll]; writeState(true); render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });
}

function render() {
  const on = filtering();
  $("#browse").hidden = on;
  $("#results").hidden = !on;
  $("#hero").classList.toggle("compact", !!on);
  if (!on) return;

  let hits = search(cat.reports, state.q, fulltext);
  const passes = (r, skip) => FACETS.every(([k, , get]) => k === skip || !state[k].length || state[k].some((v) => get(r).includes(v)));
  const results = hits.filter(({ r }) => passes(r));

  const sort = state.sort || (state.q ? "relevance" : "newest");
  $("#sort").value = sort;
  if (sort === "newest") results.sort((a, b) => b.r.published.localeCompare(a.r.published));
  if (sort === "oldest") results.sort((a, b) => a.r.published.localeCompare(b.r.published));
  if (sort === "title") results.sort((a, b) => a.r.title.localeCompare(b.r.title));

  // facets with counts (count reflects other active filters)
  $("#facets").innerHTML = FACETS.map(([k, label, get]) => {
    const counts = {};
    hits.filter(({ r }) => passes(r, k)).forEach(({ r }) => get(r).forEach((v) => (counts[v] = (counts[v] || 0) + 1)));
    state[k].forEach((v) => (counts[v] ||= 0));
    let entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    if (k === "tag") entries = entries.slice(0, 18);
    if (!entries.length) return "";
    return `<div class="facet"><h4>${label}</h4><div class="opts">${entries.map(([v, n]) =>
      `<button class="chip ${state[k].includes(v) ? "on" : ""}" data-facet="${k}" data-value="${esc(v)}" aria-pressed="${state[k].includes(v)}">${esc(k === "tag" ? "#" + v : LABEL[v] || v)}<span class="n">${n}</span></button>`).join("")}</div></div>`;
  }).join("");

  const bits = [];
  if (state.q) bits.push(`matching “${esc(state.q)}”`);
  FACETS.forEach(([k, label]) => state[k].length && bits.push(`${label.toLowerCase()}: ${state[k].map((v) => esc(LABEL[v] || v)).join(" or ")}`));
  $("#results-title").textContent = state.q || bits.length ? `${results.length} result${results.length === 1 ? "" : "s"}` : `All ${results.length} reports & articles`;
  $("#results-sub").innerHTML = bits.join(" · ");

  const hl = highlighter(state.q);
  $("#grid").innerHTML = results.length
    ? results.map(({ r, snippet }) => cardHTML(r, cat, { snippet: state.q ? snippet : "", highlight: hl })).join("")
    : `<div class="empty" style="grid-column:1/-1">No reports match. Try fewer words or clear a filter.<br><br><button class="btn" id="empty-clear">Clear everything</button></div>`;
  $("#empty-clear")?.addEventListener("click", () => $("#clear-filters").click());
}

main();
