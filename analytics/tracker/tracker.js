/*!
 * WEBUNDO Analytics – leichtgewichtiger Tracker (Vanilla JS, keine Abhängigkeiten)
 *
 * Einbindung:
 *   <script src="https://analytics.example.com/tracker.js"
 *           data-website-id="WEBSITE_ID" defer></script>
 *
 * Eigenschaften:
 *   - Erfasst Seitenaufrufe inkl. SPA-Navigation (History-API + popstate)
 *   - Anonyme Sessions (sessionStorage, 30 Min. Inaktivitäts-Timeout)
 *   - Benutzerdefinierte Events: window.analytics.track(name, props)
 *   - Auto-Tracking (optional): Klicks auf [data-track], Formularstart/-abschluss,
 *     JS-Fehler, Core Web Vitals
 *   - Erfasst KEINE Formularinhalte / keine personenbezogenen Daten
 *   - Bündelt Events und sendet via navigator.sendBeacon (fällt auf fetch zurück)
 *   - Respektiert Do-Not-Track und optionales Consent-Gate
 *   - Schlägt niemals sichtbar fehl (alles in try/catch, keine Website-Fehler)
 *
 * Konfiguration über data-Attribute des <script>-Tags:
 *   data-website-id       (Pflicht) öffentliche Website-ID
 *   data-api              (optional) Basis-URL der API (Default: Origin des Scripts)
 *   data-require-consent  "true" => sendet erst nach analytics.consent(true)
 *   data-track-clicks     "false" zum Deaktivieren (Default an)
 *   data-track-forms      "false" zum Deaktivieren (Default an)
 *   data-track-errors     "false" zum Deaktivieren (Default an)
 *   data-track-performance "false" zum Deaktivieren (Default an)
 */
