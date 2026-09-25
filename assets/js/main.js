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
      rect(x + inset, y + inset, w - inset * 2, h - inset * 2, { sw: 1.5 });
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
