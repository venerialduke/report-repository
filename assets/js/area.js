// Area landing page: area.html?a=<slug>
import { $, $$, esc, icon, mountChrome, loadCatalog, loadIndex, cardHTML, wireCardSelection, selection, toast, fmtDate, relDate, avatarColor, initials } from "./core.js";
import { search, highlighter } from "./search.js";

const slug = new URLSearchParams(location.search).get("a") || "";
const state = { q: "", topic: "", type: "", sort: "newest" };
let cat, area, items, fulltext = {};

async function main() {
  const cfg = await mountChrome("area");
  cat = await loadCatalog();
  area = cat.areas.find((a) => a.slug === slug || a.name === slug);
  if (!area) {
    $("#hero").remove();
    $("#main").innerHTML = `<div class="empty" style="margin-top:48px"><h2>Area not found</h2><p>There’s no area called <code>${esc(slug)}</code>.</p>
      <p>${cat.areas.map((a) => `<a class="chip" href="area.html?a=${encodeURIComponent(a.slug)}">${esc(a.name)}</a>`).join(" ")}</p></div>`;
    return;
  }
  document.title = `${area.name} — ${cfg.siteName}`;
  document.documentElement.style.setProperty("--area-color", area.color);
  $("#hero").style.setProperty("--ac", area.color);
  items = cat.reports.filter((r) => r.area === area.name);
  const live = items.filter((r) => r.status !== "superseded");

  // ---------- hero ----------
  $("#area-mark").textContent = area.name.split(/[ &]+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join("");
  $("#area-title").textContent = area.name;
  $("#area-desc").textContent = area.intro || area.description;
  const people = new Map();
  items.forEach((r) => (r.owners || []).forEach((o) => people.set(o.name, { ...o, n: (people.get(o.name)?.n || 0) + 1 })));
  const latest = items.reduce((a, r) => (r.updated > a ? r.updated : a), "");
  const nRep = items.filter((r) => r.type === "report").length, nArt = items.filter((r) => r.type === "article").length;
  const stat = (n, one, many) => (n ? `<span><b>${n}</b> ${n === 1 ? one : many}</span>` : "");
  $("#area-stats").innerHTML = stat(nRep, "report", "reports") + stat(nArt, "article", "articles") + stat(people.size, "author", "authors")
    + (latest ? `<span>Last updated <b>${fmtDate(latest)}</b></span>` : "");
  const ids = live.map((r) => r.id);
  $("#area-actions").innerHTML = items.length ? `
    <button class="btn primary" id="act-ai">${icon("sparkle")}AI brief of this area</button>
    <button class="btn" id="act-pdf">${icon("pdf")}PDF of all ${ids.length}</button>
    <button class="btn" id="act-select">${icon("plus")}Select all</button>
    <a class="btn" href="./?area=${encodeURIComponent(area.name)}">${icon("search")}Search with filters</a>` : "";
  $("#act-ai")?.addEventListener("click", async () => (await import("./ai.js")).openAI(ids));
  $("#act-pdf")?.addEventListener("click", () => window.open(`bundle.html?ids=${ids.join(",")}&title=${encodeURIComponent(area.name)}`, "_blank"));
  $("#act-select")?.addEventListener("click", () => { ids.forEach((id) => selection.has(id) || selection.toggle(id)); toast(`${ids.length} reports selected`); });
  $("#area-switch").innerHTML = cat.areas.filter((a) => a.count).map((a) =>
    `<a href="area.html?a=${encodeURIComponent(a.slug)}" ${a.slug === area.slug ? 'aria-current="page"' : ""}><i style="background:${a.color}"></i>${esc(a.name)}</a>`).join("");

  if (!items.length) {
    ["#featured-wrap", "#digest-wrap"].forEach((s) => $(s).remove());
    $("#area-grid").innerHTML = `<div class="empty" style="grid-column:1/-1">Nothing published in ${esc(area.name)} yet. <a href="resources.html">Publish the first report →</a></div>`;
    return;
  }

  // ---------- featured ----------
  const feat = live.find((r) => r.type === "report" && r.status === "final") || live[0];
  $("#featured").innerHTML = `<article class="feature" style="--area-color:${area.color}">
    <div class="main">
      <div class="meta-top" style="font-size:12px;color:var(--text-3);display:flex;gap:8px;align-items:center">${feat.type === "article" ? '<span class="pill article">Article</span>' : '<span class="pill">Report</span>'}<span>${relDate(feat.published)}</span></div>
      <h3><a href="report.html?id=${encodeURIComponent(feat.id)}">${esc(feat.title)}</a></h3>
      <p class="sub">${esc(feat.subtitle || feat.summary)}</p>
      <div class="meta"><span>${esc((feat.owners || []).map((o) => o.name).join(", "))}</span><span>${feat.reading_minutes} min read</span><span>${feat.charts} charts</span></div>
    </div>
    ${feat.key_findings?.length ? `<div class="findings"><h4>Key findings</h4><ol>${feat.key_findings.slice(0, 4).map((f) => `<li>${esc(f)}</li>`).join("")}</ol></div>` : ""}
  </article>`;

  // ---------- digest: lead finding from each recent report ----------
  const digest = live.filter((r) => r.key_findings?.length && r.id !== feat.id).slice(0, 6);
  if (digest.length) {
    $("#digest").innerHTML = digest.map((r) => `<li style="--area-color:${area.color}"><p class="f">${esc(r.key_findings[0])}</p>
      <a href="report.html?id=${encodeURIComponent(r.id)}">${esc(r.title)} · ${fmtDate(r.published)} →</a></li>`).join("");
  } else $("#digest-wrap").remove();

  // ---------- side panels ----------
  $("#area-people").innerHTML = [...people.values()].sort((a, b) => b.n - a.n).map((o) => `
    <a class="person" href="./?owner=${encodeURIComponent(o.name)}"><span class="avatar" style="background:${avatarColor(o.name)}">${esc(initials(o.name))}</span>
    <span><span class="nm">${esc(o.name)}</span><br><small style="color:var(--text-3)">${esc(o.role || "")}</small></span><span class="n">${o.n}</span></a>`).join("");
  const topics = {};
  items.forEach((r) => (r.topics || []).forEach((t) => (topics[t] = (topics[t] || 0) + 1)));
  $("#area-topics").innerHTML = Object.entries(topics).sort((a, b) => b[1] - a[1]).map(([t, n]) =>
    `<button class="chip" data-topic="${esc(t)}">${esc(t)} <span style="opacity:.6">${n}</span></button>`).join("");
  if (area.links?.length) {
    $("#area-links-panel").hidden = false;
    $("#area-links").innerHTML = area.links.map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${icon("link")}${esc(l.label)}</a></li>`).join("");
  }

  // ---------- list with filters ----------
  $("#area-chips").innerHTML = [
    `<button class="chip" data-type="">All</button>`,
    items.some((r) => r.type === "report") ? `<button class="chip" data-type="report">Reports</button>` : "",
    items.some((r) => r.type === "article") ? `<button class="chip" data-type="article">Articles</button>` : "",
  ].join("");
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-topic]");
    if (t) { state.topic = state.topic === t.dataset.topic ? "" : t.dataset.topic; renderList(); $("#all-h").scrollIntoView({ behavior: "smooth", block: "start" }); }
    const ty = e.target.closest("[data-type]");
    if (ty) { state.type = ty.dataset.type; renderList(); }
  });
  let timer;
  $("#area-q").addEventListener("input", (e) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      state.q = e.target.value.trim();
      if (state.q && !Object.keys(fulltext).length) fulltext = await loadIndex().catch(() => ({}));
      renderList();
    }, 120);
  });
  $("#area-sort").addEventListener("change", (e) => { state.sort = e.target.value; state.sortTouched = true; renderList(); });
  wireCardSelection(document);
  renderList();
}

function renderList() {
  let rows = search(items, state.q, fulltext).filter(({ r }) =>
    (!state.topic || (r.topics || []).includes(state.topic)) && (!state.type || r.type === state.type));
  // With a query, keep relevance order unless the reader picked a sort
  if (!state.q || state.sortTouched) {
    const cmp = { newest: (a, b) => b.r.published.localeCompare(a.r.published), oldest: (a, b) => a.r.published.localeCompare(b.r.published), title: (a, b) => a.r.title.localeCompare(b.r.title) }[state.sort];
    rows.sort(cmp);
  }
  $$("#area-chips [data-type]").forEach((c) => c.classList.toggle("on", c.dataset.type === state.type));
  $$("#area-topics [data-topic]").forEach((c) => c.classList.toggle("on", c.dataset.topic === state.topic));
  const bits = [`${rows.length} of ${items.length}`];
  if (state.topic) bits.push(`topic: ${esc(state.topic)} <button class="chip" data-topic="${esc(state.topic)}" style="padding:2px 7px">× clear</button>`);
  if (state.q) bits.push(`matching “${esc(state.q)}”`);
  $("#all-sub").innerHTML = bits.join(" · ");
  const hl = highlighter(state.q);
  $("#area-grid").innerHTML = rows.length
    ? rows.map(({ r, snippet }) => cardHTML(r, cat, { snippet: state.q ? snippet : "", highlight: hl })).join("")
    : `<div class="empty" style="grid-column:1/-1">No matches in ${esc(area.name)}. <a href="./?q=${encodeURIComponent(state.q)}">Search all areas →</a></div>`;
}

main();
