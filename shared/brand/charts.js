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
 * Options: format ("num" | "pct" | "pct1" | "pp" | "usd" | "usd2" | "x" | {prefix, suffix, decimals, compact})
 *          yMin, yMax, height, highlight: [category...], ref: {value, label}, labels: bool, yLabel
 * Charts are data-first: the JSON is also exposed as a table (accessibility, AI and print friendly).
 */
(function (global) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var SERIES = ["--series-1", "--series-2", "--series-3", "--series-4", "--series-5", "--series-6", "--series-7", "--series-8"];
  var FALLBACK = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

  function cssVar(el, name, fb) {
    var v = getComputedStyle(el).getPropertyValue(name).trim();
    return v || fb;
  }
  function colorFor(el, i, s) {
    if (s && s.color) return s.color;
    return cssVar(el, SERIES[i % 8], FALLBACK[i % 8]);
  }
  function h(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
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
  function textW(str, size) { return String(str).length * (size || 12) * 0.56; }

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
    Array.prototype.slice.call(el.children).forEach(function (c) { if (c.tagName !== "SCRIPT") el.removeChild(c); });
    var type = cfg.type || "column";
    var cats = cfg.categories || [];
    var series = (cfg.series || []).map(function (s, i) { return { name: s.name, values: s.values, color: colorFor(el, i, s) }; });
    var fmt = formatter(cfg.format);
    var W = Math.max(280, Math.round(el.clientWidth || 720));
    var multi = series.length > 1;

    if (multi) {
      var ul = document.createElement("ul");
      ul.className = "pp-chart-legend";
      series.forEach(function (s) {
        ul.insertAdjacentHTML("beforeend", '<li><span class="sw' + (type === "line" ? " line" : "") + '" style="background:' + s.color + '"></span>' + esc(s.name) + "</li>");
      });
      el.appendChild(ul);
    }

    var tip = document.createElement("div");
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
          var top = y(Math.max(v, 0)), bot = y(Math.min(v, 0));
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
    var mr = direct ? Math.max.apply(null, series.map(function (s) { return textW(short(s.name), 12); })) + 18
      : (series.length === 1 && cfg.labels !== false ? textW(fmt(lastVal), 12) + 16 : 16);
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
      if (i % every === 0 || (i === cats.length - 1 && showLast)) h("text", { x: x(i), y: H - m.b + 20, "text-anchor": "middle", "font-size": 11.5, fill: C.label }, svg).textContent = c;
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
    var det = document.createElement("details");
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

  global.PPCharts = { render: render, renderAll: renderAll, describe: describe, format: formatter };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { renderAll(document); });
  else renderAll(document);

  // When embedded in the Insights Hub viewer, use the embedded look.
  try { if (global.self !== global.top) document.documentElement.classList.add("pp-embedded"); } catch (e) { /* cross-origin */ }
})(window);
