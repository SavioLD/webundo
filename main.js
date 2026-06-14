/* ============================================================
   WEBUNDO — Seiten-Chrome (Navigation, Mobile-Menü, Jahr)
   Ländle Digital
============================================================ */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // Jahr im Footer
  $$("[data-year]").forEach((e) => (e.textContent = new Date().getFullYear()));

  // Mobile-Menü
  const burger = $("#burger"), mobile = $("#topbarMobile");
  if (burger && mobile) {
    burger.addEventListener("click", () => {
      const open = mobile.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    $$("#topbarMobile a").forEach((a) =>
      a.addEventListener("click", () => {
        mobile.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      })
    );
  }

  // Kontaktformular → an die Geschäftsstelle (info@webundo.de)
  const kf = $("#kontaktForm");
  if (kf) {
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const showErr = (id, on) => { const m = $(`.err-msg[data-for="${id}"]`); if (m) m.classList.toggle("show", on); const el = $("#" + id); if (el) el.classList.toggle("err", on); };
    // Themen-Chips (Einfachauswahl)
    let topic = "";
    $$("#kfTopics .topicchip").forEach((c) => c.addEventListener("click", () => {
      const on = c.classList.contains("is-on");
      $$("#kfTopics .topicchip").forEach((x) => x.classList.remove("is-on"));
      if (!on) { c.classList.add("is-on"); topic = c.getAttribute("data-topic") || ""; } else { topic = ""; }
    }));
    kf.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const msg = $("#kf_message"), name = $("#kf_name"), phone = $("#kf_phone"), mail = $("#kf_email"), priv = $("#kf_privacy");
      let ok = true;
      if (!mail.value || !emailOk(mail.value)) { showErr("kf_email", true); ok = false; } else showErr("kf_email", false);
      if (!msg.value.trim()) { showErr("kf_message", true); ok = false; } else showErr("kf_message", false);
      const pmsg = $('.err-msg[data-for="kf_privacy"]');
      if (priv && !priv.checked) { if (pmsg) pmsg.classList.add("show"); ok = false; } else if (pmsg) pmsg.classList.remove("show");
      if (!ok) return;
      const body = [
        "Neue Kontaktanfrage über webundo.de",
        "",
        "Thema: " + (topic || "—"),
        "Name: " + ((name && name.value.trim()) || "—"),
        "E-Mail: " + mail.value,
        "Telefon: " + ((phone && phone.value.trim()) || "—"),
        "",
        "Nachricht:",
        msg.value,
      ].join("\n");
      const subject = "Anfrage" + (topic ? " – " + topic : "") + (name && name.value.trim() ? " (" + name.value.trim() + ")" : "");
      const href = "mailto:info@webundo.de?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      window.location.href = href;
      const done = $("#kfDone");
      if (done) { done.hidden = false; done.scrollIntoView({ behavior: "smooth", block: "center" }); }
      kf.reset();
      $$("#kfTopics .topicchip").forEach((x) => x.classList.remove("is-on")); topic = "";
    });
    $$("#kontaktForm .input").forEach((i) => i.addEventListener("input", () => { i.classList.remove("err"); const m = $(`.err-msg[data-for="${i.id}"]`); if (m) m.classList.remove("show"); }));
  }

  // Header-Schatten beim Scrollen
  const topbar = $("#topbar");
  if (topbar) {
    const onScroll = () => topbar.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();

/* ============================================================
   WEBUNDO — UX-Layer: Scroll-Reveal, Zähler, Fortschritt, Parallax
============================================================ */
(function () {
  "use strict";
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Scroll-Fortschrittsbalken */
  const bar = document.createElement("div");
  bar.className = "scrollprog";
  document.body.appendChild(bar);
  const onProg = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
  };
  onProg();
  window.addEventListener("scroll", onProg, { passive: true });

  if (reduce) return;

  /* Zähler-Animation */
  function countUp(el) {
    const raw = el.getAttribute("data-count") || el.textContent;
    const m = String(raw).match(/^([^\d-]*)([\d.,]+)(.*)$/);
    if (!m) return;
    const pre = m[1], suf = m[3];
    const target = parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    if (isNaN(target)) return;
    const dur = 1100, t0 = performance.now();
    const dec = m[2].includes(",") ? 1 : 0;
    el.setAttribute("data-count", raw);
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = target * e;
      el.textContent = pre + (dec ? v.toFixed(1).replace(".", ",") : Math.round(v).toLocaleString("de-DE")) + suf;
      if (p < 1) requestAnimationFrame(step); else el.textContent = raw;
    })(t0);
  }

  /* Reveal-on-Scroll mit Stagger */
  const SEL = ".reveal,.sec__title,.svcsec__title,.valprop,.pillar,.svc,.situbox,.mwtile,.wmvcard,.valuecard,.branche,.step3,.logos__item,.compare,.about__intro,.checklist li,.costbox,.leadcard,.result__3yr,.person,.mstone,.stat,.partners__intro,.team__intro,.tchip,.compare__result,.scorewrap";
  const els = $$(SEL).filter((e) => !e.closest(".marquee"));

  // Stagger-Verzögerung anhand Geschwister-Index
  const seen = new Map();
  els.forEach((el) => {
    const p = el.parentElement;
    const i = seen.get(p) || 0;
    seen.set(p, i + 1);
    el.style.setProperty("--rd", Math.min(i, 6) * 75 + "ms");
  });

  if (!("IntersectionObserver" in window)) {
    els.forEach((e) => e.classList.add("in"));
    $$(".stat b").forEach(countUp);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("in");
      const b = en.target.matches(".stat") ? en.target.querySelector("b") : null;
      if (b && !b.dataset.done) { b.dataset.done = "1"; countUp(b); }
      io.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
  els.forEach((e) => io.observe(e));

  /* Sanfte Parallax auf Hero-Bildern */
  const par = $$(".phero__img");
  if (par.length) {
    let tick = false;
    const move = () => {
      par.forEach((im) => {
        const r = im.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        im.style.transform = "translateY(" + (r.top * -0.12) + "px) scale(1.08)";
      });
      tick = false;
    };
    window.addEventListener("scroll", () => { if (!tick) { tick = true; requestAnimationFrame(move); } }, { passive: true });
    move();
  }
})();
