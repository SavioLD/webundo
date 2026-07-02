/* ============================================================
   WEBUNDO — KI-Assistent (ThinkUp AI) + WhatsApp-Button
   Eigenständiges Widget: injiziert eigenes CSS + DOM ins <body>.
   Der Assistent wird per iframe eingebunden und erst beim ersten
   Öffnen geladen (Lazy-Load). Ländle Digital
============================================================ */
(function () {
  "use strict";
  if (window.__wbChatLoaded) return;
  window.__wbChatLoaded = true;

  var CONFIG = {
    iframeSrc: "https://www.thinkupai.de/entwicklungen/webundo/faqbot",
    tip: 'Fragen? Unser <b>KI-Assistent</b> hilft.',
    waNumber: "491723513643",
    waText: "Liebes Webundo Team, "
  };

  var CSS = "" +
  ".wb-cw,.wb-cw *{box-sizing:border-box;font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
  ".wb-cw-launch{position:fixed;right:24px;bottom:24px;width:64px;height:64px;border:0;border-radius:50%;cursor:pointer;z-index:99998;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#2a8be8,#0b4789);box-shadow:0 16px 34px -12px rgba(11,71,137,.7);transform:scale(0);transition:transform .35s cubic-bezier(.2,.8,.2,1.2),box-shadow .25s}" +
  ".wb-cw-launch.in{transform:scale(1)}" +
  ".wb-cw-launch:hover{transform:scale(1.07)}" +
  ".wb-cw-launch svg{width:28px;height:28px;position:absolute;transition:opacity .2s,transform .25s}" +
  ".wb-cw-launch .ic-close{opacity:0;transform:rotate(-45deg) scale(.6)}" +
  ".wb-cw.open .wb-cw-launch .ic-chat{opacity:0;transform:rotate(45deg) scale(.6)}" +
  ".wb-cw.open .wb-cw-launch .ic-close{opacity:1;transform:none}" +
  ".wb-cw-pulse{position:absolute;inset:0;border-radius:50%;border:2px solid #2a8be8;animation:wbpulse 2.4s ease-out infinite;pointer-events:none}" +
  ".wb-cw.open .wb-cw-pulse{display:none}" +
  "@keyframes wbpulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}" +
  ".wb-cw-dot{position:absolute;top:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:#e23b3b;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;border:2px solid #fff}" +
  ".wb-cw.open .wb-cw-dot{display:none}" +
  ".wb-cw-tip{position:fixed;right:96px;bottom:38px;z-index:99998;background:#fff;color:#0a3a66;font-size:14px;font-weight:600;padding:11px 15px;border-radius:14px;border-bottom-right-radius:4px;box-shadow:0 16px 34px -16px rgba(10,58,102,.5);max-width:220px;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;pointer-events:none}" +
  ".wb-cw-tip.show{opacity:1;transform:none;pointer-events:auto}" +
  ".wb-cw-tip b{color:#1366c8}" +
  ".wb-cw-tip__x{position:absolute;top:-7px;right:-7px;width:20px;height:20px;border-radius:50%;background:#0a3a66;color:#fff;border:0;cursor:pointer;font-size:12px;line-height:1}" +
  ".wb-cw.open .wb-cw-tip{display:none}" +
  ".wb-cw-panel{position:fixed;right:24px;bottom:100px;width:384px;max-width:calc(100vw - 32px);height:580px;max-height:calc(100vh - 124px);background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 40px 90px -30px rgba(10,58,102,.6);z-index:99999;transform-origin:bottom right;opacity:0;transform:translateY(16px) scale(.96);pointer-events:none;transition:opacity .28s cubic-bezier(.16,.7,.2,1),transform .28s cubic-bezier(.16,.7,.2,1)}" +
  ".wb-cw.open .wb-cw-panel{opacity:1;transform:none;pointer-events:auto}" +
  ".wb-cw-frame{width:100%;height:100%;border:0;display:block}" +
  ".wb-cw-load{position:absolute;inset:0;display:grid;place-items:center;color:#9fb2c9;font-size:.9rem;font-weight:600;pointer-events:none}" +
  ".wb-cw-panel{display:flex;flex-direction:column}" +
  ".wb-cw-frame{flex:1 1 auto;min-height:0}" +
  ".wb-cw-faq{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 14px;background:#f2f6fb;border-top:1px solid #e1e8f0;font-size:.86rem;font-weight:700;color:#0b4789;text-decoration:none;transition:background .15s}" +
  ".wb-cw-faq:hover{background:#e8f1fc}" +
  ".wb-cw-faq svg{width:16px;height:16px;flex:0 0 auto}" +
  "@media (max-width:480px){.wb-cw-panel{right:0;left:0;bottom:0;width:100%;max-width:100%;height:100%;max-height:100%;border-radius:0}.wb-cw-launch{right:16px;bottom:16px}.wb-cw-tip{display:none}}" +
  /* WhatsApp-Button (unten links) */
  ".wb-wa{position:fixed;left:24px;bottom:24px;z-index:99998;display:flex;align-items:center;height:60px;width:60px;border-radius:50%;background:#25d366;color:#fff;box-shadow:0 14px 30px -12px rgba(37,211,102,.75);text-decoration:none;overflow:hidden;transform:scale(0);transition:transform .35s cubic-bezier(.2,.8,.2,1.2),width .3s,border-radius .3s,box-shadow .25s}" +
  ".wb-wa.in{transform:scale(1)}" +
  ".wb-wa:hover{box-shadow:0 18px 36px -12px rgba(37,211,102,.9)}" +
  ".wb-wa__ic{flex:0 0 60px;width:60px;height:60px;display:grid;place-items:center}" +
  ".wb-wa__ic svg{width:34px;height:34px}" +
  ".wb-wa__lbl{white-space:nowrap;font-weight:700;font-size:.95rem;opacity:0;max-width:0;overflow:hidden;transition:opacity .25s,max-width .3s,padding .3s}" +
  ".wb-wa__pulse{position:absolute;inset:0;border-radius:50%;border:2px solid #25d366;animation:wbpulse 2.4s ease-out infinite;pointer-events:none}" +
  ".wb-wa:hover .wb-wa__pulse{display:none}" +
  "@media(min-width:700px){.wb-wa:hover{width:206px;border-radius:32px}.wb-wa:hover .wb-wa__lbl{opacity:1;max-width:150px;padding-right:22px}}" +
  "@media(max-width:480px){.wb-wa{left:16px;bottom:16px;width:54px;height:54px}.wb-wa__ic{flex-basis:54px;width:54px;height:54px}}" +
  "@media (prefers-reduced-motion:reduce){.wb-cw-launch,.wb-cw-pulse,.wb-cw-msg,.wb-wa,.wb-wa__pulse{animation:none!important;transition:none!important}.wb-cw-launch,.wb-wa{transform:scale(1)}}";

  var ICON_CHAT = '<svg class="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_CLOSE = '<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 32 32" fill="#fff" aria-hidden="true"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.5 4.1 1.6 5.9L4 29l8.3-1.6c1.7.9 3.6 1.4 5.7 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.3.6.6-3.2-.2-.4C7 18.9 6.5 17 6.5 15 6.5 9.8 10.8 5.5 16 5.5S25.5 9.8 25.5 15 21.2 24.8 16 24.8zm5.4-7c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.8.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>';

  function init() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    // KI-Assistent (iframe, Lazy-Load)
    var root = document.createElement("div");
    root.className = "wb-cw";
    root.innerHTML =
      '<div class="wb-cw-tip" data-tip><button class="wb-cw-tip__x" data-tip-x aria-label="Schließen">×</button>👋 ' + CONFIG.tip + '</div>' +
      '<button class="wb-cw-launch" data-toggle aria-label="KI-Assistent öffnen">' +
        '<span class="wb-cw-pulse"></span><span class="wb-cw-dot">1</span>' + ICON_CHAT + ICON_CLOSE +
      '</button>' +
      '<aside class="wb-cw-panel" role="dialog" aria-label="WEBUNDO KI-Assistent">' +
        '<div class="wb-cw-load">KI-Assistent wird geladen …</div>' +
        '<iframe class="wb-cw-frame" title="WEBUNDO KI-Assistent" allow="clipboard-write" loading="lazy" data-src="' + CONFIG.iframeSrc + '"></iframe>' +
        '<a class="wb-cw-faq" href="faq.html"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.3 9.3a2.7 2.7 0 0 1 5.2 1c0 1.8-2.7 2.7-2.7 2.7"/><path d="M12 17h.01"/></svg>Häufige Fragen (FAQ)</a>' +
      '</aside>';
    document.body.appendChild(root);

    var frame = root.querySelector(".wb-cw-frame");
    var loaded = false;
    frame.addEventListener("load", function () {
      var l = root.querySelector(".wb-cw-load");
      if (l) l.style.display = "none";
    });
    function open() {
      root.classList.add("open");
      if (!loaded) { frame.src = frame.getAttribute("data-src"); loaded = true; }
    }
    function close() { root.classList.remove("open"); }
    function toggle() { root.classList.contains("open") ? close() : open(); }

    root.querySelector("[data-toggle]").addEventListener("click", toggle);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

    // WhatsApp-Button (unten links)
    var wa = document.createElement("a");
    wa.className = "wb-wa";
    wa.href = "https://wa.me/" + CONFIG.waNumber + "?text=" + encodeURIComponent(CONFIG.waText);
    wa.target = "_blank"; wa.rel = "noopener";
    wa.setAttribute("aria-label", "WhatsApp-Chat mit WEBUNDO");
    wa.innerHTML = '<span class="wb-wa__pulse"></span><span class="wb-wa__ic">' + ICON_WA + '</span><span class="wb-wa__lbl">WhatsApp Chat</span>';
    document.body.appendChild(wa);

    // Eingangs-Animationen
    var launch = root.querySelector(".wb-cw-launch");
    setTimeout(function () { launch.classList.add("in"); }, 700);
    setTimeout(function () { wa.classList.add("in"); }, 900);
    var tip = root.querySelector("[data-tip]");
    root.querySelector("[data-tip-x]").addEventListener("click", function (e) { e.stopPropagation(); tip.remove(); });
    setTimeout(function () { if (!root.classList.contains("open")) tip.classList.add("show"); }, 2600);
    setTimeout(function () { tip.classList.remove("show"); }, 9000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
