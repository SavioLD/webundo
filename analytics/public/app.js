/* WEBUNDO Analytics – Dashboard-Frontend (Vanilla JS, keine Abhängigkeiten). */
(function () {
  "use strict";

  var state = { user: null, websiteId: "", from: null, to: null, realtimeTimer: null };

  var $ = function (id) { return document.getElementById(id); };
  function api(path) {
    return fetch("/api" + path, { credentials: "include" }).then(function (r) {
      if (r.status === 401) { showLogin(); throw new Error("unauthorized"); }
      return r.json();
    });
  }
  function fmt(n) { return (n == null ? 0 : n).toLocaleString("de-DE"); }
  function fmtDur(s) {
    s = Math.round(s || 0);
    var m = Math.floor(s / 60); var r = s % 60;
    return m > 0 ? m + "m " + r + "s" : r + "s";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ── Auth ────────────────────────────────────────────────────────────────
  function showLogin() { $("login").classList.remove("hidden"); $("app").classList.add("hidden"); }
  function showApp() { $("login").classList.add("hidden"); $("app").classList.remove("hidden"); }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    $("loginError").textContent = "";
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: $("email").value, password: $("password").value }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, b: b }; }); })
      .then(function (res) {
        if (!res.ok) { $("loginError").textContent = "Anmeldung fehlgeschlagen."; return; }
        state.user = res.b.user;
        init();
      })
      .catch(function () { $("loginError").textContent = "Netzwerkfehler."; });
  });

  $("logoutBtn").addEventListener("click", function () {
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(function () {
      if (state.realtimeTimer) clearInterval(state.realtimeTimer);
      showLogin();
    });
  });

  // ── Init ────────────────────────────────────────────────────────────────
  function init() {
    showApp();
    $("userName").textContent = state.user.name;
    var roleLabels = { super_admin: "Super Admin", staff: "Mitarbeiter", customer: "Kunde" };
    $("userRole").textContent = roleLabels[state.user.role] || state.user.role;

    var today = new Date();
    var from = new Date(today.getTime() - 6 * 86400000);
    $("toDate").value = iso(today);
    $("fromDate").value = iso(from);

    api("/analytics/websites").then(function (d) {
      var sel = $("websiteFilter");
      sel.innerHTML = '<option value="">Alle Websites</option>';
      (d.websites || []).forEach(function (w) {
        var o = document.createElement("option");
        o.value = w.id;
        o.textContent = w.name + " · " + w.tenant_name;
        sel.appendChild(o);
      });
      loadAll();
    });

    startRealtime();
  }

  function iso(d) { return d.toISOString().slice(0, 10); }

  $("rangePreset").addEventListener("change", function () {
    var days = parseInt(this.value, 10);
    var today = new Date();
    var from = new Date(today.getTime() - (days - 1) * 86400000);
    $("toDate").value = iso(today);
    $("fromDate").value = iso(from);
  });
  $("applyBtn").addEventListener("click", loadAll);
  $("websiteFilter").addEventListener("change", loadAll);

  function query() {
    var q = "?from=" + $("fromDate").value + "T00:00:00.000Z&to=" + $("toDate").value + "T23:59:59.999Z";
    var wid = $("websiteFilter").value;
    if (wid) q += "&websiteId=" + encodeURIComponent(wid);
    return q;
  }

  // ── Laden & Rendern ─────────────────────────────────────────────────────
  function loadAll() {
    var q = query();
    api("/analytics/overview" + q).then(renderOverview);
    api("/analytics/pages" + q).then(renderPages);
    api("/analytics/referrers" + q).then(function (d) { renderBarlist("referrers", d.referrers); });
    api("/analytics/devices" + q).then(renderDevices);
    api("/analytics/conversions" + q).then(function (d) { renderBarlist("conversions", d.conversions); });
    api("/analytics/errors" + q).then(renderErrors);
    api("/analytics/performance" + q).then(renderPerformance);
  }

  function renderOverview(d) {
    var kpis = [
      { label: "Seitenaufrufe", value: fmt(d.pageViews) },
      { label: "Sessions", value: fmt(d.sessions) },
      { label: "Eindeutige Besucher", value: fmt(d.uniqueVisitors) },
      { label: "Ø Sitzungsdauer", value: fmtDur(d.avgDurationSeconds) },
      { label: "Absprungrate", value: (d.bounceRate || 0).toFixed(1) + " %" },
    ];
    $("kpis").innerHTML = kpis
      .map(function (k) {
        return '<div class="card kpi"><div class="value">' + k.value + '</div><div class="label">' + k.label + "</div></div>";
      })
      .join("");
    renderTrend(d.trend || []);
  }

  function renderTrend(rows) {
    var el = $("trend");
    if (!rows.length) { el.innerHTML = '<div class="empty">Keine Daten im Zeitraum.</div>'; return; }
    var W = el.clientWidth || 900, H = 220, pad = 30;
    var maxV = Math.max(1, Math.max.apply(null, rows.map(function (r) { return Math.max(r.visitors, r.sessions); })));
    var x = function (i) { return pad + (i * (W - 2 * pad)) / Math.max(1, rows.length - 1); };
    var y = function (v) { return H - pad - (v * (H - 2 * pad)) / maxV; };
    function path(key) {
      return rows.map(function (r, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(r[key]).toFixed(1); }).join(" ");
    }
    var svg = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Besucherentwicklung">';
    svg += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="#26374f"/>';
    svg += '<path d="' + path("sessions") + '" fill="none" stroke="#38d39f" stroke-width="2"/>';
    svg += '<path d="' + path("visitors") + '" fill="none" stroke="#2a8be8" stroke-width="2"/>';
    rows.forEach(function (r, i) {
      svg += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(r.visitors).toFixed(1) + '" r="2.5" fill="#2a8be8"><title>' + esc(r.day) + ": " + r.visitors + " Besucher</title></circle>";
    });
    svg += "</svg>";
    el.innerHTML = svg;
  }

  function barlist(items) {
    if (!items || !items.length) return '<div class="empty">Keine Daten.</div>';
    var max = Math.max.apply(null, items.map(function (i) { return i.count; }));
    return (
      '<div class="barlist">' +
      items
        .map(function (i) {
          var pct = max > 0 ? (i.count / max) * 100 : 0;
          var label = i.label != null ? i.label : "unknown";
          return (
            '<div class="row"><div class="bar" style="width:' + pct.toFixed(1) + '%"></div>' +
            '<span class="lbl">' + esc(label) + '</span><span class="cnt">' + fmt(i.count) + "</span></div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function renderBarlist(id, items) { $(id).innerHTML = barlist(items); }

  function renderPages(d) {
    $("pages").innerHTML = barlist((d.topPages || []).map(function (p) { return { label: p.label, count: p.count }; }));
    var entry = (d.entry || []).map(function (e) { return "<tr><td>" + esc(e.label) + '</td><td class="num">' + fmt(e.count) + "</td></tr>"; }).join("");
    var exit = (d.exit || []).map(function (e) { return "<tr><td>" + esc(e.label) + '</td><td class="num">' + fmt(e.count) + "</td></tr>"; }).join("");
    $("entryexit").innerHTML =
      '<table class="mini"><thead><tr><th>Einstieg</th><th class="num">#</th></tr></thead><tbody>' +
      (entry || '<tr><td class="muted" colspan="2">–</td></tr>') +
      '</tbody></table><table class="mini" style="margin-top:10px"><thead><tr><th>Ausstieg</th><th class="num">#</th></tr></thead><tbody>' +
      (exit || '<tr><td class="muted" colspan="2">–</td></tr>') +
      "</tbody></table>";
  }

  function renderDevices(d) {
    $("devices").innerHTML = barlist(d.deviceType);
    $("browsers").innerHTML = barlist(d.browser);
    $("countries").innerHTML = barlist(d.country);
  }

  function renderErrors(d) {
    if (!d.top || !d.top.length) { $("errors").innerHTML = '<div class="empty">Keine Fehler 🎉</div>'; return; }
    $("errors").innerHTML =
      '<div class="muted" style="margin-bottom:8px">Gesamt: ' + fmt(d.total) + "</div>" +
      '<table class="mini"><thead><tr><th>Fehler</th><th>Seite</th><th class="num">#</th></tr></thead><tbody>' +
      d.top.map(function (e) {
        return "<tr><td>" + esc(e.label) + "</td><td>" + esc(e.page_path) + '</td><td class="num">' + fmt(e.count) + "</td></tr>";
      }).join("") +
      "</tbody></table>";
  }

  function renderPerformance(d) {
    if (!d.metrics || !d.metrics.length) { $("performance").innerHTML = '<div class="empty">Keine Performance-Daten.</div>'; return; }
    var order = { lcp: 1, inp: 2, cls: 3, ttfb: 4 };
    d.metrics.sort(function (a, b) { return (order[a.metric] || 9) - (order[b.metric] || 9); });
    $("performance").innerHTML =
      '<table class="mini"><thead><tr><th>Metrik</th><th class="num">Ø</th><th class="num">p75</th><th class="num">p95</th><th class="num">n</th></tr></thead><tbody>' +
      d.metrics.map(function (m) {
        var unit = m.metric === "cls" ? "" : " ms";
        return "<tr><td>" + esc(m.metric.toUpperCase()) + '</td><td class="num">' + m.avg + unit +
          '</td><td class="num">' + m.p75 + unit + '</td><td class="num">' + m.p95 + unit +
          '</td><td class="num">' + fmt(m.count) + "</td></tr>";
      }).join("") +
      "</tbody></table>";
  }

  // ── Realtime (Polling alle 15s) ─────────────────────────────────────────
  function startRealtime() {
    loadRealtime();
    state.realtimeTimer = setInterval(loadRealtime, 15000);
  }
  function loadRealtime() {
    var wid = $("websiteFilter").value;
    api("/analytics/realtime" + (wid ? "?websiteId=" + encodeURIComponent(wid) : "")).then(function (d) {
      var html = '<div style="font-size:28px;font-weight:700">' + fmt(d.active) + '</div>';
      html += '<div class="muted" style="margin-bottom:10px">aktive Besucher insgesamt</div>';
      if (d.perWebsite && d.perWebsite.length) {
        html += '<table class="mini"><thead><tr><th>Website</th><th class="num">Aktiv</th></tr></thead><tbody>';
        html += d.perWebsite.map(function (w) {
          return "<tr><td>" + esc(w.name) + '</td><td class="num">' + fmt(w.active) + "</td></tr>";
        }).join("");
        html += "</tbody></table>";
      }
      if (d.activePages && d.activePages.length) {
        html += '<div class="muted" style="margin:12px 0 4px">Aktuell besuchte Seiten</div>';
        html += barlist(d.activePages.map(function (p) { return { label: p.path, count: p.visitors }; }));
      }
      $("realtime").innerHTML = html;
    }).catch(function () {});
  }

  // ── Beim Laden: bestehende Session prüfen ───────────────────────────────
  api("/auth/me").then(function (d) {
    if (d && d.user) { state.user = d.user; init(); }
    else showLogin();
  }).catch(showLogin);
})();
