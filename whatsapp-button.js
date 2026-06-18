/* ============================================================
   WEBUNDO — WhatsApp-Button (unten links)
   Eigenständiges Widget: injiziert eigenes CSS + DOM ins <body>.
   (Aus dem früheren chat-widget.js herausgelöst; der KI-Assistent
   wird jetzt separat über webundo-chat.js eingebunden.)
============================================================ */
(function () {
  "use strict";
  if (window.__wbWaLoaded) return;
  window.__wbWaLoaded = true;

  var CONFIG = {
    waNumber: "491723513643",
    waText: "Liebes Webundo Team, "
  };

  var CSS = "" +
  ".wb-wa,.wb-wa *{box-sizing:border-box;font-family:'Inter',system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
  "@keyframes wbpulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(1.5);opacity:0}}" +
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
  "@media (prefers-reduced-motion:reduce){.wb-wa,.wb-wa__pulse{animation:none!important;transition:none!important}.wb-wa{transform:scale(1)}}";

  var ICON_WA = '<svg viewBox="0 0 32 32" fill="#fff" aria-hidden="true"><path d="M16 3C9.4 3 4 8.4 4 15c0 2.1.5 4.1 1.6 5.9L4 29l8.3-1.6c1.7.9 3.6 1.4 5.7 1.4 6.6 0 12-5.4 12-12S22.6 3 16 3zm0 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.3.6.6-3.2-.2-.4C7 18.9 6.5 17 6.5 15 6.5 9.8 10.8 5.5 16 5.5S25.5 9.8 25.5 15 21.2 24.8 16 24.8zm5.4-7c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.2 5.1 4.5 1.9.8 2.6.9 3.5.8.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>';

  function init() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var wa = document.createElement("a");
    wa.className = "wb-wa";
    wa.href = "https://wa.me/" + CONFIG.waNumber + "?text=" + encodeURIComponent(CONFIG.waText);
    wa.target = "_blank"; wa.rel = "noopener";
    wa.setAttribute("aria-label", "WhatsApp-Chat mit WEBUNDO");
    wa.innerHTML = '<span class="wb-wa__pulse"></span><span class="wb-wa__ic">' + ICON_WA + '</span><span class="wb-wa__lbl">WhatsApp Chat</span>';
    document.body.appendChild(wa);

    setTimeout(function () { wa.classList.add("in"); }, 900);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
