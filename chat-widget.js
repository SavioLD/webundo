/* ============================================================
   WEBUNDO — KI-Assistent (DEMO / Vorschau)
   Eigenständiges Widget: injiziert eigenes CSS + DOM ins <body>.
   Noch ohne Backend – zeigt nur, wie der spätere Assistent aussieht.
   Ländle Digital
============================================================ */
(function () {
  "use strict";
  if (window.__wbChatLoaded) return;
  window.__wbChatLoaded = true;

  var CONFIG = {
    name: "WEBUNDO KI-Assistent",
    status: "Online · antwortet in Sekunden",
    welcome: [
      "Hallo! 👋 Ich bin der digitale KI-Assistent von WEBUNDO. Ich helfe Ihnen rund um <strong>Versorgung</strong>, <strong>Beschaffung</strong> und <strong>Optimierung</strong>.",
      "Fragen Sie mich zum Beispiel nach Ihrem Einsparpotenzial oder einem bestimmten Produkt. Womit kann ich helfen?"
    ],
    chips: ["Einsparpotenzial berechnen", "Produkt anfragen", "Beratung vereinbaren"],
    demoReply: "Danke für Ihre Nachricht! 🚧 Dies ist eine <strong>Vorschau</strong> – der echte WEBUNDO KI-Assistent beantwortet hier bald automatisch Ihre Fragen, erstellt Angebote und nimmt Anfragen entgegen. Bis dahin erreichen Sie uns direkt über den <a href='rechner.html'>Einkaufs-Rechner</a> oder das <a href='kontakt.html'>Kontaktformular</a>."
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
  ".wb-cw-panel{position:fixed;right:24px;bottom:100px;width:384px;max-width:calc(100vw - 32px);height:564px;max-height:calc(100vh - 130px);background:#fff;border-radius:22px;box-shadow:0 40px 90px -30px rgba(10,58,102,.6);display:flex;flex-direction:column;overflow:hidden;z-index:99999;transform-origin:bottom right;opacity:0;transform:translateY(16px) scale(.96);pointer-events:none;transition:opacity .28s cubic-bezier(.16,.7,.2,1),transform .28s cubic-bezier(.16,.7,.2,1)}" +
  ".wb-cw.open .wb-cw-panel{opacity:1;transform:none;pointer-events:auto}" +
  ".wb-cw-head{display:flex;align-items:center;gap:12px;padding:16px 18px;color:#fff;background:linear-gradient(135deg,#1366c8,#0a3a66)}" +
  ".wb-cw-av{width:42px;height:42px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;background:rgba(255,255,255,.16)}" +
  ".wb-cw-av svg{width:24px;height:24px}" +
  ".wb-cw-head__t{flex:1;min-width:0}" +
  ".wb-cw-head__t b{display:block;font-size:1rem;font-weight:700;line-height:1.2}" +
  ".wb-cw-head__t span{display:flex;align-items:center;gap:6px;font-size:.76rem;color:#cfe0f5;margin-top:2px}" +
  ".wb-cw-on{width:8px;height:8px;border-radius:50%;background:#46d17f;box-shadow:0 0 0 0 rgba(70,209,127,.7);animation:wbon 1.8s infinite}" +
  "@keyframes wbon{70%{box-shadow:0 0 0 7px rgba(70,209,127,0)}100%{box-shadow:0 0 0 0 rgba(70,209,127,0)}}" +
  ".wb-cw-prev{font-size:.62rem;font-weight:800;letter-spacing:.06em;background:rgba(255,255,255,.2);padding:.3em .55em;border-radius:999px;text-transform:uppercase}" +
  ".wb-cw-x{background:transparent;border:0;color:#fff;cursor:pointer;opacity:.85;padding:4px;display:grid;place-items:center}" +
  ".wb-cw-x:hover{opacity:1}.wb-cw-x svg{width:20px;height:20px}" +
  ".wb-cw-body{flex:1;overflow-y:auto;padding:18px;background:#eef3f8;display:flex;flex-direction:column;gap:10px}" +
  ".wb-cw-msg{max-width:84%;padding:11px 14px;font-size:.92rem;line-height:1.5;border-radius:16px;animation:wbmsg .3s ease both}" +
  "@keyframes wbmsg{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}" +
  ".wb-cw-msg a{color:#1366c8;font-weight:600}" +
  ".wb-cw.open .wb-cw-panel .wb-cw-msg a{text-decoration:underline}" +
  ".wb-cw-msg--bot{align-self:flex-start;background:#fff;color:#1f2c3d;border:1px solid #e1e8f0;border-bottom-left-radius:5px;box-shadow:0 4px 12px -8px rgba(10,58,102,.3)}" +
  ".wb-cw-msg--user{align-self:flex-end;background:linear-gradient(135deg,#1366c8,#0f57aa);color:#fff;border-bottom-right-radius:5px}" +
  ".wb-cw-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:2px}" +
  ".wb-cw-chip{border:1.5px solid #c5dcf6;background:#fff;color:#0b4789;font-size:.85rem;font-weight:600;padding:.5em .9em;border-radius:999px;cursor:pointer;transition:.15s}" +
  ".wb-cw-chip:hover{background:#e8f1fc;border-color:#1366c8}" +
  ".wb-cw-typing{align-self:flex-start;background:#fff;border:1px solid #e1e8f0;border-radius:16px;border-bottom-left-radius:5px;padding:12px 16px;display:flex;gap:4px}" +
  ".wb-cw-typing i{width:7px;height:7px;border-radius:50%;background:#9fb2c9;animation:wbtype 1.2s infinite}" +
  ".wb-cw-typing i:nth-child(2){animation-delay:.2s}.wb-cw-typing i:nth-child(3){animation-delay:.4s}" +
  "@keyframes wbtype{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1}}" +
  ".wb-cw-foot{border-top:1px solid #e1e8f0;padding:12px;background:#fff}" +
  ".wb-cw-form{display:flex;gap:8px;align-items:flex-end}" +
  ".wb-cw-input{flex:1;border:1.5px solid #e1e8f0;border-radius:14px;padding:11px 14px;font-size:.92rem;resize:none;max-height:90px;outline:none;font-family:inherit;transition:border-color .15s}" +
  ".wb-cw-input:focus{border-color:#1366c8}" +
  ".wb-cw-send{flex:0 0 auto;width:44px;height:44px;border:0;border-radius:13px;background:#1366c8;color:#fff;cursor:pointer;display:grid;place-items:center;transition:background .15s}" +
  ".wb-cw-send:hover{background:#0f57aa}.wb-cw-send svg{width:20px;height:20px}" +
  ".wb-cw-note{text-align:center;font-size:.72rem;color:#8aa0b8;margin-top:8px}" +
  "@media (max-width:480px){.wb-cw-panel{right:12px;left:12px;width:auto;bottom:90px;height:calc(100vh - 120px)}.wb-cw-launch{right:16px;bottom:16px}.wb-cw-tip{display:none}}" +
  "@media (prefers-reduced-motion:reduce){.wb-cw-launch,.wb-cw-pulse,.wb-cw-on,.wb-cw-msg{animation:none!important;transition:none!important}.wb-cw-launch{transform:scale(1)}}";

  var ICON_CHAT = '<svg class="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z"/></svg>';
  var ICON_CLOSE = '<svg class="ic-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var ICON_SPARK = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>';

  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

  function init() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.className = "wb-cw";
    root.innerHTML =
      '<div class="wb-cw-tip" data-tip><button class="wb-cw-tip__x" data-tip-x aria-label="Schließen">×</button>👋 Fragen? Unser <b>KI-Assistent</b> hilft.</div>' +
      '<button class="wb-cw-launch" data-toggle aria-label="KI-Assistent öffnen">' +
        '<span class="wb-cw-pulse"></span><span class="wb-cw-dot">1</span>' + ICON_CHAT + ICON_CLOSE +
      '</button>' +
      '<aside class="wb-cw-panel" role="dialog" aria-label="WEBUNDO KI-Assistent">' +
        '<header class="wb-cw-head">' +
          '<div class="wb-cw-av">' + ICON_SPARK + '</div>' +
          '<div class="wb-cw-head__t"><b>' + esc(CONFIG.name) + '</b><span><i class="wb-cw-on"></i>' + esc(CONFIG.status) + '</span></div>' +
          '<span class="wb-cw-prev">Vorschau</span>' +
          '<button class="wb-cw-x" data-close aria-label="Schließen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
        '</header>' +
        '<div class="wb-cw-body" data-body></div>' +
        '<div class="wb-cw-foot">' +
          '<form class="wb-cw-form" data-form>' +
            '<textarea class="wb-cw-input" data-input rows="1" placeholder="Nachricht schreiben …"></textarea>' +
            '<button class="wb-cw-send" type="submit" aria-label="Senden">' + ICON_SEND + '</button>' +
          '</form>' +
          '<p class="wb-cw-note">Demo-Vorschau · noch nicht aktiv</p>' +
        '</div>' +
      '</aside>';
    document.body.appendChild(root);

    var body = root.querySelector("[data-body]");
    var input = root.querySelector("[data-input]");
    var greeted = false;

    function scroll(){ body.scrollTop = body.scrollHeight; }
    function addMsg(html, who){
      var d = document.createElement("div");
      d.className = "wb-cw-msg wb-cw-msg--" + who;
      d.innerHTML = html;
      body.appendChild(d); scroll(); return d;
    }
    function addChips(){
      var w = document.createElement("div");
      w.className = "wb-cw-chips";
      CONFIG.chips.forEach(function(c){
        var b = document.createElement("button");
        b.className = "wb-cw-chip"; b.type = "button"; b.textContent = c;
        b.addEventListener("click", function(){ send(c); });
        w.appendChild(b);
      });
      body.appendChild(w); scroll();
    }
    function typing(){
      var d = document.createElement("div");
      d.className = "wb-cw-typing"; d.innerHTML = "<i></i><i></i><i></i>";
      body.appendChild(d); scroll(); return d;
    }
    function botReply(){
      var t = typing();
      setTimeout(function(){ t.remove(); addMsg(CONFIG.demoReply, "bot"); }, 1100);
    }
    function send(text){
      text = (text || "").trim(); if (!text) return;
      addMsg(esc(text), "user");
      input.value = ""; input.style.height = "auto";
      botReply();
    }
    function greet(){
      if (greeted) return; greeted = true;
      CONFIG.welcome.forEach(function(m, i){ setTimeout(function(){ addMsg(m, "bot"); if (i === CONFIG.welcome.length - 1) addChips(); }, i * 450); });
    }

    function open(){ root.classList.add("open"); greet(); setTimeout(function(){ input.focus(); }, 300); }
    function close(){ root.classList.remove("open"); }
    function toggle(){ root.classList.contains("open") ? close() : open(); }

    root.querySelector("[data-toggle]").addEventListener("click", toggle);
    root.querySelector("[data-close]").addEventListener("click", close);
    root.querySelector("[data-form]").addEventListener("submit", function(e){ e.preventDefault(); send(input.value); });
    input.addEventListener("keydown", function(e){ if (e.key === "Enter" && !e.shiftKey){ e.preventDefault(); send(input.value); } });
    input.addEventListener("input", function(){ input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 90) + "px"; });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") close(); });

    // Eingangs-Animationen
    var launch = root.querySelector(".wb-cw-launch");
    setTimeout(function(){ launch.classList.add("in"); }, 700);
    var tip = root.querySelector("[data-tip]");
    root.querySelector("[data-tip-x]").addEventListener("click", function(e){ e.stopPropagation(); tip.remove(); });
    setTimeout(function(){ if (!root.classList.contains("open")) tip.classList.add("show"); }, 2600);
    setTimeout(function(){ tip.classList.remove("show"); }, 9000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
