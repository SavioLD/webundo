/* ============================================================
   WEBUNDO — Einkaufs-Potenzial-Rechner
   Designkonzept · Ländle Digital
   Modell: zentrale Beschaffung ("nur ein Kreditor") +
   Prozess-/Zeitersparnis + Bündelungs-/Preisvorteil → €/Jahr + Score
============================================================ */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
  const eur = (n) => "€ " + Math.round(Math.max(0, n)).toLocaleString("de-DE");
  const plain = (n) => Math.round(Math.max(0, n)).toLocaleString("de-DE");
  const num = (id) => { const e = $("#" + id); if (!e) return 0; const v = parseFloat(String(e.value).replace(/\./g, "").replace(",", ".")); return isNaN(v) ? 0 : v; };
  const dec = (id) => { const e = $("#" + id); if (!e) return 0; const v = parseFloat(String(e.value).replace(",", ".")); return isNaN(v) ? 0 : v; };

  const PRESETS = {
    klein:    { lief: 25,  best: 350,  vol: 250000 },
    mittel:   { lief: 60,  best: 1200, vol: 1200000 },
    gross:    { lief: 120, best: 3500, vol: 4000000 },
    handel:   { lief: 80,  best: 2200, vol: 2500000 },
  };

  const INPUT_IDS = ["lieferanten", "bestellungen", "volumen", "minuten",
    "stundensatz", "aufwandLieferant", "fConsol", "fProcess", "fPrice"];

  let last = null;
  let revealActive = false;
  let resultPlayed = false;

  function bereiche() {
    return {
      versorgung:  $("#b_versorgung")?.classList.contains("is-on"),
      beschaffung: $("#b_beschaffung")?.classList.contains("is-on"),
      optimierung: $("#b_optimierung")?.classList.contains("is-on"),
    };
  }

  function compute() {
    const L = num("lieferanten");
    const B = num("bestellungen");
    const V = num("volumen");
    const t = dec("minuten") || 25;           // Minuten pro Bestellvorgang
    const R = dec("stundensatz") || 55;        // Stundensatz Verwaltung
    const A = num("aufwandLieferant") || 600;  // Verwaltungsaufwand je Lieferant / Jahr
    const fConsol = (dec("fConsol") || 70) / 100;
    const fProcess = (dec("fProcess") || 35) / 100;
    const fPrice = (dec("fPrice") || 4) / 100;
    const b = bereiche();

    // Ist-Kosten (Status quo)
    const adminCost = L * A;                       // Lieferanten-/Kreditorenpflege gesamt
    const processCost = B * (t / 60) * R;          // Bestellabwicklung gesamt

    // Einsparungen mit WEBUNDO
    const consolidatable = Math.max(0, L - 1) * fConsol;   // bündelbare Lieferanten ("ein Kreditor")
    const sAdmin = consolidatable * A;
    const sProcess = processCost * fProcess;
    const sPrice = (b.versorgung || b.optimierung) ? V * fPrice : V * fPrice * 0.5;

    const total = sAdmin + sProcess + sPrice;
    const pct = V > 0 ? (total / V) * 100 : 0;
    const reducedSuppliers = Math.max(1, Math.round(L - consolidatable));

    // Potenzial-Score (0–100): je fragmentierter & manueller, desto höher
    const d1 = clamp(L / 70, 0, 1);
    const d2 = clamp(t / 30, 0, 1);
    const d3 = clamp(B / 3000, 0, 1);
    const d4 = V > 0 ? clamp((sAdmin + sProcess) / (V * 0.12), 0, 1) : 0.5;
    let score = Math.round(clamp(18 + 82 * (0.30 * d1 + 0.22 * d2 + 0.20 * d3 + 0.28 * d4), 5, 98));

    return { L, B, V, A, adminCost, processCost, sAdmin, sProcess, sPrice, total, pct, score, reducedSuppliers };
  }

  function scoreLabel(s) {
    if (s >= 70) return "Sehr hohes Optimierungspotenzial";
    if (s >= 45) return "Deutliches Optimierungspotenzial";
    if (s >= 25) return "Solides Optimierungspotenzial";
    return "Bereits gut aufgestellt";
  }

  function render() {
    const r = compute();
    last = r;
    const set = (id, v) => { const e = $("#" + id); if (e) e.textContent = v; };

    set("livEuro", plain(r.total));
    set("resEuro", plain(r.total));
    set("resBadge", r.V > 0 ? "≈ " + r.pct.toFixed(1).replace(".", ",") + " % Ihres Einkaufsvolumens" : "Einsparpotenzial pro Jahr");
    set("res3yr", eur(r.total * 3));
    set("costAdmin", eur(r.adminCost));
    set("costProcess", eur(r.processCost));
    set("costKred", r.L.toLocaleString("de-DE"));
    set("bdAdmin", eur(r.sAdmin));
    set("bdProcess", eur(r.sProcess));
    set("bdPrice", eur(r.sPrice));
    set("bdTotal", eur(r.total));
    set("redSuppliers", r.reducedSuppliers.toLocaleString("de-DE"));

    // Score-Gauge
    if (!revealActive) set("scoreNum", r.score);
    set("scoreLabel", scoreLabel(r.score));
    const ring = $("#scoreRing");
    if (ring) {
      const C = 2 * Math.PI * 52;
      ring.style.strokeDasharray = C;
      ring.style.strokeDashoffset = C * (1 - r.score / 100);
    }
  }

  // Slider-Werte formatiert anzeigen
  function fmtVol(v) {
    if (v >= 1000000) return (v / 1000000).toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " Mio. €";
    return Math.round(v / 1000).toLocaleString("de-DE") + " Tsd. €";
  }
  function updateOutputs() {
    const set = (id, v) => { const e = $("#" + id); if (e) e.textContent = v; };
    set("outLief", num("lieferanten").toLocaleString("de-DE"));
    set("outBest", num("bestellungen").toLocaleString("de-DE"));
    set("outVol", fmtVol(num("volumen")));
  }

  // Eingaben verdrahten
  INPUT_IDS.forEach((id) => { const e = $("#" + id); if (e) { e.addEventListener("input", onInput); e.addEventListener("change", onInput); } });
  function onInput() { updateOutputs(); render(); }

  // Bereich-Chips
  $$(".bchip").forEach((c) => c.addEventListener("click", () => { c.classList.toggle("is-on"); render(); }));

  // Presets
  const preset = $("#preset");
  if (preset) preset.addEventListener("change", () => {
    const p = PRESETS[preset.value]; if (!p) return;
    $("#lieferanten").value = p.lief;
    $("#bestellungen").value = p.best;
    $("#volumen").value = p.vol;
    updateOutputs(); render();
  });

  updateOutputs();
  render();

  /* ---------- Zähler-Animation beim Sichtbarwerden des Ergebnisses ---------- */
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function animNum(el, to, fmt, dur) {
    if (!el) return;
    const t0 = performance.now(); dur = dur || 1200;
    (function s(now) {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e);
      if (p < 1) requestAnimationFrame(s); else el.textContent = fmt(to);
    })(t0);
  }
  function playResultCount() {
    if (resultPlayed) return;
    resultPlayed = true;
    const r = last || compute();
    revealActive = true;
    animNum($("#resEuro"), r.total, (v) => plain(v));
    animNum($("#res3yr"), r.total * 3, (v) => eur(v));
    animNum($("#scoreNum"), r.score, (v) => String(Math.round(v)));
    setTimeout(() => { revealActive = false; }, 1300);
  }
  window.__wbPlayRechner = playResultCount;
  const heroEl = $(".result__hero");
  if (heroEl && "IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((es) => {
      es.forEach((en) => { if (en.isIntersecting) { playResultCount(); io.disconnect(); } });
    }, { threshold: 0.3 });
    io.observe(heroEl);
  }

  /* ---------- Lead-Formular ---------- */
  const form = $("#leadForm");
  if (form) form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fields = [["lf_vorname", (v) => v.trim()], ["lf_nachname", (v) => v.trim()], ["lf_firma", (v) => v.trim()], ["lf_email", emailOk]];
    let ok = true, firstErr = null;
    fields.forEach(([id, test]) => {
      const el = $("#" + id), msg = $(`.err-msg[data-for="${id}"]`);
      const good = test(el.value);
      el.classList.toggle("err", !good);
      if (msg) msg.classList.toggle("show", !good);
      if (!good && !firstErr) firstErr = el;
      if (!good) ok = false;
    });
    const priv = $("#lf_privacy"), pmsg = $('.err-msg[data-for="lf_privacy"]');
    if (priv && !priv.checked) { ok = false; if (pmsg) pmsg.classList.add("show"); if (!firstErr) firstErr = priv; }
    else if (pmsg) pmsg.classList.remove("show");
    if (!ok) { if (firstErr) firstErr.focus(); return; }

    const r = last || compute();
    const g = (id) => ($("#" + id) ? $("#" + id).value : "");
    const b = bereiche();
    const bsel = [b.versorgung && "Versorgung", b.beschaffung && "Beschaffung", b.optimierung && "Optimierung"].filter(Boolean).join(", ") || "—";
    const ref = "WB-POT-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const body = [
      "EINKAUFS-POTENZIAL-RECHNER — Auswertung",
      "",
      "Einsparpotenzial / Jahr: " + eur(r.total) + (r.V > 0 ? "  (" + r.pct.toFixed(1).replace(".", ",") + " % vom Volumen)" : ""),
      "Auf 3 Jahre: " + eur(r.total * 3),
      "WEBUNDO Potenzial-Score: " + r.score + " / 100  (" + scoreLabel(r.score) + ")",
      "",
      "Aufschlüsselung:",
      "  Lieferanten-/Kreditorenpflege: " + eur(r.sAdmin),
      "  Bestell-/Prozessabwicklung: " + eur(r.sProcess),
      "  Bündelungs-/Preisvorteil: " + eur(r.sPrice),
      "",
      "Eingaben:",
      "  Aktive Lieferanten: " + g("lieferanten"),
      "  Bestellvorgänge / Jahr: " + g("bestellungen"),
      "  Einkaufsvolumen / Jahr: " + g("volumen") + " €",
      "  Interessante Bereiche: " + bsel,
      "",
      "Kontakt:",
      "  " + g("lf_vorname") + " " + g("lf_nachname") + (g("lf_position") ? " (" + g("lf_position") + ")" : ""),
      "  " + g("lf_firma"),
      "  " + g("lf_email") + (g("lf_phone") ? " · " + g("lf_phone") : ""),
      "",
      "Referenz: " + ref,
    ].join("\n");
    const mailto = "mailto:info@webundo.de?subject=" + encodeURIComponent("Einkaufs-Potenzial-Rechner – Auswertung " + g("lf_firma") + " (" + ref + ")") + "&body=" + encodeURIComponent(body);

    form.hidden = true;
    const bl = $("#breakdownLock"); if (bl) bl.classList.add("unlocked");
    const done = $("#leadDone");
    done.hidden = false;
    done.innerHTML = `<div class="done" style="padding:8px 0 0">
        <div class="done__badge"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
        <h3>Danke, ${(g("lf_vorname") || "").replace(/[<>&]/g, "")}! Ihre Auswertung ist freigeschaltet.</h3>
        <p>Wir haben Ihr Einsparpotenzial von <strong>${eur(r.total)} / Jahr</strong> (Score ${r.score}/100) erfasst und melden uns zur persönlichen Besprechung — in der Regel innerhalb von 24 Stunden.</p>
        <div class="done__ref">Ihre Referenz: <b>${ref}</b></div>
        <div class="done__actions">
          <a class="btn btn--primary" href="${mailto}">Auswertung als E-Mail senden</a>
          <button type="button" class="btn btn--ghost" id="lfRestart">Neue Berechnung</button>
        </div>
      </div>`;
    (document.getElementById("auswertung") || done).scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.__wbBurst) window.__wbBurst();
    $("#lfRestart").addEventListener("click", () => { done.hidden = true; done.innerHTML = ""; form.hidden = false; form.reset(); if (bl) bl.classList.remove("unlocked"); render(); form.scrollIntoView({ behavior: "smooth", block: "center" }); });
  });

  $$("#leadForm .input").forEach((i) => i.addEventListener("input", () => { i.classList.remove("err"); const m = $(`.err-msg[data-for="${i.id}"]`); if (m) m.classList.remove("show"); }));
  const lfp = $("#lf_privacy"); if (lfp) lfp.addEventListener("change", () => { const m = $('.err-msg[data-for="lf_privacy"]'); if (m && lfp.checked) m.classList.remove("show"); });

  /* ---------- Konfetti ---------- */
  window.__wbBurst = function () {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("canvas"); c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999"; document.body.appendChild(c);
    const x = c.getContext("2d"); const W = (c.width = innerWidth), H = (c.height = innerHeight);
    const cols = ["#1366c8", "#4db3d4", "#5fa733", "#0a3a66", "#ffffff"];
    const P = Array.from({ length: 120 }, () => ({ x: W / 2, y: H * 0.4, vx: (Math.random() - 0.5) * 13, vy: Math.random() * -12 - 3, g: 0.3 + Math.random() * 0.2, s: 4 + Math.random() * 6, c: cols[(Math.random() * cols.length) | 0], r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 }));
    let t = 0;
    (function loop() {
      x.clearRect(0, 0, W, H); t++;
      P.forEach((p) => { p.vy += p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); x.restore(); });
      if (t < 140) requestAnimationFrame(loop); else c.remove();
    })();
  };
})();
