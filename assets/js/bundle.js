// Printable bundle: stitches several reports into one document (cover + TOC + page breaks).
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const params = new URLSearchParams(location.search);
const ids = (params.get("ids") || "").split(",").map((s) => s.trim()).filter(Boolean);

async function main() {
  const cat = await fetch("catalog.json").then((r) => r.json());
  const reps = ids.map((id) => cat.reports.find((r) => r.id === id)).filter(Boolean);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  $("#cover-date").textContent = `Compiled ${today}`;
  if (params.get("title")) $("#cover-title").textContent = params.get("title");
  $("#cover-sub").textContent = reps.length ? `${reps.length} report${reps.length > 1 ? "s" : ""} from the Insights Hub` : "No reports selected.";
  $("#toc").innerHTML = reps.map((r) => `<li><span><a href="#r-${esc(r.id)}">${esc(r.title)}</a></span><small>${esc(r.area)} · ${esc((r.owners || []).map((o) => o.name).join(", "))} · ${esc(r.published)}</small></li>`).join("");

  const parser = new DOMParser();
  for (const r of reps) {
    const html = await fetch(r.url).then((x) => x.text());
    const doc = parser.parseFromString(html, "text/html");
    const base = new URL(r.url, location.href);
    // Resolve relative URLs against the report folder
    doc.querySelectorAll("[src],[href]").forEach((el) => {
      for (const a of ["src", "href"]) {
        const v = el.getAttribute(a);
        if (v && !/^(#|[a-z]+:|\/\/)/i.test(v)) el.setAttribute(a, new URL(v, base).href);
      }
    });
    const main = doc.querySelector("main") || doc.body;
    main.querySelectorAll("script:not([type='application/json'])").forEach((s) => s.remove());
    const art = document.createElement("article");
    art.className = "bundle-report";
    art.id = `r-${r.id}`;
    art.innerHTML = main.innerHTML;
    $("#bundle").appendChild(art);
  }
  window.PPCharts.renderAll(document);
  $("#status").textContent = `${reps.length} report${reps.length === 1 ? "" : "s"} ready`;
  $("#print").disabled = false;
  $("#print").addEventListener("click", () => window.print());
  if (params.get("print") === "1") setTimeout(() => window.print(), 600);
}
main().catch((e) => { $("#status").textContent = "Couldn’t build the bundle: " + e.message; });
