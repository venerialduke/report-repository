// Comments: giscus (GitHub Discussions) when configured; otherwise a local, browser-only prototype.
import { $, esc, store, avatarColor, initials, toast } from "./core.js";

export function mountComments(el, report, cfg) {
  const g = cfg.comments?.giscus || {};
  const giscusReady = cfg.comments?.provider === "giscus" && g.repo && g.repoId && g.categoryId;
  el.innerHTML = `<h2 id="comments-h">Discussion</h2><div id="comments-body"></div>`;
  if (giscusReady) return mountGiscus($("#comments-body", el), report, g);
  mountLocal($("#comments-body", el), report);
}

function mountGiscus(el, report, g) {
  const theme = document.documentElement.dataset.theme || g.theme || "preferred_color_scheme";
  const s = document.createElement("script");
  s.src = "https://giscus.app/client.js";
  Object.entries({
    repo: g.repo, "repo-id": g.repoId, category: g.category, "category-id": g.categoryId,
    mapping: "specific", term: `report:${report.id}`, strict: "1", "reactions-enabled": "1",
    "emit-metadata": "0", "input-position": "top", theme, lang: "en", loading: "lazy",
  }).forEach(([k, v]) => s.setAttribute("data-" + k, v));
  s.crossOrigin = "anonymous";
  s.async = true;
  el.appendChild(s);
}

function mountLocal(el, report) {
  const KEY = `pp-comments:${report.id}`;
  const me = store.get("pp-comment-name", "");
  const render = () => {
    const list = store.get(KEY, []);
    el.innerHTML = `
      <div class="notice warn" style="margin-bottom:12px"><b>Prototype mode:</b> comments are saved in this browser only, so other readers can’t see them.
      To share comments, turn on GitHub Discussions + <a href="https://giscus.app" target="_blank" rel="noopener">giscus</a> (see <code>docs/COMMENTS.md</code>).</div>
      ${list.length ? "" : `<p style="color:var(--text-3);font-size:14px">No comments yet. Questions, caveats or follow-ups for the authors go here.</p>`}
      ${list.map((c, i) => `<div class="comment">
          <span class="avatar" style="background:${avatarColor(c.name)}">${esc(initials(c.name))}</span>
          <div style="flex:1;min-width:0"><div class="who">${esc(c.name)}<span class="when">${new Date(c.at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></div>
          <p>${esc(c.text)}</p>
          <button class="btn sm ghost" data-del="${i}" style="margin-top:4px;padding:0 6px;height:24px;font-size:12px">Delete</button></div>
        </div>`).join("")}
      <form class="comment-form">
        <div class="row"><input class="input" name="name" placeholder="Your name" required value="${esc(me)}" aria-label="Your name"></div>
        <textarea class="input" name="text" placeholder="Add a comment or question for the authors…" required aria-label="Comment"></textarea>
        <div><button class="btn primary" type="submit">Post comment</button></div>
      </form>`;
    $("form", el).addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const name = String(f.get("name")).trim(), text = String(f.get("text")).trim();
      if (!name || !text) return;
      store.set("pp-comment-name", name);
      store.set(KEY, [...store.get(KEY, []), { name, text, at: new Date().toISOString() }]);
      render();
      toast("Comment saved (this browser only)");
    });
    el.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
      const l = store.get(KEY, []);
      l.splice(+b.dataset.del, 1);
      store.set(KEY, l);
      render();
    }));
  };
  render();
}
