/* ============================================================
   Gesichter der Stadt – Rottweil
   Gemeinsames Skript für alle Seiten des Projekts:
   Mobile-Navigation, Jahreszahl, Scroll-Reveal, Aktions-Formular.
============================================================ */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------- Mobile-Menü --- */
  var burger = $("#burger"), mobileNav = $("#mobileNav");
  if (burger && mobileNav) {
    var setMenu = function (open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
      mobileNav.classList.toggle("is-open", open);
    };
    burger.addEventListener("click", function () {
      setMenu(burger.getAttribute("aria-expanded") !== "true");
    });
    mobileNav.addEventListener("click", function (ev) {
      if (ev.target.tagName === "A") setMenu(false);
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && burger.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        burger.focus();
      }
    });
  }

  /* ------------------------------------------------------ Jahreszahl --- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* --------------------------------------------------- Scroll-Reveal --- */
  var reveal = $$(".rv");
  if (document.documentElement.classList.contains("anim") && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveal.forEach(function (el) { io.observe(el); });
  } else {
    reveal.forEach(function (el) { el.classList.add("in"); });
  }

  /* ----------------------------------------------- Aktions-Formular ---
     Ohne Backend: geprüft wird im Browser, versendet per E-Mail-Programm.
     Sobald ein Endpunkt existiert, kann der mailto-Teil unten durch ein
     fetch() auf die API ersetzt werden – die Validierung bleibt gleich.
  --------------------------------------------------------------------- */
  var form = $("#aktionForm");
  if (!form) return;

  var MAIL_TO = form.getAttribute("data-mailto") || "info@wave2network.de";
  var emailOk = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); };

  var showErr = function (id, on) {
    var msg = $('.err-msg[data-for="' + id + '"]');
    if (msg) msg.classList.toggle("show", on);
    var field = $("#" + id);
    if (field) {
      field.classList.toggle("err", on);
      field.setAttribute("aria-invalid", on ? "true" : "false");
    }
  };

  /* Art der Aktion – Einfachauswahl über Chips */
  var kind = "";
  $$("#aktionKind .chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var wasOn = chip.classList.contains("is-on");
      $$("#aktionKind .chip").forEach(function (x) {
        x.classList.remove("is-on");
        x.setAttribute("aria-pressed", "false");
      });
      if (!wasOn) {
        chip.classList.add("is-on");
        chip.setAttribute("aria-pressed", "true");
        kind = chip.getAttribute("data-kind") || "";
      } else {
        kind = "";
      }
      showErr("aktionKind", false);
    });
  });

  /* Fehler verschwinden, sobald korrigiert wird */
  $$(".input", form).forEach(function (el) {
    el.addEventListener("input", function () { showErr(el.id, false); });
  });
  var privacy = $("#af_privacy");
  if (privacy) {
    privacy.addEventListener("change", function () {
      var msg = $('.err-msg[data-for="af_privacy"]');
      if (msg && privacy.checked) msg.classList.remove("show");
    });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    /* Honigtopf: von Menschen nie ausgefüllt */
    var trap = $("#af_website");
    if (trap && trap.value) return;

    var val = function (id) { var el = $("#" + id); return el ? el.value.trim() : ""; };
    var ok = true;
    var firstBad = null;
    var fail = function (id) {
      showErr(id, true);
      ok = false;
      if (!firstBad) firstBad = $("#" + id) || $("#" + id + "Group");
    };

    if (!val("af_company")) fail("af_company"); else showErr("af_company", false);
    if (!emailOk(val("af_email"))) fail("af_email"); else showErr("af_email", false);
    if (!val("af_title")) fail("af_title"); else showErr("af_title", false);
    if (!val("af_text")) fail("af_text"); else showErr("af_text", false);

    var kindMsg = $('.err-msg[data-for="aktionKind"]');
    if (!kind) {
      if (kindMsg) kindMsg.classList.add("show");
      ok = false;
      if (!firstBad) firstBad = $("#aktionKind");
    } else if (kindMsg) {
      kindMsg.classList.remove("show");
    }

    var privMsg = $('.err-msg[data-for="af_privacy"]');
    if (privacy && !privacy.checked) {
      if (privMsg) privMsg.classList.add("show");
      ok = false;
      if (!firstBad) firstBad = privacy;
    } else if (privMsg) {
      privMsg.classList.remove("show");
    }

    if (!ok) {
      if (firstBad && firstBad.scrollIntoView) {
        firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
        if (firstBad.focus) firstBad.focus({ preventScroll: true });
      }
      return;
    }

    var dash = function (v) { return v || "—"; };
    var body = [
      "Neue Aktion für „Gesichter der Stadt\"",
      "",
      "Betrieb: " + val("af_company"),
      "Ansprechpartner: " + dash(val("af_contact")),
      "E-Mail: " + val("af_email"),
      "Telefon: " + dash(val("af_phone")),
      "",
      "Art der Aktion: " + kind,
      "Titel: " + val("af_title"),
      "Zeitraum: " + dash(val("af_from")) + " bis " + dash(val("af_to")),
      "Link: " + dash(val("af_link")),
      "",
      "Beschreibung:",
      val("af_text")
    ].join("\n");

    var subject = "Aktion einreichen – " + val("af_title") + " (" + val("af_company") + ")";
    window.location.href = "mailto:" + MAIL_TO +
      "?subject=" + encodeURIComponent(subject) +
      "&body=" + encodeURIComponent(body);

    var done = $("#aktionDone");
    if (done) {
      done.hidden = false;
      done.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    form.reset();
    $$("#aktionKind .chip").forEach(function (x) {
      x.classList.remove("is-on");
      x.setAttribute("aria-pressed", "false");
    });
    kind = "";
  });
})();
