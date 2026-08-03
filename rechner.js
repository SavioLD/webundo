/* ============================================================
   WEBUNDO — Sonderbedarfs-Einsparrechner
   Modell: Prozesskosten-Ersparnis bei Sonder- und Einmalbedarfen.
   Grundlage: BME Benchmark 2025 „Top-Kennzahlen Einkauf", Kap. 3.1.2.1
   → Kosten je Bestellvorgang: 121,75 €
   Formel: Anzahl Vorgänge/Jahr × 121,75 € × Einsparfaktor
============================================================ */
(function () {
  "use strict";

  /* ---------- KONFIGURATION (Admin/Customizer) ----------
     Diese beiden Werte hier anpassen, um Standardwerte zentral zu ändern. */
  const COST_PER_ORDER = 121.75;      // € je Bestellvorgang (BME Benchmark 2025)
  const DEFAULT_SAVINGS_FACTOR = 80;  // % Einsparfaktor (Standardwert, editierbar)
  /* ------------------------------------------------------- */

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);
  const eur = (n) => "€ " + Math.round(Math.max(0, n)).toLocaleString("de-DE");
  const plain = (n) => Math.round(Math.max(0, n)).toLocaleString("de-DE");
  const intVal = (id) => { const e = $("#" + id); if (!e) return 0; const v = parseInt(String(e.value).replace(/\D/g, ""), 10); return isNaN(v) ? 0 : v; };
  const pct = (id, def) => { const e = $("#" + id); if (!e) return def; const v = parseFloat(String(e.value).replace(",", ".")); return isNaN(v) ? def : v; };

  let last = null;
  let revealActive = false;
  let resultPlayed = false;

  function compute() {
    const V = intVal("vorgaenge");                     // Sonder-/Einmalbedarfe pro Jahr
    let f = clamp(pct("faktor", DEFAULT_SAVINGS_FACTOR), 0, 100); // Einsparfaktor %
    const total = V * COST_PER_ORDER * (f / 100);
    return { V, f, total };
  }

  function render() {
    const r = compute();
    last = r;
    const set = (id, v) => { const e = $("#" + id); if (e) e.textContent = v; };

    if (!revealActive) { set("livEuro", plain(r.total)); set("resEuro", plain(r.total)); }
    set("resBadge", "Einsparpotenzial pro Jahr");
    set("fVorg", r.V.toLocaleString("de-DE"));
    set("fFakt", (Number.isInteger(r.f) ? r.f : r.f.toFixed(1).replace(".", ",")));
    if (!revealActive) set("res3yr", eur(r.total * 3));
  }

  function updateOutputs() {
    const e = $("#outVorg");
    if (e) e.textContent = intVal("vorgaenge").toLocaleString("de-DE");
  }

  // Eingaben verdrahten
  ["vorgaenge", "faktor"].forEach((id) => {
    const e = $("#" + id);
    if (e) { e.addEventListener("input", onInput); e.addEventListener("change", onInput); }
  });
  function onInput() { updateOutputs(); render(); }

  // Standard-Einsparfaktor aus Konfiguration setzen; optionale URL-Parameter (?vorgaenge= & ?faktor=)
  (function initFromConfig() {
    const fEl = $("#faktor");
    if (fEl) fEl.value = String(DEFAULT_SAVINGS_FACTOR);
    try {
      const q = new URLSearchParams(location.search);
      const qv = q.get("vorgaenge"), qf = q.get("faktor");
      if (qv && $("#vorgaenge")) $("#vorgaenge").value = String(clamp(parseInt(qv, 10) || 0, 10, 2000));
      if (qf && fEl) fEl.value = String(clamp(parseFloat(qf.replace(",", ".")) || DEFAULT_SAVINGS_FACTOR, 0, 100));
    } catch (_) {}
  })();

  updateOutputs();
  render();

  /* ---------- Zähler-Animation beim Sichtbarwerden des Ergebnisses ---------- */
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function animNum(el, to, fmt, dur) {
    if (!el) return;
    const t0 = performance.now(); dur = dur || 1100;
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
    setTimeout(() => { revealActive = false; render(); }, 1200);
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
    const fStr = Number.isInteger(r.f) ? r.f + " %" : r.f.toFixed(1).replace(".", ",") + " %";
    const ref = "WB-SB-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const body = [
      "SONDERBEDARFS-EINSPARRECHNER — Auswertung",
      "",
      "Potenzielles Einsparvolumen / Jahr: " + eur(r.total),
      "Hochgerechnet auf 3 Jahre: " + eur(r.total * 3),
      "",
      "Berechnung:",
      "  Sonder-/Einmalbedarfe pro Jahr: " + r.V.toLocaleString("de-DE"),
      "  Prozesskosten je Bestellvorgang: 121,75 € (BME Benchmark 2025)",
      "  Einsparfaktor: " + fStr,
      "  = " + r.V.toLocaleString("de-DE") + " × 121,75 € × " + fStr + " = " + eur(r.total),
      "",
      "Kontakt:",
      "  " + g("lf_vorname") + " " + g("lf_nachname") + (g("lf_position") ? " (" + g("lf_position") + ")" : ""),
      "  " + g("lf_firma"),
      "  " + g("lf_email") + (g("lf_phone") ? " · " + g("lf_phone") : ""),
      "",
      "Grundlage: BME Benchmark 2025 „Top-Kennzahlen Einkauf\", Kap. 3.1.2.1 — Kosten je Bestellvorgang 121,75 €.",
      "Referenz: " + ref,
    ].join("\n");
    const mailto = "mailto:info@webundo.de?subject=" + encodeURIComponent("Sonderbedarfs-Einsparrechner – Auswertung " + g("lf_firma") + " (" + ref + ")") + "&body=" + encodeURIComponent(body);

    form.hidden = true;
    const done = $("#leadDone");
    done.hidden = false;
    done.innerHTML = `<div class="done" style="padding:8px 0 0">
        <div class="done__badge"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
        <h3>Danke, ${(g("lf_vorname") || "").replace(/[<>&]/g, "")}! Ihre Auswertung ist bereit.</h3>
        <p>Wir haben Ihr Einsparpotenzial von <strong>${eur(r.total)} / Jahr</strong> erfasst und melden uns zur persönlichen Besprechung — in der Regel innerhalb von 24 Stunden.</p>
        <div class="done__ref">Ihre Referenz: <b>${ref}</b></div>
        <div class="done__actions">
          <a class="btn btn--primary" href="${mailto}">Auswertung als E-Mail senden</a>
          <button type="button" class="btn btn--ghost" id="lfRestart">Neue Berechnung</button>
        </div>
      </div>`;
    (document.getElementById("auswertung") || done).scrollIntoView({ behavior: "smooth", block: "start" });
    if (window.__wbBurst) window.__wbBurst();
    $("#lfRestart").addEventListener("click", () => { done.hidden = true; done.innerHTML = ""; form.hidden = false; form.reset(); render(); form.scrollIntoView({ behavior: "smooth", block: "center" }); });
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
