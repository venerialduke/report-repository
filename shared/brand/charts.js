/*
 * Parcel & Pine Insights — declarative charts (no dependencies)
 *
 * Usage in a report:
 *   <div class="pp-chart">
 *     <script type="application/json">
 *       { "type": "column", "categories": ["Q1","Q2"], "series": [{"name": "Orders", "values": [120, 140]}], "format": "num" }
 *     </script>
 *   </div>
 *   <script src="../../shared/brand/charts.js"></script>   (auto-renders on load)
 *
 * Types:   column | bar | line | stacked | stacked-bar
 * Series: {name, values, color?}  color may be "series-1".."series-8" to pin a palette slot across charts
 * Options: format ("num" | "pct" | "pct1" | "pp" | "usd" | "usd2" | "x" | {prefix, suffix, decimals, compact})
 *          yMin, yMax, height, highlight: [category...], ref: {value, label}, labels: bool, yLabel
 *          downloads: false  (hide the Expand / Download toolbar for this chart; for a whole report use
 *                             <meta name="pp:downloads" content="false">)
 * Charts are data-first: the JSON is also exposed as a table (accessibility, AI and print friendly),
 * and every chart gets an Expand button (enlarged view) plus CSV, copy, PNG and SVG downloads.
 */
(function (global) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var SERIES = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8"];
  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  var curDoc = document; // document being rendered into (the hub page when a chart opens in its modal)
  var FALLBACK = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

  function cssVar(el, name, fb) {
    var v = (el.ownerDocument.defaultView || global).getComputedStyle(el).getPropertyValue(name).trim();
    return v || fb;
  }
  function colorFor(el, i, s) {
    // "color": "series-3" pins a palette slot (keeps an entity's colour stable across charts); hex also accepted
    var slot = s && typeof s.color === "string" && s.color.match(/^series-([1-8])$/);
    if (slot) return cssVar(el, "--series-" + slot[1], FALLBACK[slot[1] - 1]);
    if (s && s.color) return s.color;
    return cssVar(el, SERIES[i % 8], FALLBACK[i % 8]);
  }
  function h(tag, attrs, parent) {
    var n = (parent ? parent.ownerDocument : curDoc).createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- formatting ----------
  function fmtSpec(f) {
    if (!f) return { decimals: null, compact: true };
    if (typeof f === "object") return f;
    return ({
      num: { compact: true },
      int: { decimals: 0 },
      dec1: { decimals: 1 },
      pct: { suffix: "%", decimals: 0 },
      pct1: { suffix: "%", decimals: 1 },
      pp: { suffix: " pp", decimals: 1 },
      usd: { prefix: "$", compact: true },
      usd2: { prefix: "$", decimals: 2 },
      x: { suffix: "×", decimals: 1 },
      min: { suffix: " min", decimals: 0 },
      days: { suffix: " d", decimals: 1 },
      hrs: { suffix: " h", decimals: 1 }
    })[f] || { compact: true };
  }
  function formatter(f) {
    var s = fmtSpec(f);
    return function (v, forAxis) {
      if (v === null || v === undefined || isNaN(v)) return "–";
      var neg = v < 0, a = Math.abs(v), out;
      if (s.compact) {
        if (a >= 1e9) out = trim(a / 1e9, 1) + "B";
        else if (a >= 1e6) out = trim(a / 1e6, 1) + "M";
        else if (a >= 1e4) out = trim(a / 1e3, forAxis ? 0 : 1) + "k";
        else out = a.toLocaleString("en-US", { maximumFractionDigits: s.decimals != null ? s.decimals : (a < 10 ? 1 : 0) });
      } else {
        var d = s.decimals != null ? s.decimals : 0;
        if (forAxis && Math.round(a) === a) d = 0;
        out = a.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
      }
      return (neg ? "−" : "") + (s.prefix || "") + out + (s.suffix || "");
    };
  }
  function trim(n, d) { return String(+n.toFixed(d)); }

  function niceTicks(min, max, count) {
    if (min === max) { max = min + 1; }
    var span = max - min, step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = (span / count) / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5; else if (err >= 1.5) step *= 2;
    var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
    for (var v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(10));
    return t;
  }
  function textW(str, size, bold) { return String(str).length * (size || 12) * (bold ? 0.64 : 0.58); }

  // ---------- core ----------
  function parse(el) {
    if (el.__ppCfg) return el.__ppCfg;
    var src = el.querySelector('script[type="application/json"]');
    var raw = src ? src.textContent : el.getAttribute("data-chart");
    try { el.__ppCfg = JSON.parse(raw); } catch (e) { console.error("pp-chart: bad JSON", e, el); el.__ppCfg = null; }
    return el.__ppCfg;
  }

  function render(el) {
    var cfg = parse(el);
    if (!cfg) return;
    curDoc = el.ownerDocument;
    Array.prototype.slice.call(el.children).forEach(function (c) { if (c.tagName !== "SCRIPT") el.removeChild(c); });
    var type = cfg.type || "column";
    var cats = cfg.categories || [];
    var series = (cfg.series || []).map(function (s, i) { return { name: s.name, values: s.values, color: colorFor(el, i, s) }; });
    var fmt = formatter(cfg.format);
    var W = Math.max(280, Math.round(el.clientWidth || 720));
    var multi = series.length > 1;

    if (multi) {
      var ul = curDoc.createElement("ul");
      ul.className = "pp-chart-legend";
      series.forEach(function (s) {
        ul.insertAdjacentHTML("beforeend", '<li><span class="sw' + (type === "line" ? " line" : "") + '" style="background:' + s.color + '"></span>' + esc(s.name) + "</li>");
      });
      el.appendChild(ul);
    }

    var tip = curDoc.createElement("div");
    tip.className = "pp-chart-tip";
    var svg;
    if (type === "bar" || type === "stacked-bar") svg = drawBar(el, cfg, cats, series, fmt, W, type === "stacked-bar");
    else if (type === "line") svg = drawLine(el, cfg, cats, series, fmt, W);
    else svg = drawColumn(el, cfg, cats, series, fmt, W, type === "stacked");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", cfg.title || cfg.ariaLabel || "Chart");
    el.appendChild(svg);
    el.appendChild(tip);
    el.appendChild(dataTable(cfg, cats, series, fmt));
    if (!el.hasAttribute("data-pp-modal") && downloadsAllowed(el, cfg)) el.appendChild(toolbar(el));

    // hover wiring (each draw* registers hit targets with data-i)
    function show(i, evt) {
      el.classList.add("hovering");
      el.querySelectorAll(".mark").forEach(function (m) { m.classList.toggle("dim", m.getAttribute("data-i") !== String(i)); });
      var rows = series.map(function (s) {
        return '<div class="tt-r"><span><i class="sw" style="background:' + s.color + '"></i>' + (multi ? esc(s.name) : "Value") + "</span><b>" + fmt(s.values[i]) + "</b></div>";
      }).join("");
      if ((type === "stacked" || type === "stacked-bar") && multi) {
        var tot = series.reduce(function (a, s) { return a + (+s.values[i] || 0); }, 0);
        rows += '<div class="tt-r" style="border-top:1px solid var(--line);margin-top:4px;padding-top:4px"><span>Total</span><b>' + fmt(tot) + "</b></div>";
      }
      tip.innerHTML = '<div class="tt-h">' + esc(cats[i]) + "</div>" + rows;
      var r = el.getBoundingClientRect();
      var x = evt.clientX - r.left, y = evt.clientY - r.top;
      tip.classList.add("on");
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var left = x + 14 + tw > r.width ? x - tw - 14 : x + 14;
      tip.style.left = Math.max(0, left) + "px";
      tip.style.top = Math.max(0, y - th - 10) + "px";
      var xh = el.querySelector(".xhair");
      if (xh) { var hx = el.querySelector('.hit[data-i="' + i + '"]').getAttribute("data-cx"); xh.setAttribute("x1", hx); xh.setAttribute("x2", hx); xh.style.opacity = 1; }
    }
    function hide() {
      el.classList.remove("hovering");
      tip.classList.remove("on");
      var xh = el.querySelector(".xhair"); if (xh) xh.style.opacity = 0;
    }
    el.querySelectorAll(".hit").forEach(function (hit) {
      var i = +hit.getAttribute("data-i");
      hit.addEventListener("mousemove", function (e) { show(i, e); });
      hit.addEventListener("mouseleave", hide);
    });
  }

  function yDomain(cfg, series, stacked) {
    var vals = [];
    if (stacked) {
      series[0].values.forEach(function (_, i) {
        vals.push(series.reduce(function (a, s) { return a + (+s.values[i] || 0); }, 0));
      });
    } else series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) vals.push(+v); }); });
    if (cfg.ref) vals.push(cfg.ref.value);
    var lo = cfg.yMin != null ? cfg.yMin : Math.min(0, Math.min.apply(null, vals));
    var hi = cfg.yMax != null ? cfg.yMax : Math.max.apply(null, vals);
    var ticks = niceTicks(lo, hi, 5);
    if (cfg.yMin != null) ticks = ticks.filter(function (t) { return t >= cfg.yMin; });
    if (cfg.yMax != null) ticks = ticks.filter(function (t) { return t <= cfg.yMax; });
    return { lo: cfg.yMin != null ? cfg.yMin : ticks[0], hi: cfg.yMax != null ? cfg.yMax : ticks[ticks.length - 1], ticks: ticks };
  }

  function roundedTopRect(g, x, y, w, hgt, r, fill, cls, i, horizontal) {
    // bar with rounded data-end (4px), square at the baseline
    r = Math.min(r, w / 2, hgt / 2);
    if (hgt <= 0 || w <= 0) return;
    var d;
    if (!horizontal) d = "M" + x + "," + (y + hgt) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + hgt) + "Z";
    else d = "M" + x + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + hgt - r) + "Q" + (x + w) + "," + (y + hgt) + " " + (x + w - r) + "," + (y + hgt) + "H" + x + "Z";
    h("path", { d: d, fill: fill, "class": cls, "data-i": i }, g);
  }

  function axisColors(el) {
    return { grid: cssVar(el, "--viz-grid", "#e1e0d9"), axis: cssVar(el, "--viz-axis", "#c3c2b7"), label: cssVar(el, "--viz-label", "#6f6e69"), ink: cssVar(el, "--ink-1", "#0f1714"), muted: cssVar(el, "--viz-muted", "#cfcdc4") };
  }

  function drawColumn(el, cfg, cats, series, fmt, W, stacked) {
    var C = axisColors(el);
    var H = cfg.height || 300;
    var d = yDomain(cfg, series, stacked);
    var ml = Math.max.apply(null, d.ticks.map(function (t) { return textW(fmt(t, true), 11.5); })) + 12;
    var m = { t: 18, r: 8, b: 34, l: ml };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var y = function (v) { return m.t + ih - (v - d.lo) / (d.hi - d.lo) * ih; };
    var svg = h("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H });
    d.ticks.forEach(function (t) {
      h("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? C.axis : C.grid, "stroke-width": 1 }, svg);
      h("text", { x: m.l - 8, y: y(t) + 4, "text-anchor": "end", "font-size": 11.5, fill: C.label }, svg).textContent = fmt(t, true);
    });
    var band = iw / cats.length;
    var groupW = Math.min(band * 0.72, stacked ? 64 : 34 * series.length + 8);
    var gap = series.length > 1 && !stacked ? 2 : 0;
    var barW = stacked ? groupW : (groupW - gap * (series.length - 1)) / series.length;
    var hl = cfg.highlight || null;
    var labels = cfg.labels !== undefined ? cfg.labels : (series.length === 1 && cats.length <= 12);
    var rot = cats.some(function (c) { return textW(c, 11.5) > band - 4; });
    if (rot) { m.b = 60; }
    cats.forEach(function (c, i) {
      var gx = m.l + band * i + (band - groupW) / 2;
      var base = 0;
      series.forEach(function (s, si) {
        var v = +s.values[i] || 0;
        var fill = s.color;
        if (hl && hl.indexOf(c) === -1 && series.length === 1) fill = C.muted;
        if (stacked) {
          var y0 = y(base), y1 = y(base + v);
          var isTop = si === series.length - 1;
          if (isTop) roundedTopRect(svg, gx, y1, barW, y0 - y1 - (si ? 2 : 0), 4, fill, "mark", i);
          else h("rect", { x: gx, y: y1, width: barW, height: Math.max(0, y0 - y1 - (si ? 2 : 0)), fill: fill, "class": "mark", "data-i": i }, svg);
          base += v;
        } else {
          var bx = gx + si * (barW + gap);
          var b0 = Math.min(Math.max(0, d.lo), d.hi); // baseline: zero, or the axis floor when yMin > 0
          var vc = Math.min(Math.max(v, d.lo), d.hi);
          var top = y(Math.max(vc, b0)), bot = y(Math.min(vc, b0));
          roundedTopRect(svg, bx, top, barW, bot - top, 4, fill, "mark", i);
          if (labels) {
            h("text", { x: bx + barW / 2, y: (v >= 0 ? top - 6 : bot + 14), "text-anchor": "middle", "font-size": 11.5, "font-weight": 600, fill: C.ink, "class": "mark", "data-i": i }, svg).textContent = fmt(v);
          }
        }
      });
      var lx = m.l + band * i + band / 2;
      if (rot) {
        var t = h("text", { x: lx, y: H - m.b + 16, "text-anchor": "end", "font-size": 11.5, fill: C.label, transform: "rotate(-35 " + lx + " " + (H - m.b + 16) + ")" }, svg);
        t.textContent = c;
      } else {
        h("text", { x: lx, y: H - m.b + 20, "text-anchor": "middle", "font-size": 11.5, fill: C.label }, svg).textContent = c;
      }
      h("rect", { x: m.l + band * i, y: m.t, width: band, height: ih, "class": "hit", "data-i": i, "data-cx": lx }, svg);
    });
    if (rot) svg.setAttribute("viewBox", "0 0 " + W + " " + (H + 26)), svg.setAttribute("height", H + 26);
    refLine(svg, cfg, m.l, W - m.r, y, C);
    return svg;
  }

  function drawBar(el, cfg, cats, series, fmt, W, stacked) {
    var C = axisColors(el);
    var rowH = stacked ? 30 : Math.max(22, 14 * series.length + 10);
    var ml = Math.min(W * 0.42, Math.max.apply(null, cats.map(function (c) { return textW(c, 12.5); })) + 14);
    var d = yDomain(cfg, series, stacked);
    var labels = cfg.labels !== undefined ? cfg.labels : !stacked;
    var mr = labels ? Math.max.apply(null, series.map(function (s) { return Math.max.apply(null, s.values.map(function (v) { return textW(fmt(v), 12); })); })) + 12 : 12;
    var m = { t: cfg.ref && cfg.ref.label ? 22 : 6, r: mr, b: 26, l: ml };
    var H = m.t + m.b + rowH * cats.length;
    var iw = W - m.l - m.r;
    var x = function (v) { return m.l + (v - d.lo) / (d.hi - d.lo) * iw; };
    var svg = h("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H });
    d.ticks.forEach(function (t) {
      h("line", { x1: x(t), x2: x(t), y1: m.t, y2: H - m.b, stroke: t === 0 ? C.axis : C.grid }, svg);
      h("text", { x: x(t), y: H - m.b + 16, "text-anchor": "middle", "font-size": 11.5, fill: C.label }, svg).textContent = fmt(t, true);
    });
    var hl = cfg.highlight || null;
    var inner = rowH * 0.72;
    var gap = series.length > 1 && !stacked ? 2 : 0;
    var bh = stacked ? inner : (inner - gap * (series.length - 1)) / series.length;
    cats.forEach(function (c, i) {
      var gy = m.t + rowH * i + (rowH - inner) / 2;
      var base = 0;
      series.forEach(function (s, si) {
        var v = +s.values[i] || 0;
        var fill = s.color;
        if (hl && hl.indexOf(c) === -1 && series.length === 1) fill = C.muted;
        if (stacked) {
          var x0 = x(base), x1 = x(base + v);
          if (si === series.length - 1) roundedTopRect(svg, x0 + (si ? 2 : 0), gy, x1 - x0 - (si ? 2 : 0), bh, 4, fill, "mark", i, true);
          else h("rect", { x: x0 + (si ? 2 : 0), y: gy, width: Math.max(0, x1 - x0 - (si ? 2 : 0)), height: bh, fill: fill, "class": "mark", "data-i": i }, svg);
          base += v;
        } else {
          var by = gy + si * (bh + gap);
          var x0b = x(Math.min(0, v)), x1b = x(Math.max(0, v));
          roundedTopRect(svg, x0b, by, x1b - x0b, bh, 4, fill, "mark", i, true);
          if (labels) h("text", { x: x1b + 6, y: by + bh / 2 + 4, "font-size": 12, "font-weight": 600, fill: C.ink, "class": "mark", "data-i": i }, svg).textContent = fmt(v);
        }
      });
      h("text", { x: m.l - 10, y: m.t + rowH * i + rowH / 2 + 4, "text-anchor": "end", "font-size": 12.5, fill: C.ink }, svg).textContent = c;
      h("rect", { x: 0, y: m.t + rowH * i, width: W, height: rowH, "class": "hit", "data-i": i }, svg);
    });
    if (cfg.ref) {
      var rx = x(cfg.ref.value);
      h("line", { x1: rx, x2: rx, y1: m.t - 4, y2: H - m.b, stroke: C.ink, "stroke-width": 1.25, "stroke-dasharray": "4 3" }, svg);
      if (cfg.ref.label) {
        var anchorEnd = rx > m.l + iw * 0.7;
        h("text", { x: anchorEnd ? rx - 4 : rx + 4, y: m.t - 8, "text-anchor": anchorEnd ? "end" : "start", "font-size": 11, fill: C.ink }, svg).textContent = cfg.ref.label;
      }
    }
    return svg;
  }

  function drawLine(el, cfg, cats, series, fmt, W) {
    var C = axisColors(el);
    var H = cfg.height || 300;
    var d = yDomain(cfg, series, false);
    if (cfg.yMin == null) {
      // lines don't need a zero baseline — tighten the domain
      var all = []; series.forEach(function (s) { s.values.forEach(function (v) { if (v != null) all.push(+v); }); });
      if (cfg.ref) all.push(cfg.ref.value);
      var lo = Math.min.apply(null, all), hi = cfg.yMax != null ? cfg.yMax : Math.max.apply(null, all);
      if (lo > 0 && lo > (hi - lo) * 0.6) { var t = niceTicks(lo, hi, 5); d = { lo: t[0], hi: t[t.length - 1], ticks: t }; }
    }
    var direct = series.length > 1 && series.length <= 4 && cfg.directLabels !== false;
    var ml = Math.max.apply(null, d.ticks.map(function (t) { return textW(fmt(t, true), 11.5); })) + 12;
    var maxName = Math.floor(W * 0.3 / 7);
    var short = function (n) { n = String(n); return n.length > maxName ? n.slice(0, maxName - 1) + "…" : n; };
    var lastVal = series.length === 1 ? series[0].values.filter(function (v) { return v != null; }).pop() : null;
    var mr = direct ? Math.max.apply(null, series.map(function (s) { return textW(short(s.name), 12, true); })) + 18
      : (series.length === 1 && cfg.labels !== false ? textW(fmt(lastVal), 12, true) + 16 : 16);
    var m = { t: 16, r: mr, b: 32, l: ml };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var y = function (v) { return m.t + ih - (v - d.lo) / (d.hi - d.lo) * ih; };
    var step = cats.length > 1 ? iw / (cats.length - 1) : iw;
    var x = function (i) { return m.l + (cats.length > 1 ? step * i : iw / 2); };
    var svg = h("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H });
    d.ticks.forEach(function (t) {
      h("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: t === 0 ? C.axis : C.grid }, svg);
      h("text", { x: m.l - 8, y: y(t) + 4, "text-anchor": "end", "font-size": 11.5, fill: C.label }, svg).textContent = fmt(t, true);
    });
    var labW = Math.max.apply(null, cats.map(function (c) { return textW(c, 11.5); })) + 10;
    var every = Math.max(1, Math.ceil(labW / (cats.length > 1 ? step : iw)));
    var lastTick = Math.floor((cats.length - 1) / every) * every;
    var showLast = (cats.length - 1 - lastTick) * step >= labW;
    cats.forEach(function (c, i) {
      var anchor = "middle";
      if (i === 0 && x(i) - textW(c, 11.5) / 2 < 0) anchor = "start";
      if (i === cats.length - 1 && x(i) + textW(c, 11.5) / 2 > W) anchor = "end";
      if (i % every === 0 || (i === cats.length - 1 && showLast)) h("text", { x: x(i), y: H - m.b + 20, "text-anchor": anchor, "font-size": 11.5, fill: C.label }, svg).textContent = c;
    });
    refLine(svg, cfg, m.l, W - m.r, y, C);
    h("line", { "class": "xhair", x1: 0, x2: 0, y1: m.t, y2: H - m.b, stroke: C.axis, "stroke-width": 1, style: "opacity:0" }, svg);
    var ends = [];
    series.forEach(function (s, si) {
      var pts = [], dstr = "";
      s.values.forEach(function (v, i) { if (v == null) { dstr += " "; return; } dstr += (dstr && dstr.slice(-1) !== " " ? "L" : "M") + x(i).toFixed(1) + "," + y(v).toFixed(1); pts.push([x(i), y(v), i]); });
      h("path", { d: dstr.replace(/ /g, ""), fill: "none", stroke: s.color, "stroke-width": 2.25, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
      var surface = cssVar(el, "--surface-1", "#fcfcfb");
      pts.forEach(function (p) {
        h("circle", { cx: p[0], cy: p[1], r: 4, fill: s.color, stroke: surface, "stroke-width": 2, "class": "mark dot", "data-i": p[2], style: "opacity:" + (p === pts[pts.length - 1] ? 1 : 0) }, svg);
      });
      var last = pts[pts.length - 1];
      if (last) ends.push({ y: last[1], x: last[0], name: s.name, color: s.color, v: s.values[last[2]] });
    });
    if (direct) {
      ends.sort(function (a, b) { return a.y - b.y; });
      for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 15) ends[k].y = ends[k - 1].y + 15;
      ends.forEach(function (e) { var t = h("text", { x: e.x + 10, y: e.y + 4, "font-size": 12, "font-weight": 600, fill: C.ink }, svg); t.textContent = short(e.name); if (short(e.name) !== e.name) h("title", {}, t).textContent = e.name; });
    } else if (series.length === 1 && ends[0] && cfg.labels !== false) {
      h("text", { x: ends[0].x + 8, y: ends[0].y + 4, "font-size": 12, "font-weight": 600, fill: C.ink }, svg).textContent = fmt(ends[0].v);
    }
    cats.forEach(function (c, i) {
      h("rect", { x: x(i) - step / 2, y: m.t, width: step, height: ih, "class": "hit", "data-i": i, "data-cx": x(i) }, svg);
    });
    // show all dots of hovered index
    svg.addEventListener("mousemove", function (e) {
      var t = e.target.closest ? e.target.closest(".hit") : null; if (!t) return;
      var i = t.getAttribute("data-i");
      svg.querySelectorAll(".dot").forEach(function (dd) { dd.style.opacity = dd.getAttribute("data-i") === i ? 1 : 0; });
    });
    svg.addEventListener("mouseleave", function () {
      svg.querySelectorAll(".dot").forEach(function (dd) { dd.style.opacity = 0; });
    });
    return svg;
  }

  function refLine(svg, cfg, x1, x2, y, C) {
    if (!cfg.ref) return;
    var ry = y(cfg.ref.value);
    h("line", { x1: x1, x2: x2, y1: ry, y2: ry, stroke: C.ink, "stroke-width": 1.25, "stroke-dasharray": "4 3" }, svg);
    if (cfg.ref.label) h("text", { x: x2, y: ry - 6, "text-anchor": "end", "font-size": 11, fill: C.ink }, svg).textContent = cfg.ref.label;
  }

  function dataTable(cfg, cats, series, fmt) {
    var det = curDoc.createElement("details");
    det.className = "pp-chart-table";
    var html = "<summary>View data table</summary><div class=\"pp-table-wrap\"><table class=\"pp-table\"><thead><tr><th></th>";
    series.forEach(function (s) { html += '<th class="num">' + esc(s.name || "Value") + "</th>"; });
    html += "</tr></thead><tbody>";
    cats.forEach(function (c, i) {
      html += "<tr><td>" + esc(c) + "</td>";
      series.forEach(function (s) { html += '<td class="num">' + fmt(s.values[i]) + "</td>"; });
      html += "</tr>";
    });
    det.innerHTML = html + "</tbody></table></div>";
    return det;
  }

  // ---------- expand (modal) & downloads ----------
  var ICONS = {
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    csv: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>'
  };
  function ico(n) { return '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + "</svg>"; }

  // Opt out per chart ("downloads": false) or per report (<meta name="pp:downloads" content="false">)
  function downloadsAllowed(el, cfg) {
    if (cfg.downloads === false) return false;
    var m = el.ownerDocument.querySelector('meta[name="pp:downloads"]');
    return !(m && m.getAttribute("content") === "false");
  }

  function figureInfo(el) {
    var fig = el.closest(".pp-figure");
    var q = function (sel) { var n = fig && fig.querySelector(sel); return n ? n.textContent.trim() : ""; };
    var cfg = parse(el) || {};
    return { title: q(".pp-fig-title") || cfg.title || "Chart", sub: q(".pp-fig-sub"), source: q("figcaption") || q(".pp-fig-source") };
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "chart"; }
  function reportId(el) {
    var art = el.closest("article[id^='r-']"); // inside a PDF bundle
    if (art) return art.id.slice(2);
    var m = el.ownerDocument.location.pathname.match(/\/reports\/([a-z0-9-]+)\//);
    return m ? m[1] : slug(el.ownerDocument.title);
  }
  function fileBase(el) { return reportId(el) + "__" + slug(figureInfo(el).title); }

  function toolbar(el) {
    var bar = curDoc.createElement("div");
    bar.className = "pp-chart-tools";
    bar.innerHTML = '<button type="button" data-act="expand" title="Expand chart" aria-label="Expand chart">' + ico("expand") + "</button>" +
      '<button type="button" data-act="csv" title="Download data (CSV)" aria-label="Download data as CSV">' + ico("csv") + "</button>";
    bar.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.act === "expand") openModal(el, b);
      if (b.dataset.act === "csv") downloadCSV(el);
    });
    return bar;
  }

  function table(cfg) {
    var head = ["Category"].concat((cfg.series || []).map(function (s) { return s.name || "Value"; }));
    var rows = (cfg.categories || []).map(function (c, i) { return [c].concat((cfg.series || []).map(function (s) { return s.values[i]; })); });
    return [head].concat(rows);
  }
  function toCSV(cfg) {
    return table(cfg).map(function (r) {
      return r.map(function (v) {
        if (v === null || v === undefined) return "";
        v = String(v);
        return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(",");
    }).join("\r\n") + "\r\n";
  }
  function save(el, blob, name) {
    var d = el.ownerDocument, a = d.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    d.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function downloadCSV(el) {
    // BOM so Excel opens UTF-8 (en dashes, ×, etc.) correctly
    save(el, new Blob(["\ufeff" + toCSV(parse(el))], { type: "text/csv;charset=utf-8" }), fileBase(el) + ".csv");
  }
  function copyData(el, win, btn) {
    var tsv = table(parse(el)).map(function (r) { return r.map(function (v) { return v == null ? "" : String(v).replace(/[\t\n]/g, " "); }).join("\t"); }).join("\n");
    var done = function (ok) { var t = btn.innerHTML; btn.textContent = ok ? "Copied" : "Copy failed"; setTimeout(function () { btn.innerHTML = t; }, 1400); };
    try { win.navigator.clipboard.writeText(tsv).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
  }

  // Self-contained SVG: title, legend, chart and source baked in (for slides)
  function exportSVG(chartEl, info) {
    var cfg = parse(chartEl);
    var src = chartEl.querySelector("svg");
    var W = +src.getAttribute("width"), Hc = +src.getAttribute("height");
    var doc = chartEl.ownerDocument, ink = cssVar(chartEl, "--ink-1", "#0f1714"), ink2 = cssVar(chartEl, "--ink-2", "#4a524e");
    var font = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
    var out = doc.createElementNS(NS, "svg");
    out.setAttribute("xmlns", NS);
    var lines = [], words = info.title.split(" "), line = "";
    words.forEach(function (w) { if (textW(line + " " + w, 17, true) > W && line) { lines.push(line); line = w; } else line = line ? line + " " + w : w; });
    if (line) lines.push(line);
    var y = 26, g = doc.createElementNS(NS, "g");
    var add = function (tag, attrs, text) { var n = doc.createElementNS(NS, tag); for (var k in attrs) n.setAttribute(k, attrs[k]); if (text != null) n.textContent = text; g.appendChild(n); return n; };
    lines.forEach(function (l) { add("text", { x: 0, y: y, "font-size": 17, "font-weight": 700, fill: ink }, l); y += 22; });
    if (info.sub) { add("text", { x: 0, y: y, "font-size": 13, fill: ink2 }, info.sub); y += 20; }
    var series = cfg.series || [];
    if (series.length > 1) {
      var lx = 0; y += 4;
      series.forEach(function (s, i) {
        add("rect", { x: lx, y: y - 10, width: 11, height: 11, rx: 3, fill: colorFor(chartEl, i, s) });
        add("text", { x: lx + 16, y: y, "font-size": 12.5, fill: ink2 }, s.name);
        lx += 16 + textW(s.name, 12.5) + 18;
      });
      y += 14;
    }
    var body = src.cloneNode(true);
    ["rect.hit", "line.xhair"].forEach(function (sel) { body.querySelectorAll(sel).forEach(function (n) { n.remove(); }); });
    body.querySelectorAll(".dot").forEach(function (n) { if (n.style.opacity === "0") n.remove(); });
    body.querySelectorAll(".mark").forEach(function (n) { n.classList.remove("dim"); });
    var inner = doc.createElementNS(NS, "g");
    inner.setAttribute("transform", "translate(0," + (y + 6) + ")");
    while (body.firstChild) inner.appendChild(body.firstChild);
    g.appendChild(inner);
    y += 6 + Hc + 8;
    if (info.source) { add("text", { x: 0, y: y + 12, "font-size": 11.5, fill: cssVar(chartEl, "--ink-3", "#7c837f") }, info.source); y += 20; }
    var pad = 24, Ht = y + pad;
    out.setAttribute("viewBox", -pad + " " + (-pad / 2) + " " + (W + pad * 2) + " " + (Ht + pad / 2));
    out.setAttribute("width", W + pad * 2); out.setAttribute("height", Ht + pad / 2);
    out.setAttribute("font-family", font);
    var bg = doc.createElementNS(NS, "rect");
    bg.setAttribute("x", -pad); bg.setAttribute("y", -pad / 2); bg.setAttribute("width", W + pad * 2); bg.setAttribute("height", Ht + pad / 2); bg.setAttribute("fill", "#ffffff");
    out.appendChild(bg); out.appendChild(g);
    return new XMLSerializer().serializeToString(out);
  }
  function downloadImage(chartEl, info, kind, base, dlEl) {
    var svg = exportSVG(chartEl, info);
    if (kind === "svg") return save(dlEl, new Blob([svg], { type: "image/svg+xml" }), base + ".svg");
    var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    img.onload = function () {
      var scale = 2, c = dlEl.ownerDocument.createElement("canvas");
      c.width = img.width * scale; c.height = img.height * scale;
      var ctx = c.getContext("2d"); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { save(dlEl, b, base + ".png"); }, "image/png");
    };
    img.src = url;
  }

  // The modal opens in the hub page when the report is embedded there (the hub marks itself with
  // data-pp-chart-host), so the enlarged chart can use the whole window instead of the report column.
  function hostWindow() {
    try {
      if (global.parent !== global && global.parent.document.documentElement.hasAttribute("data-pp-chart-host")) return global.parent;
    } catch (e) { /* cross-origin */ }
    return global;
  }
  function ensureStyles(doc) {
    if (doc === document || doc.getElementById("pp-charts-css") || !SCRIPT_SRC) return;
    var l = doc.createElement("link");
    l.id = "pp-charts-css"; l.rel = "stylesheet"; l.href = new URL("charts.css", SCRIPT_SRC).href;
    doc.head.appendChild(l);
  }

  function openModal(el, opener) {
    var win = hostWindow(), doc = win.document;
    ensureStyles(doc);
    var cfg = parse(el), info = figureInfo(el), base = fileBase(el);
    var dlg = doc.createElement("dialog");
    dlg.className = "pp-chart-modal";
    dlg.setAttribute("aria-labelledby", "pp-cm-title");
    dlg.innerHTML = '<div class="pp-cm-head"><div><h2 id="pp-cm-title"></h2><p class="pp-cm-sub"></p></div>' +
      '<button type="button" class="pp-cm-close" data-act="close" aria-label="Close">' + ico("x") + "</button></div>" +
      '<div class="pp-cm-body"><div class="pp-chart" data-pp-modal></div><p class="pp-cm-source"></p></div>' +
      '<div class="pp-cm-foot"><button type="button" data-act="csv">' + ico("csv") + "Download CSV</button>" +
      '<button type="button" data-act="copy">' + ico("copy") + "Copy data</button>" +
      '<button type="button" data-act="png">' + ico("img") + "PNG</button>" +
      '<button type="button" data-act="svg">' + ico("img") + "SVG</button>" +
      '<span class="pp-cm-hint">Esc to close</span></div>';
    dlg.querySelector("#pp-cm-title").textContent = info.title;
    dlg.querySelector(".pp-cm-sub").textContent = info.sub;
    dlg.querySelector(".pp-cm-source").textContent = info.source;
    doc.body.appendChild(dlg);
    var big = dlg.querySelector(".pp-chart");
    var bigCfg = JSON.parse(JSON.stringify(cfg));
    bigCfg.height = Math.round(Math.min(560, Math.max(360, win.innerHeight * 0.55)));
    big.__ppCfg = bigCfg;
    var draw = function () { render(big); curDoc = document; };
    var onResize = function () { win.requestAnimationFrame(draw); };
    dlg.addEventListener("close", function () {
      win.removeEventListener("resize", onResize);
      dlg.remove();
      try { opener && opener.focus(); } catch (e) { /* */ }
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) return dlg.close(); // backdrop
      var b = e.target.closest("button[data-act]"); if (!b) return;
      var act = b.dataset.act;
      if (act === "close") dlg.close();
      if (act === "csv") downloadCSV(el);
      if (act === "copy") copyData(el, win, b);
      if (act === "png" || act === "svg") downloadImage(big, info, act, base, el);
    });
    win.addEventListener("resize", onResize);
    dlg.showModal();
    // wait for the stylesheet (first open inside the hub) before measuring
    var link = doc.getElementById("pp-charts-css");
    if (link && !link.sheet) link.addEventListener("load", draw, { once: true }); else draw();
    draw();
  }

  /** Plain-text description of every chart in a root — used for AI context and search. */
  function describe(root) {
    var out = [];
    (root || document).querySelectorAll(".pp-chart").forEach(function (el) {
      var cfg = parse(el); if (!cfg) return;
      var fmt = formatter(cfg.format);
      var fig = el.closest(".pp-figure");
      var title = fig && fig.querySelector(".pp-fig-title") ? fig.querySelector(".pp-fig-title").textContent.trim() : (cfg.title || "Chart");
      var lines = ["[Chart] " + title];
      (cfg.series || []).forEach(function (s) {
        lines.push("  " + (s.name || "Value") + ": " + (cfg.categories || []).map(function (c, i) { return c + "=" + fmt(s.values[i]); }).join(", "));
      });
      out.push(lines.join("\n"));
    });
    return out.join("\n");
  }

  function renderAll(root) {
    var els = (root || document).querySelectorAll(".pp-chart");
    els.forEach(render);
    return els.length;
  }

  var raf;
  global.addEventListener("resize", function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { renderAll(document); });
  });
  global.addEventListener("beforeprint", function () { renderAll(document); });

  global.PPCharts = { render: render, renderAll: renderAll, describe: describe, format: formatter, toCSV: toCSV, open: openModal };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { renderAll(document); });
  else renderAll(document);

  // When embedded in the Insights Hub viewer, use the embedded look.
  try { if (global.self !== global.top) document.documentElement.classList.add("pp-embedded"); } catch (e) { /* cross-origin */ }
})(window);