(function () {
  "use strict";
  try {
    if (window.analytics && window.analytics.__loaded) return;

    var script =
      document.currentScript ||
      (function () {
        var s = document.getElementsByTagName("script");
        return s[s.length - 1];
      })();
    var cfg = (script && script.dataset) || {};

    var WEBSITE_ID = cfg.websiteId;
    if (!WEBSITE_ID) return; // ohne Website-ID nichts tun

    // API-Endpunkt: explizit oder aus dem Script-Origin ableiten.
    var apiBase = cfg.api || "";
    if (!apiBase && script && script.src) {
      try {
        apiBase = new URL(script.src).origin;
      } catch (_) {}
    }
    var ENDPOINT = (apiBase || "").replace(/\/$/, "") + "/api/analytics/events";

    var opt = function (v, def) {
      return v === undefined ? def : v !== "false";
    };
    var TRACK_CLICKS = opt(cfg.trackClicks, true);
    var TRACK_FORMS = opt(cfg.trackForms, true);
    var TRACK_ERRORS = opt(cfg.trackErrors, true);
    var TRACK_PERF = opt(cfg.trackPerformance, true);
    var REQUIRE_CONSENT = cfg.requireConsent === "true";

    // Do-Not-Track respektieren.
    var dnt =
      navigator.doNotTrack === "1" ||
      window.doNotTrack === "1" ||
      navigator.msDoNotTrack === "1";

    // ── Session-Verwaltung (anonym, ohne persistente Kennung) ────────────────
    var SESSION_TTL = 30 * 60 * 1000; // 30 Minuten Inaktivität
    function uuid() {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
      return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });
    }
    function getSessionId() {
      try {
        var raw = sessionStorage.getItem("_wa_sess");
        var now = Date.now();
        if (raw) {
          var o = JSON.parse(raw);
          if (o && o.id && now - o.ts < SESSION_TTL) {
            o.ts = now;
            sessionStorage.setItem("_wa_sess", JSON.stringify(o));
            return o.id;
          }
        }
        var id = uuid();
        sessionStorage.setItem("_wa_sess", JSON.stringify({ id: id, ts: now }));
        return id;
      } catch (_) {
        // sessionStorage nicht verfügbar (z. B. Privatmodus) -> flüchtige ID
        return uuid();
      }
    }

    // ── Event-Queue + Batching ───────────────────────────────────────────────
    var queue = [];
    var consentGiven = !REQUIRE_CONSENT;
    var flushTimer = null;

    function buildEvent(name, type, props) {
      var loc = window.location;
      return {
        eventId: uuid(),
        // tenantId/visitorId werden serverseitig gesetzt.
        websiteId: WEBSITE_ID,
        sessionId: getSessionId(),
        eventName: name,
        eventType: type,
        pageUrl: loc.href,
        pagePath: loc.pathname,
        pageTitle: document.title || undefined,
        referrer: document.referrer || undefined,
        properties: sanitizeProps(props),
        timestamp: new Date().toISOString(),
      };
    }

    // Nur primitive Werte zulassen; niemals DOM-/Formularinhalte durchreichen.
    function sanitizeProps(props) {
      if (!props || typeof props !== "object") return undefined;
      var out = {};
      var n = 0;
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        if (n >= 30) break;
        var v = props[k];
        var t = typeof v;
        if (t === "string") out[k] = v.slice(0, 500);
        else if (t === "number" && isFinite(v)) out[k] = v;
        else if (t === "boolean" || v === null) out[k] = v;
        n++;
      }
      return out;
    }

    function enqueue(ev) {
      if (dnt) return; // DNT: nichts erfassen
      queue.push(ev);
      if (!consentGiven) return; // Consent ausstehend: puffern, nicht senden
      if (queue.length >= 10) flush();
      else scheduleFlush();
    }

    function scheduleFlush() {
      if (flushTimer) return;
      flushTimer = setTimeout(flush, 3000);
    }

    function flush(useBeacon) {
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      if (!consentGiven || queue.length === 0) return;
      var batch = queue.splice(0, queue.length);
      var body = JSON.stringify(batch.length === 1 ? batch[0] : batch);
      try {
        if (useBeacon && navigator.sendBeacon) {
          var blob = new Blob([body], { type: "application/json" });
          var ok = navigator.sendBeacon(ENDPOINT, blob);
          if (!ok) requeue(batch);
        } else {
          fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: body,
            keepalive: true,
            credentials: "omit",
            mode: "cors",
          })["catch"](function () {
            /* Netzwerkfehler ignorieren – keine Website-Fehler auslösen */
          });
        }
      } catch (_) {
        /* still */
      }
    }
    function requeue(batch) {
      // Bei fehlgeschlagenem Beacon zurücklegen (begrenzt), erneut versuchen.
      if (queue.length < 50) queue = batch.concat(queue);
    }

    // ── Öffentliche API ──────────────────────────────────────────────────────
    var api = {
      __loaded: true,
      track: function (name, props) {
        try {
          if (!name) return;
          enqueue(buildEvent(String(name), "custom", props));
        } catch (_) {}
      },
      trackConversion: function (name, props) {
        try {
          enqueue(buildEvent(String(name), "conversion", props));
        } catch (_) {}
      },
      pageview: function () {
        try {
          enqueue(buildEvent("page_view", "page_view"));
        } catch (_) {}
      },
      // Consent-Management: bei require-consent erst hier freigeben.
      consent: function (granted) {
        consentGiven = !!granted;
        if (consentGiven) flush();
        else queue = []; // Zustimmung entzogen -> Puffer verwerfen
      },
    };
    window.analytics = api;

    // ── Automatische Seitenaufrufe (inkl. SPA) ───────────────────────────────
    api.pageview();

    function hookHistory(method) {
      var orig = history[method];
      if (typeof orig !== "function") return;
      history[method] = function () {
        var ret = orig.apply(this, arguments);
        try {
          window.dispatchEvent(new Event("wa:locationchange"));
        } catch (_) {}
        return ret;
      };
    }
    hookHistory("pushState");
    hookHistory("replaceState");
    var lastPath = window.location.pathname;
    function onNav() {
      if (window.location.pathname === lastPath) return;
      lastPath = window.location.pathname;
      api.pageview();
    }
    window.addEventListener("popstate", onNav);
    window.addEventListener("wa:locationchange", onNav);

    // ── Klick-Tracking (nur markierte Elemente) ──────────────────────────────
    if (TRACK_CLICKS) {
      document.addEventListener(
        "click",
        function (e) {
          try {
            var el = e.target && e.target.closest ? e.target.closest("[data-track]") : null;
            if (!el) return;
            var name = el.getAttribute("data-track") || "click";
            var props = {};
            for (var i = 0; i < el.attributes.length; i++) {
              var a = el.attributes[i];
              if (a.name.indexOf("data-track-") === 0) {
                props[a.name.slice("data-track-".length)] = a.value;
              }
            }
            enqueue(buildEvent(name, "click", props));
          } catch (_) {}
        },
        true,
      );
    }

    // ── Formular-Tracking (Start + Abschluss, OHNE Inhalte) ──────────────────
    if (TRACK_FORMS) {
      var startedForms = new WeakSet();
      document.addEventListener(
        "focusin",
        function (e) {
          try {
            var form = e.target && e.target.form;
            if (!form || startedForms.has(form)) return;
            startedForms.add(form);
            enqueue(
              buildEvent("form_started", "form", {
                form: form.getAttribute("name") || form.id || "unnamed",
              }),
            );
          } catch (_) {}
        },
        true,
      );
      document.addEventListener(
        "submit",
        function (e) {
          try {
            var form = e.target;
            if (!form || form.tagName !== "FORM") return;
            // Nur Metadaten – niemals Feldwerte.
            enqueue(
              buildEvent("form_submitted", "form", {
                form: form.getAttribute("name") || form.id || "unnamed",
              }),
            );
          } catch (_) {}
        },
        true,
      );
    }

    // ── Fehler-Tracking ──────────────────────────────────────────────────────
    if (TRACK_ERRORS) {
      window.addEventListener("error", function (e) {
        try {
          enqueue(
            buildEvent("js_error", "error", {
              message: (e && e.message ? String(e.message) : "error").slice(0, 300),
              source: e && e.filename ? String(e.filename).slice(0, 300) : undefined,
              line: e && e.lineno ? e.lineno : undefined,
            }),
          );
        } catch (_) {}
      });
      window.addEventListener("unhandledrejection", function (e) {
        try {
          var reason = e && e.reason ? String(e.reason.message || e.reason) : "unhandledrejection";
          enqueue(buildEvent("promise_rejection", "error", { message: reason.slice(0, 300) }));
        } catch (_) {}
      });
    }

    // ── Performance / Core Web Vitals (leichtgewichtig) ──────────────────────
    if (TRACK_PERF && "PerformanceObserver" in window) {
      var vitals = {};
      function observe(type, cb) {
        try {
          var po = new PerformanceObserver(function (list) {
            cb(list.getEntries(), po);
          });
          po.observe({ type: type, buffered: true });
        } catch (_) {}
      }
      // LCP
      observe("largest-contentful-paint", function (entries) {
        var last = entries[entries.length - 1];
        if (last) vitals.lcp = Math.round(last.startTime);
      });
      // CLS (kumuliert)
      var cls = 0;
      observe("layout-shift", function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (!entries[i].hadRecentInput) cls += entries[i].value;
        }
        vitals.cls = Math.round(cls * 1000) / 1000;
      });
      // INP / erste Interaktion (grob)
      observe("event", function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var dur = entries[i].duration;
          if (dur && (!vitals.inp || dur > vitals.inp)) vitals.inp = Math.round(dur);
        }
      });
      // TTFB aus Navigation-Timing.
      try {
        var nav = performance.getEntriesByType("navigation")[0];
        if (nav) vitals.ttfb = Math.round(nav.responseStart);
      } catch (_) {}

      // Bei Verlassen der Seite einmalig senden.
      var perfSent = false;
      function sendVitals() {
        if (perfSent) return;
        perfSent = true;
        if (Object.keys(vitals).length) {
          enqueue(buildEvent("web_vitals", "performance", vitals));
        }
      }
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
          sendVitals();
          flush(true);
        }
      });
    }

    // ── Flush bei Seitenverlassen ────────────────────────────────────────────
    window.addEventListener("pagehide", function () {
      flush(true);
    });
    window.addEventListener("beforeunload", function () {
      flush(true);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") flush(true);
    });
  } catch (_) {
    /* Tracker darf die Website unter keinen Umständen beeinträchtigen. */
  }
})();
