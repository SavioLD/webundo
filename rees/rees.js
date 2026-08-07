/* ============================================================
   REES Zerspanungstechnik – Interaktion
   Vanilla JS, kein Build-Schritt, kein Framework.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Sticky-Navigation ---------- */
  var nav = document.getElementById("nav");
  if (nav) {
    var onScroll = function () {
      nav.classList.toggle("is-stuck", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobiles Menü ---------- */
  var burger = document.getElementById("burger");
  var mob = document.getElementById("navMobile");
  if (burger && mob) {
    burger.addEventListener("click", function () {
      var open = mob.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
    });
    mob.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        mob.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Aktiven Menüpunkt markieren ---------- */
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav__links a, .nav__mob a").forEach(function (a) {
    var href = a.getAttribute("href");
    if (href && href === here) a.classList.add("is-on");
  });

  /* ---------- Scroll-Reveal ---------- */
  var reveals = document.querySelectorAll("[data-rv]");
  if (reveals.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          var delay = parseInt(el.getAttribute("data-rv"), 10) || 0;
          el.style.transitionDelay = delay + "ms";
          el.classList.add("is-in");
          io.unobserve(el);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  }

  /* ---------- Zähler animieren ---------- */
  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          cio.unobserve(el);
          var target = parseFloat(el.getAttribute("data-count"));
          var suffix = el.getAttribute("data-suffix") || "";
          var prefix = el.getAttribute("data-prefix") || "";
          // Jahreszahlen o. Ä. ohne Tausenderpunkt ausgeben
          var plain = el.getAttribute("data-format") === "plain";
          var fmt = function (n) {
            return plain ? String(n) : n.toLocaleString("de-DE");
          };
          if (reduce) {
            el.textContent = prefix + fmt(target) + suffix;
            return;
          }
          var start = performance.now();
          var dur = 1400;
          var tick = function (now) {
            var p = Math.min((now - start) / dur, 1);
            var eased = 1 - Math.pow(1 - p, 3);
            el.textContent = prefix + fmt(Math.round(target * eased)) + suffix;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach(function (el) {
      cio.observe(el);
    });
  }

  /* ---------- Akkordeon ---------- */
  document.querySelectorAll(".acc").forEach(function (acc) {
    acc.addEventListener("click", function (e) {
      var btn = e.target.closest(".acc__btn");
      if (!btn) return;
      var item = btn.closest(".acc__item");
      var open = item.classList.contains("is-open");
      acc.querySelectorAll(".acc__item").forEach(function (i) {
        i.classList.remove("is-open");
        i.querySelector(".acc__btn").setAttribute("aria-expanded", "false");
      });
      if (!open) {
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Formulare: Demo-Versand per mailto ---------- */
  document.querySelectorAll("form[data-mailto]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var to = form.getAttribute("data-mailto");
      var subject = form.getAttribute("data-subject") || "Anfrage über die Website";
      var lines = [];
      new FormData(form).forEach(function (val, key) {
        if (key === "dsgvo") val = "akzeptiert";
        lines.push(key + ": " + val);
      });
      location.href =
        "mailto:" +
        to +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(lines.join("\n"));
    });
  });

  /* ---------- Jahreszahl im Footer ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
