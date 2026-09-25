/* Oğuz Klima — site betikleri
   - Mobil menü
   - Ürün çizimleri: data-illus="tip" olan her öğeye teknik çizim tarzında SVG basar.
     Gerçek ürün fotoğrafları geldiğinde <div class="illus"> içine <img> koymanız yeterli.
   - Teklif formu
*/
(function () {
  "use strict";

  /* ---------- Mobil menü ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Yardımcılar ---------- */
  var W = 200, H = 150;
  function svg(inner, extra) {
    return '<svg viewBox="0 0 ' + W + " " + H + '" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--draw)"' +
      (extra || "") + ">" + inner + "</svg>";
  }
  function rect(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' +
      (o.rx ? ' rx="' + o.rx + '"' : "") +
      (o.fill ? ' fill="' + o.fill + '"' : "") +
      (o.sw ? ' stroke-width="' + o.sw + '"' : "") + "/>";
  }
  function line(x1, y1, x2, y2, o) {
    o = o || {};
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"' +
      (o.sw ? ' stroke-width="' + o.sw + '"' : "") +
      (o.color ? ' stroke="' + o.color + '"' : "") +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : "") + "/>";
  }
  function circle(cx, cy, r, o) {
    o = o || {};
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '"' +
      (o.fill ? ' fill="' + o.fill + '"' : "") +
      (o.sw ? ' stroke-width="' + o.sw + '"' : "") +
      (o.color ? ' stroke="' + o.color + '"' : "") + "/>";
  }
  var SOFT = "var(--draw-soft)";
  var CYAN = "#009ee3";

  /* Ölçü çizgisi: teknik resim görünümü için */
  function dim(x1, x2, y, label) {
    var m = (x1 + x2) / 2;
    return '<g stroke-width="1" stroke="' + SOFT + '">' +
      line(x1, y - 4, x1, y + 4, { sw: 1 }) + line(x2, y - 4, x2, y + 4, { sw: 1 }) +
      line(x1, y, m - 16, y, { sw: 1 }) + line(m + 16, y, x2, y, { sw: 1 }) + "</g>" +
      '<text x="' + m + '" y="' + (y + 3.5) + '" text-anchor="middle" fill="currentColor" stroke="none" ' +
      'font-family="IBM Plex Mono, monospace" font-size="9" opacity=".7">' + label + "</text>";
  }

  /* Paralel kanatlar */
  function blades(x, y, w, h, n, angle, o) {
    o = o || {};
    var out = "", step = h / n;
    for (var i = 0; i < n; i++) {
      var cy = y + step * (i + 0.5);
      var dy = Math.tan(angle * Math.PI / 180) * (step * 0.9) / 2;
      out += line(x, cy - dy, x + w, cy + dy, { sw: o.sw || 2 });
    }
    return out;
  }
  function vblades(x, y, w, h, n) {
    var out = "", step = w / n;
    for (var i = 1; i < n; i++) out += line(x + step * i, y, x + step * i, y + h, { sw: 1.5, color: SOFT });
    return out;
  }
  function frame(x, y, w, h, inset) {
    inset = inset || 8;
    return rect(x, y, w, h, { rx: 2, fill: "var(--surface)", sw: 2.5 }) +
      rect(x + inset, y + inset, w - inset * 2, h - inset * 2, { sw: 1.5, fill: "#eaf7fe" });
  }

  /* ---------- Çizim kütüphanesi ---------- */
  var D = {
    "grille-single": function () {
      return frame(30, 28, 140, 84) + blades(38, 36, 124, 68, 9, 0) + dim(30, 170, 132, "B × H");
    },
    "grille-double": function () {
      return frame(30, 28, 140, 84) + vblades(38, 36, 124, 68, 12) + blades(38, 36, 124, 68, 9, 0) + dim(30, 170, 132, "B × H");
    },
    "linear": function () {
      return frame(14, 52, 172, 40, 6) + (function () {
        var o = ""; for (var i = 0; i < 26; i++) o += line(24 + i * 6.2, 60, 24 + i * 6.2, 84, { sw: 1.8 }); return o;
      })() + dim(14, 186, 116, "L = 300–3000");
    },
    "transfer": function () {
      var o = frame(40, 30, 120, 80);
      for (var i = 0; i < 7; i++) {
        var y = 42 + i * 9.5;
        o += '<path d="M48 ' + y + " l52 6 l52 -6" + '" stroke-width="2"/>';
      }
      return o + dim(40, 160, 132, "görüş engelleyici");
    },
    "return-filter": function () {
      return frame(30, 26, 140, 88) + blades(38, 34, 124, 72, 8, 25) +
        rect(44, 40, 112, 60, { sw: 1, fill: "none" }).replace("/>", ' stroke-dasharray="3 3" stroke="' + CYAN + '"/>') +
        dim(30, 170, 134, "filtreli");
    },
    "diffuser-square": function () {
      var o = rect(35, 5, 130, 130, { rx: 2, fill: "var(--surface)", sw: 2.5 });
      for (var i = 1; i <= 4; i++) { var s = i * 13; o += rect(35 + s, 5 + s, 130 - s * 2, 130 - s * 2, { sw: 1.8 }); }
      o += line(35, 5, 87, 57, { sw: 1, color: SOFT }) + line(165, 5, 113, 57, { sw: 1, color: SOFT }) +
        line(35, 135, 87, 83, { sw: 1, color: SOFT }) + line(165, 135, 113, 83, { sw: 1, color: SOFT });
      return o;
    },
    "diffuser-round": function () {
      var o = circle(100, 72, 64, { fill: "var(--surface)", sw: 2.5 });
      for (var i = 1; i <= 4; i++) o += circle(100, 72, 64 - i * 12, { sw: 1.8 });
      return o + circle(100, 72, 4, { fill: "currentColor" });
    },
    "perforated": function () {
      var o = rect(35, 5, 130, 130, { rx: 2, fill: "var(--surface)", sw: 2.5 });
      for (var y = 0; y < 13; y++) for (var x = 0; x < 13; x++) o += circle(46 + x * 9, 16 + y * 9, 2.1, { fill: "currentColor", sw: 0 });
      return o;
    },
    "swirl": function () {
      var o = circle(100, 72, 64, { fill: "var(--surface)", sw: 2.5 }) + circle(100, 72, 14, { sw: 2 });
      for (var i = 0; i < 24; i++) {
        var a = i * 15 * Math.PI / 180, b = a + 0.45;
        var x1 = 100 + Math.cos(a) * 18, y1 = 72 + Math.sin(a) * 18;
        var x2 = 100 + Math.cos(b) * 58, y2 = 72 + Math.sin(b) * 58;
        o += '<path d="M' + x1.toFixed(1) + " " + y1.toFixed(1) + " Q" +
          (100 + Math.cos(a + 0.35) * 40).toFixed(1) + " " + (72 + Math.sin(a + 0.35) * 40).toFixed(1) + " " +
          x2.toFixed(1) + " " + y2.toFixed(1) + '" stroke-width="1.6"/>';
      }
      return o;
    },
    "slot": function () {
      var o = frame(10, 50, 180, 44, 6);
      for (var i = 0; i < 4; i++) o += rect(20, 60 + i * 7, 160, 3.5, { rx: 1.5, fill: "currentColor", sw: 0 });
      return o + dim(10, 190, 118, "1–4 slot");
    },
    "jet": function () {
      return '<ellipse cx="70" cy="72" rx="22" ry="56" fill="var(--surface)" stroke-width="2.5"/>' +
        '<ellipse cx="70" cy="72" rx="12" ry="32" stroke-width="1.8"/>' +
        '<path d="M70 16 L150 44 M70 128 L150 100" stroke-width="2.5"/>' +
        '<ellipse cx="150" cy="72" rx="10" ry="28" fill="var(--surface)" stroke-width="2.5"/>' +
        '<g stroke="' + CYAN + '" stroke-width="1.8" stroke-dasharray="5 6">' +
        line(164, 60, 196, 54) + line(164, 72, 198, 72) + line(164, 84, 196, 90) + "</g>";
    },
    "damper": function () {
      var o = rect(30, 20, 140, 100, { rx: 2, fill: "var(--surface)", sw: 3 });
      for (var i = 0; i < 5; i++) {
        var cy = 30 + i * 20;
        o += '<g transform="rotate(-30 100 ' + cy + ')">' + rect(38, cy - 2.5, 124, 5, { rx: 2.5, sw: 1.8 }) + "</g>" + circle(100, cy, 2.2, { fill: "currentColor", sw: 0 });
      }
      return o + line(170, 55, 190, 55, { sw: 3 }) + circle(190, 55, 5, { fill: "var(--surface)", sw: 2.5 });
    },
    "fire-damper": function () {
      var o = rect(20, 30, 160, 90, { rx: 2, fill: "var(--surface)", sw: 3 }) + rect(10, 22, 180, 106, { rx: 2, sw: 1.5 });
      o += '<g transform="rotate(-8 100 75)">' + rect(30, 71, 140, 8, { rx: 4, sw: 2 }) + "</g>";
      o += line(100, 40, 100, 110, { sw: 1, color: SOFT, dash: "4 4" });
      o += '<path d="M150 50 c-6 -8 0 -14 2 -20 c6 8 10 12 6 20 c-2 4 -6 4 -8 0z" fill="#e2461f" stroke="#e2461f" stroke-width="1"/>';
      return o + '<text x="40" y="54" font-family="IBM Plex Mono, monospace" font-size="10" fill="#e2461f" stroke="none">EI 120</text>';
    },
    "backdraft": function () {
      var o = frame(30, 20, 140, 100, 6);
      for (var i = 0; i < 5; i++) {
        var y = 32 + i * 18;
        o += '<path d="M40 ' + y + " q30 10 120 4" + '" stroke-width="2"/>';
      }
      return o + '<g stroke="' + CYAN + '" stroke-width="2">' + line(4, 70, 22, 70) + '<path d="M16 64 l6 6 l-6 6"/></g>';
    },
    "pressure-relief": function () {
      var o = frame(30, 20, 140, 100, 6);
      for (var i = 0; i < 5; i++) o += '<g transform="rotate(35 100 ' + (32 + i * 18) + ')">' + line(44, 32 + i * 18, 156, 32 + i * 18, { sw: 2 }) + "</g>";
      return o + '<path d="M176 40 v60" stroke-width="1.5" stroke-dasharray="3 3"/>' +
        '<text x="179" y="36" font-family="IBM Plex Mono, monospace" font-size="9" fill="currentColor" stroke="none">Pa</text>';
    },
    "vav": function () {
      return '<path d="M16 50 h96 v44 h-96z" fill="var(--surface)" stroke-width="2.5"/>' +
        '<ellipse cx="16" cy="72" rx="6" ry="22" fill="var(--surface)" stroke-width="2.5"/>' +
        '<path d="M112 36 h72 v72 h-72z" fill="var(--surface)" stroke-width="2.5"/>' +
        line(64, 50, 64, 94, { sw: 1.5, color: SOFT, dash: "3 3" }) +
        '<g transform="rotate(-40 64 72)">' + line(44, 72, 84, 72, { sw: 3 }) + "</g>" +
        rect(124, 48, 48, 30, { rx: 3, sw: 1.8 }) + circle(136, 92, 5, { sw: 1.8 }) + circle(160, 92, 5, { sw: 1.8 }) +
        '<text x="129" y="67" font-family="IBM Plex Mono, monospace" font-size="10" fill="currentColor" stroke="none">m³/h</text>';
    },
    "round-damper": function () {
      return '<path d="M30 40 h120" stroke-width="2.5"/><path d="M30 104 h120" stroke-width="2.5"/>' +
        '<ellipse cx="30" cy="72" rx="12" ry="32" fill="var(--surface)" stroke-width="2.5"/>' +
        '<ellipse cx="150" cy="72" rx="12" ry="32" fill="var(--surface)" stroke-width="2.5"/>' +
        '<ellipse cx="90" cy="72" rx="6" ry="30" transform="rotate(25 90 72)" stroke-width="2.2"/>' +
        line(90, 30, 90, 16, { sw: 2.5 }) + line(80, 16, 104, 16, { sw: 4 });
    },
    "louver": function () {
      var o = rect(30, 14, 140, 116, { rx: 2, fill: "var(--surface)", sw: 3 });
      for (var i = 0; i < 8; i++) {
        var y = 24 + i * 13;
        o += '<path d="M36 ' + y + " L164 " + y + " L164 " + (y + 7) + " L36 " + (y + 7) + 'z" fill="' + SOFT + '" stroke-width="1.5"/>';
      }
      return o + '<g stroke="' + CYAN + '" stroke-width="1.8" stroke-dasharray="4 5">' + line(6, 40, 26, 50) + line(6, 72, 26, 82) + line(6, 104, 26, 114) + "</g>";
    },
    "sand-louver": function () {
      var o = rect(30, 14, 140, 116, { rx: 2, fill: "var(--surface)", sw: 3 });
      for (var i = 0; i < 10; i++) o += '<path d="M' + (42 + i * 12.5) + ' 22 v100" stroke-width="1.5"/><path d="M' + (42 + i * 12.5) + " 22 l5 4 v96 l-5 -4" + '" fill="' + SOFT + '" stroke-width="1.2"/>';
      for (var d = 0; d < 14; d++) o += circle(8 + (d * 37) % 18, 20 + d * 8, 1.4, { fill: "#c79a4b", sw: 0 });
      return o;
    },
    "acoustic-louver": function () {
      var o = rect(30, 14, 140, 116, { rx: 2, fill: "var(--surface)", sw: 3 });
      for (var i = 0; i < 6; i++) {
        var y = 24 + i * 17;
        o += '<path d="M36 ' + (y + 10) + " L164 " + y + " L164 " + (y + 7) + " L36 " + (y + 17) + 'z" fill="' + SOFT + '" stroke-width="1.5"/>';
      }
      return o + '<path d="M180 56 q6 16 0 32 M188 48 q10 24 0 48" stroke-width="1.8" stroke="' + CYAN + '"/>';
    },
    "access-door": function () {
      return rect(40, 16, 120, 112, { rx: 3, fill: "var(--surface)", sw: 3 }) + rect(50, 26, 100, 92, { rx: 2, sw: 1.8 }) +
        rect(40, 36, 6, 16, { rx: 1, fill: "currentColor", sw: 0 }) + rect(40, 92, 6, 16, { rx: 1, fill: "currentColor", sw: 0 }) +
        rect(136, 62, 8, 22, { rx: 3, fill: "currentColor", sw: 0 }) + dim(40, 160, 142, "B × H");
    },
    "silencer": function () {
      var o = '<path d="M20 30 l40 -16 h120 l-40 16z" fill="var(--surface)" stroke-width="2"/>' +
        rect(20, 30, 120, 100, { fill: "var(--surface)", sw: 2.5 }) + '<path d="M140 30 l40 -16 v100 l-40 16z" fill="var(--surface)" stroke-width="2"/>';
      for (var i = 0; i < 4; i++) o += rect(30 + i * 28, 36, 16, 88, { rx: 8, fill: SOFT, sw: 1.5 });
      return o;
    },
    "round-silencer": function () {
      var o = '<path d="M40 30 h110 M40 114 h110" stroke-width="2.5"/>' +
        '<ellipse cx="40" cy="72" rx="14" ry="42" fill="var(--surface)" stroke-width="2.5"/>' +
        '<ellipse cx="40" cy="72" rx="7" ry="22" stroke-width="1.8"/>' +
        '<ellipse cx="150" cy="72" rx="14" ry="42" fill="var(--surface)" stroke-width="2.5"/>';
      for (var i = 0; i < 9; i++) o += line(58 + i * 10, 34, 58 + i * 10, 110, { sw: 1, color: SOFT });
      return o + '<path d="M164 72 h26 M8 72 h18" stroke-width="2.5"/>';
    },
    "plenum": function () {
      return '<path d="M30 40 l30 -20 h110 l-30 20z" fill="var(--surface)" stroke-width="2"/>' +
        rect(30, 40, 110, 70, { fill: "var(--surface)", sw: 2.5 }) + '<path d="M140 40 l30 -20 v70 l-30 20z" fill="var(--surface)" stroke-width="2"/>' +
        '<ellipse cx="105" cy="30" rx="16" ry="5" stroke-width="2"/><path d="M89 30 v-18 M121 30 v-18" stroke-width="2"/>' +
        '<ellipse cx="105" cy="12" rx="16" ry="5" fill="var(--surface)" stroke-width="2"/>' +
        blades(38, 48, 94, 54, 6, 0, { sw: 1.5 });
    },
    "duct": function () {
      return '<path d="M20 50 l30 -20 h130 l-30 20z" fill="var(--surface)" stroke-width="2"/>' +
        rect(20, 50, 130, 64, { fill: "var(--surface)", sw: 2.5 }) + '<path d="M150 50 l30 -20 v64 l-30 20z" fill="var(--surface)" stroke-width="2"/>' +
        line(62, 50, 62, 114, { sw: 1, color: SOFT }) + line(106, 50, 106, 114, { sw: 1, color: SOFT }) +
        '<path d="M20 50 l65 64 M85 50 l65 64 M85 50 l-65 64 M150 50 l-65 64" stroke-width="1" stroke="' + SOFT + '"/>';
    }
  };

  document.querySelectorAll("[data-illus]").forEach(function (el) {
    var fn = D[el.getAttribute("data-illus")];
    if (fn && !el.querySelector("img, svg")) el.insertAdjacentHTML("beforeend", svg(fn()));
  });

  /* ---------- Mekân sahneleri (uygulama alanları ve fotoğrafı olmayan projeler) ----------
     data-scene="hospital|mall|office|parking|factory|hotel|sports|facade" */
  var P = { navy: "#2f2483", cyan: "#009ee3", sky: "#eaf7fe", sky2: "#cdebfb", mint: "#12b893", mintS: "#dcf6ef",
    sun: "#ffb81c", sunS: "#fff3d6", coral: "#ff6b5b", coralS: "#ffe7e3", lilac: "#7c6cf0", lilacS: "#ece9fe", w: "#ffffff" };

  function R(x, y, w, h, fill, rx, extra) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"' +
      (rx ? ' rx="' + rx + '"' : "") + (extra || "") + "/>";
  }
  function C(cx, cy, r, fill, extra) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || "") + "/>"; }
  function airflow(x, y, n, color, spread) {
    var o = "";
    for (var i = 0; i < n; i++) {
      var dx = (i - (n - 1) / 2) * (spread || 16);
      o += '<path class="flow" d="M' + x + " " + y + " q" + (dx * 0.6) + " 18 " + dx + " 34 t" + (dx * 0.5) + ' 30" ' +
        'fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round" opacity=".85" style="animation-delay:' + (i * 150) + 'ms"/>';
    }
    return o;
  }
  function ceiling(wall, diff) {
    // tavan + kanal + difüzörler
    var o = R(0, 0, 320, 34, "#f4f7fc") + R(0, 34, 320, 3, "#dfe6f1") +
      R(20, 10, 280, 14, P.sky2, 3) + R(20, 10, 280, 4, "#b3def6", 2);
    diff.forEach(function (x) {
      o += R(x - 16, 34, 32, 6, P.w, 2, ' stroke="' + P.navy + '" stroke-width="1.5"') +
        '<path d="M' + (x - 10) + " 37 h20 M" + (x - 6) + ' 39.5 h12" stroke="' + P.navy + '" stroke-width="1"/>';
    });
    return o;
  }
  function floor(color) { return R(0, 168, 320, 32, color) + R(0, 168, 320, 3, "rgba(0,0,0,.06)"); }
  function person(x, y, shirt) {
    return C(x, y, 6, "#f2c7a5") + '<path d="M' + (x - 8) + " " + (y + 24) + " q0 -16 8 -16 q8 0 8 16z" + '" fill="' + shirt + '"/>' +
      R(x - 6, y + 24, 12, 18, P.navy, 3);
  }
  function plant(x, y) {
    return R(x - 7, y, 14, 14, P.coral, 3) + '<path d="M' + x + " " + y + " q-12 -10 -6 -24 q8 8 6 24 q2 -18 12 -22 q2 12 -12 22" + '" fill="' + P.mint + '"/>';
  }

  var S = {
    hospital: function () {
      return R(0, 0, 320, 200, P.mintS) + ceiling(P.mintS, [90, 230]) +
        R(24, 58, 70, 60, P.w, 6) + R(30, 64, 58, 48, P.sky2, 4) + '<path d="M59 64 v48 M30 88 h58" stroke="#fff" stroke-width="3"/>' +
        R(130, 64, 22, 22, P.w, 4) + '<path d="M141 68 v14 M134 75 h14" stroke="' + P.coral + '" stroke-width="4"/>' +
        airflow(90, 42, 3, P.cyan) + airflow(230, 42, 3, P.mint) +
        floor("#c9efe3") +
        R(170, 128, 120, 26, P.w, 6, ' stroke="' + P.navy + '" stroke-width="2"') + R(176, 118, 34, 14, P.sky2, 7) +
        R(214, 122, 70, 10, P.cyan, 5) + '<path d="M178 154 v16 M284 154 v16" stroke="' + P.navy + '" stroke-width="3"/>' +
        '<path d="M120 100 v70 M110 170 h20" stroke="' + P.navy + '" stroke-width="2.5"/>' + R(113, 96, 14, 18, P.sky2, 4) +
        person(56, 128, P.w);
    },
    mall: function () {
      var o = R(0, 0, 320, 200, P.sunS) + ceiling(P.sunS, [160]);
      o += '<circle cx="160" cy="40" r="10" fill="' + P.w + '" stroke="' + P.navy + '" stroke-width="1.5"/>';
      for (var i = 0; i < 3; i++) {
        var x = 20 + i * 100;
        o += R(x, 60, 80, 100, P.w, 6) + R(x + 6, 66, 68, 10, [P.coral, P.cyan, P.lilac][i], 3);
        for (var s = 0; s < 3; s++) {
          o += R(x + 6, 84 + s * 24, 68, 3, "#e3e8f2");
          for (var b = 0; b < 4; b++) o += R(x + 10 + b * 16, 72 + s * 24 + 2, 12, 10, [P.sun, P.mint, P.cyan, P.coral, P.lilac][(i + s + b) % 5], 2);
        }
      }
      o += airflow(160, 48, 5, P.cyan, 22) + floor("#ffe6ad");
      o += R(236, 150, 22, 24, P.coral, 3) + '<path d="M241 150 q6 -10 12 0" stroke="' + P.coral + '" stroke-width="2" fill="none"/>' +
        R(260, 156, 18, 18, P.lilac, 3) + person(220, 132, P.mint) + person(92, 132, P.sun);
      return o;
    },
    office: function () {
      var o = R(0, 0, 320, 200, P.sky) + ceiling(P.sky, [80, 240]) +
        R(110, 52, 180, 76, "#bfe5f8", 6) + '<path d="M170 52 v76 M230 52 v76" stroke="#fff" stroke-width="3"/>';
      [[122, 30], [140, 46], [182, 22], [200, 40], [246, 34], [266, 50]].forEach(function (b) { o += R(b[0], 128 - b[1] - 20, 14, b[1] + 20, "#8fcdef"); });
      o += '<g stroke="' + P.cyan + '" stroke-width="2.5" fill="none" stroke-linecap="round">' +
        '<path class="flow" d="M64 42 h-30 M96 42 h30"/><path class="flow" d="M224 42 h-30 M256 42 h30"/></g>' +
        floor("#d6e9f7") +
        R(30, 128, 110, 8, P.navy, 3) + '<path d="M40 136 v34 M130 136 v34" stroke="' + P.navy + '" stroke-width="3"/>' +
        R(50, 102, 34, 24, P.navy, 3) + R(53, 105, 28, 18, P.cyan, 2) + R(94, 106, 30, 20, P.w, 3, ' stroke="' + P.navy + '" stroke-width="1.5"') +
        R(180, 138, 110, 8, P.navy, 3) + '<path d="M190 146 v24 M280 146 v24" stroke="' + P.navy + '" stroke-width="3"/>' +
        R(206, 114, 34, 24, P.navy, 3) + R(209, 117, 28, 18, P.mint, 2) +
        person(160, 124, P.sun) + plant(20, 154);
      return o;
    },
    parking: function () {
      var o = R(0, 0, 320, 200, "#eef1f7") + R(0, 0, 320, 30, "#dfe5ef") +
        R(40, 8, 60, 22, P.w, 11, ' stroke="' + P.navy + '" stroke-width="2"') + C(52, 19, 7, P.sky2) +
        R(210, 8, 60, 22, P.w, 11, ' stroke="' + P.navy + '" stroke-width="2"') + C(222, 19, 7, P.sky2) +
        '<g fill="none" stroke="' + P.cyan + '" stroke-width="2.5" stroke-linecap="round"><path class="flow" d="M100 19 h60"/><path class="flow" d="M104 25 h40"/><path class="flow" d="M270 19 h40"/></g>' +
        R(20, 46, 40, 40, P.cyan, 8) + '<text x="40" y="76" text-anchor="middle" font-family="Archivo, Arial" font-weight="800" font-size="30" fill="#fff">P</text>' +
        '<path d="M0 120 h320" stroke="#dfe5ef" stroke-width="2"/>' + floor("#d9dee9");
      [[80, P.coral], [180, P.sun], [258, P.mint]].forEach(function (c, i) {
        var x = c[0];
        o += '<path d="M' + x + " 164 v-18 q0 -8 8 -10 l12 -16 h40 l14 16 q8 2 8 10 v18z" + '" fill="' + c[1] + '"/>' +
          R(x + 22, 124, 18, 12, P.sky2, 2) + R(x + 44, 124, 18, 12, P.sky2, 2) +
          C(x + 18, 166, 9, P.navy) + C(x + 62, 166, 9, P.navy) + C(x + 18, 166, 3, "#fff") + C(x + 62, 166, 3, "#fff");
        o += '<path d="M' + (x - 12) + ' 176 l8 22" stroke="#fff" stroke-width="3"/>';
      });
      return o;
    },
    factory: function () {
      var o = R(0, 0, 320, 200, P.lilacS) + '<path d="M0 0 h320 v24 l-40 -14 l-40 14 l-40 -14 l-40 14 l-40 -14 l-40 14 l-40 -14 l-40 14z" fill="#d6d0fd"/>' +
        R(230, 44, 70, 60, P.w, 4, ' stroke="' + P.navy + '" stroke-width="2"');
      for (var i = 0; i < 6; i++) o += R(236, 50 + i * 9, 58, 5, P.sky2, 1);
      o += '<ellipse cx="46" cy="56" rx="8" ry="14" fill="' + P.w + '" stroke="' + P.navy + '" stroke-width="2"/>' +
        '<path d="M46 42 l30 6 v16 l-30 6z" fill="' + P.w + '" stroke="' + P.navy + '" stroke-width="2"/>' +
        '<g fill="none" stroke="' + P.cyan + '" stroke-width="2.5" stroke-linecap="round"><path class="flow" d="M80 50 q40 -4 80 6"/><path class="flow" d="M80 56 q40 4 90 14"/><path class="flow" d="M80 62 q40 10 70 28"/></g>' +
        floor("#cfc8f6") +
        R(24, 110, 90, 58, P.w, 6, ' stroke="' + P.navy + '" stroke-width="2"') + R(34, 120, 30, 20, P.sun, 3) + C(90, 134, 12, P.sky2, ' stroke="' + P.navy + '" stroke-width="2"') +
        '<g class="fan" style="transform-origin:90px 134px"><path d="M90 124 v20 M80 134 h20" stroke="' + P.navy + '" stroke-width="2"/></g>' +
        R(130, 148, 170, 10, P.navy, 5) + C(140, 153, 4, P.w) + C(290, 153, 4, P.w) +
        R(150, 128, 26, 20, P.coral, 3) + R(190, 132, 22, 16, P.mint, 3) + R(226, 126, 28, 22, P.sun, 3) +
        person(120, 126, P.sun);
      return o;
    },
    hotel: function () {
      return R(0, 0, 320, 200, P.coralS) + ceiling(P.coralS, []) +
        R(24, 44, 80, 10, P.w, 2, ' stroke="' + P.navy + '" stroke-width="1.5"') + '<path d="M30 49 h68" stroke="' + P.navy + '" stroke-width="1" stroke-dasharray="2 2"/>' +
        airflow(64, 54, 4, P.cyan, 12) +
        R(150, 56, 80, 54, P.w, 4) + R(156, 62, 68, 42, P.sun, 3) + C(206, 76, 8, "#fff3d6") + '<path d="M156 104 l24 -24 l20 18 l10 -8 l14 14z" fill="' + P.mint + '"/>' +
        floor("#ffd3cb") +
        R(130, 122, 170, 34, P.w, 8, ' stroke="' + P.navy + '" stroke-width="2"') + R(130, 110, 12, 50, P.navy, 4) +
        R(148, 116, 40, 14, P.sky2, 7) + R(194, 128, 104, 28, P.cyan, 6) + '<path d="M140 156 v14 M292 156 v14" stroke="' + P.navy + '" stroke-width="3"/>' +
        R(40, 136, 40, 32, P.w, 4, ' stroke="' + P.navy + '" stroke-width="2"') + '<path d="M60 136 v-24 M48 104 h24 l-6 -14 h-12z" stroke="' + P.navy + '" stroke-width="2" fill="' + P.sun + '"/>' +
        plant(300, 154);
    },
    sports: function () {
      var o = R(0, 0, 320, 200, P.sky) + '<path d="M0 0 h320 v20 q-160 -18 -320 0z" fill="' + P.sky2 + '"/>';
      [40, 280].forEach(function (x, i) {
        var d = i ? -1 : 1;
        o += '<ellipse cx="' + x + '" cy="44" rx="7" ry="13" fill="' + P.w + '" stroke="' + P.navy + '" stroke-width="2"/>' +
          '<g fill="none" stroke="' + (i ? P.mint : P.cyan) + '" stroke-width="2.5" stroke-linecap="round">' +
          '<path class="flow" d="M' + (x + d * 8) + " 40 q" + (d * 50) + " -6 " + (d * 110) + ' 10"/>' +
          '<path class="flow" d="M' + (x + d * 8) + " 48 q" + (d * 50) + " 8 " + (d * 100) + ' 34"/></g>';
      });
      o += floor("#ffd79a") + '<path d="M0 184 h320" stroke="#fff" stroke-width="2"/><ellipse cx="160" cy="184" rx="40" ry="8" fill="none" stroke="#fff" stroke-width="2"/>' +
        R(254, 80, 6, 90, P.navy) + R(222, 76, 44, 30, P.w, 2, ' stroke="' + P.navy + '" stroke-width="2"') +
        '<path d="M226 104 h22 l-4 14 h-14z" fill="none" stroke="' + P.coral + '" stroke-width="2"/>' +
        C(120, 120, 11, P.sun, ' stroke="' + P.navy + '" stroke-width="1.5"') + '<path d="M109 120 h22 M120 109 v22" stroke="' + P.navy + '" stroke-width="1.2"/>' +
        person(80, 128, P.coral) + person(170, 128, P.lilac);
      return o;
    },
    facade: function () {
      var o = '<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe7fb"/><stop offset="1" stop-color="#eaf7fe"/></linearGradient></defs>' +
        R(0, 0, 320, 200, "url(#skyg)") + C(270, 38, 18, "#ffd66b") +
        '<path d="M30 40 q10 -14 24 -6 q10 -10 22 0 q12 0 10 10 h-58 q-6 -4 2 -4z" fill="#fff"/>' +
        R(60, 60, 200, 140, P.w, 4, ' stroke="' + P.navy + '" stroke-width="2"') +
        R(90, 40, 80, 20, P.sky2, 3, ' stroke="' + P.navy + '" stroke-width="2"') + C(110, 50, 7, P.w, ' stroke="' + P.navy + '" stroke-width="1.5"') + C(150, 50, 7, P.w, ' stroke="' + P.navy + '" stroke-width="1.5"');
      for (var r = 0; r < 3; r++) for (var c = 0; c < 4; c++) o += R(74 + c * 46, 74 + r * 40, 32, 24, P.sky2, 3);
      o += R(212, 162, 36, 30, "#eef1f7", 2, ' stroke="' + P.navy + '" stroke-width="2"');
      for (var i = 0; i < 5; i++) o += R(215, 166 + i * 5, 30, 2.5, P.navy);
      o += '<g fill="none" stroke="' + P.mint + '" stroke-width="2.5" stroke-linecap="round"><path class="flow" d="M300 170 q-24 0 -48 6"/><path class="flow" d="M300 182 q-24 0 -48 0"/></g>' +
        R(0, 192, 320, 8, "#bfe0b4");
      return o;
    }
  };

  function sceneSvg(name) {
    var fn = S[name] || S.office;
    return '<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' + fn() + "</svg>";
  }
  /* Ana sayfa: bina kesiti — her oda bir mekân sahnesi */
  function room(name, x, y, w, h, align) {
    return '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" viewBox="0 0 320 200" preserveAspectRatio="' + (align || "xMidYMid") + ' slice">' + S[name]() + "</svg>";
  }
  function label(x, y, text, color) {
    var w = text.length * 6.6 + 22;
    return '<g class="bob"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="26" rx="13" fill="#fff" stroke="' + color + '" stroke-width="2"/>' +
      C(x + 13, y + 13, 4, color) +
      '<text x="' + (x + 22) + '" y="' + (y + 17.5) + '" font-family="IBM Plex Sans, Arial" font-weight="600" font-size="11.5" fill="' + P.navy + '">' + text + "</text></g>";
  }
  function heroSvg() {
    var o = '<svg viewBox="0 0 600 560">' +
      C(470, 70, 34, "#ffd66b") + C(470, 70, 48, "rgba(255,214,107,.25)") +
      '<path d="M40 70 q12 -18 30 -8 q12 -14 28 0 q16 0 12 14 h-72 q-8 -6 2 -6z" fill="#fff"/>' +
      '<path d="M520 150 q10 -14 24 -6 q10 -10 22 0 q12 0 10 10 h-58 q-6 -4 2 -4z" fill="#fff"/>' +
      // çatı ve klima santrali
      R(150, 92, 160, 50, P.w, 6, ' stroke="' + P.navy + '" stroke-width="2.5"') +
      C(186, 117, 15, P.sky2, ' stroke="' + P.navy + '" stroke-width="2"') + '<g class="fan"><path d="M186 104 v26 M173 117 h26" stroke="' + P.navy + '" stroke-width="2.5"/></g>' +
      C(226, 117, 15, P.sky2, ' stroke="' + P.navy + '" stroke-width="2"') + '<g class="fan"><path d="M226 104 v26 M213 117 h26" stroke="' + P.navy + '" stroke-width="2.5"/></g>';
    for (var i = 0; i < 5; i++) o += R(256, 102 + i * 7, 44, 3.5, P.navy, 1);
    o += R(310, 108, 170, 18, P.sky2, 4, ' stroke="' + P.navy + '" stroke-width="2"') +
      '<path class="flow" d="M320 117 h150" stroke="' + P.cyan + '" stroke-width="2.5" fill="none"/>' +
      // bina gövdesi
      R(86, 142, 428, 290, P.navy, 10) +
      room("office", 94, 150, 204, 132) + room("hospital", 302, 150, 204, 132) +
      room("mall", 94, 290, 204, 134) + room("hotel", 302, 290, 204, 134) +
      // zemin ve otopark
      R(0, 432, 600, 12, "#8fd18b") + R(0, 444, 600, 116, "#d9cfb8") +
      R(86, 450, 428, 104, P.navy, 10) + room("parking", 94, 456, 412, 92, "xMidYMax") +
      label(22, 170, "Lineer slot difüzör", P.cyan) + label(470, 186, "Perfore difüzör", P.mint) +
      label(16, 330, "Swirl difüzör", P.sun) + label(474, 356, "Lineer menfez", P.coral) +
      label(22, 490, "Jet fan", P.lilac) + label(330, 60, "Dış hava panjuru", P.cyan) +
      "</svg>";
    return o;
  }
  var heroEl = document.querySelector("[data-hero]");
  if (heroEl) heroEl.innerHTML = heroSvg();

  document.querySelectorAll("[data-scene]").forEach(function (el) {
    if (!el.querySelector("img, svg")) el.insertAdjacentHTML("afterbegin", sceneSvg(el.getAttribute("data-scene")));
  });

  /* ---------- Projeler: filtre ---------- */
  var pf = document.querySelector(".proj-filter");
  if (pf) {
    pf.addEventListener("click", function (ev) {
      var b = ev.target.closest("button");
      if (!b) return;
      pf.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var f = b.getAttribute("data-f");
      document.querySelectorAll(".proj-grid .project").forEach(function (p) {
        p.hidden = !(f === "hepsi" || p.getAttribute("data-sektor") === f);
      });
    });
  }

  /* ---------- Projeler: detay ve fotoğraf galerisi ---------- */
  var dlg = document.getElementById("proj-dialog");
  if (dlg && typeof dlg.showModal === "function") {
    var main = dlg.querySelector(".pd-main-media");
    var thumbs = dlg.querySelector(".pd-thumbs");
    var photos = [], idx = 0, scene = "";
    function show(i) {
      if (!photos.length) { main.innerHTML = sceneSvg(scene); return; }
      idx = (i + photos.length) % photos.length;
      main.innerHTML = '<img src="' + photos[idx] + '" alt="">';
      thumbs.querySelectorAll("button").forEach(function (t, k) { t.setAttribute("aria-current", k === idx ? "true" : "false"); });
    }
    document.querySelectorAll(".project[data-proj]").forEach(function (card) {
      card.addEventListener("click", function () {
        var d = JSON.parse(card.getAttribute("data-proj"));
        photos = d.fotolar || []; scene = d.sahne; idx = 0;
        dlg.querySelector(".pd-title").textContent = d.baslik;
        dlg.querySelector(".pd-meta").textContent = [d.sektor, d.sehir, d.yil].filter(Boolean).join(" · ");
        dlg.querySelector(".pd-desc").textContent = d.aciklama || "";
        dlg.querySelector(".pd-tags").innerHTML = (d.urunler || []).map(function (u) { return '<span class="tag">' + u + "</span>"; }).join("");
        thumbs.innerHTML = photos.length > 1 ? photos.map(function (p, k) {
          return '<button type="button" aria-label="Fotoğraf ' + (k + 1) + '"><img src="' + p + '" alt=""></button>';
        }).join("") : "";
        thumbs.querySelectorAll("button").forEach(function (t, k) { t.addEventListener("click", function () { show(k); }); });
        dlg.querySelectorAll(".pd-nav").forEach(function (n) { n.hidden = photos.length < 2; });
        show(0);
        dlg.showModal();
      });
    });
    dlg.querySelector(".pd-prev").addEventListener("click", function () { show(idx - 1); });
    dlg.querySelector(".pd-next").addEventListener("click", function () { show(idx + 1); });
    dlg.querySelector(".pd-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
  }

  /* ---------- Ürün sayfası: aktif filtre ---------- */
  var filterLinks = document.querySelectorAll(".filter a");
  if (filterLinks.length && "IntersectionObserver" in window) {
    var map = {};
    filterLinks.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && map[e.target.id]) {
          filterLinks.forEach(function (a) { a.classList.remove("active"); });
          map[e.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll(".cat-block").forEach(function (s) { io.observe(s); });
  }

  /* ---------- Teklif formu ----------
     Şimdilik form, doldurulan bilgilerle e-posta taslağı açar.
     Canlıya alırken bir form servisine (ör. PHP mail, Formspree, Netlify Forms) bağlanmalıdır. */
  var form = document.getElementById("teklif-formu");
  if (form) {
    var params = new URLSearchParams(location.search);
    var urun = params.get("urun");
    if (urun && form.elements.urun) form.elements.urun.value = urun;

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var f = form.elements;
      var body = [
        "Ad Soyad: " + f.ad.value,
        "Firma: " + f.firma.value,
        "Telefon: " + f.telefon.value,
        "E-posta: " + f.eposta.value,
        "Ürün grubu: " + f.urun.value,
        "",
        f.mesaj.value
      ].join("\n");
      var to = form.getAttribute("data-to");
      var status = document.getElementById("form-status");
      status.hidden = false;
      status.textContent = "E-posta uygulamanız açılıyor. Açılmazsa talebinizi " + to + " adresine gönderebilirsiniz.";
      location.href = "mailto:" + to + "?subject=" + encodeURIComponent("Teklif talebi – " + f.urun.value) + "&body=" + encodeURIComponent(body);
    });
  }

  var y = document.getElementById("yil");
  if (y) y.textContent = new Date().getFullYear();
})();
