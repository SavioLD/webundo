/* ============================================================
   Baut aus den Einzelseiten eine self-contained Vorschau-Datei
   mit Hash-Routing: rees/vorschau.html

     node build-vorschau.mjs                 normaler Bau
     node build-vorschau.mjs --fetch-fonts   Schriften neu holen und einbetten

   Ohne fonts-inline.css fällt die Vorschau auf Systemschriften zurück.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const FONTS = `${SRC}/fonts-inline.css`;

/* Latin-Subsets von Google Fonts als Base64 einbetten */
function fetchFonts() {
  const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
  const url = 'https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,600;0,700;0,800;1,800&family=Inter:wght@400;500;600;700&display=swap';
  const css = execSync(`curl -sS --max-time 30 -A "${UA}" "${url}"`, { maxBuffer: 1 << 24 }).toString();
  let out = '';
  for (const block of css.split('/*').filter(b => b.trim().startsWith('latin */'))) {
    const face = '@font-face' + block.split('@font-face')[1];
    const m = face.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!m) continue;
    const buf = execSync(`curl -sS --max-time 30 -A "${UA}" "${m[1]}"`, { maxBuffer: 1 << 24, encoding: 'buffer' });
    out += face.replace(m[0], `url(data:font/woff2;base64,${buf.toString('base64')})`).replace(/\s+/g, ' ').trim() + '\n';
  }
  fs.writeFileSync(FONTS, out);
  console.log(`Schriften eingebettet: ${Math.round(out.length / 1024)} KB`);
}
if (process.argv.includes('--fetch-fonts')) fetchFonts();

const PAGES = [
  ['index',         'Startseite'],
  ['leistungen',    'Leistungen'],
  ['produkte',      'Produkte'],
  ['unternehmen',   'Unternehmen'],
  ['karriere',      'Karriere'],
  ['kontakt',       'Kontakt'],
  ['social-mockup', 'Social-Media-Mockup'],
  ['impressum',     'Impressum'],
  ['datenschutz',   'Datenschutz'],
];
const SLUGS = new Set(PAGES.map(p => p[0]));

const css = fs.readFileSync(`${SRC}/rees.css`, 'utf8');
const js  = fs.readFileSync(`${SRC}/rees.js`, 'utf8');
let fonts = '';
if (fs.existsSync(FONTS)) {
  fonts = fs.readFileSync(FONTS, 'utf8');
} else {
  console.warn('Hinweis: fonts-inline.css fehlt – Vorschau nutzt Systemschriften.');
  console.warn('Mit "node build-vorschau.mjs --fetch-fonts" einmalig erzeugen.');
}

/* Links auf das Hash-Schema #seite bzw. #seite~anker umschreiben */
function rewrite(html, page) {
  return html
    .replace(/href="([a-z-]+)\.html#([\w-]+)"/g, (m, p, a) => SLUGS.has(p) ? `href="#${p}~${a}"` : m)
    .replace(/href="([a-z-]+)\.html"/g,          (m, p)    => SLUGS.has(p) ? `href="#${p}"`      : m)
    .replace(/href="#"/g,                        `href="#${page}"`)
    .replace(/href="#([\w-]+)"/g,                (m, a)    => a.includes('~') || SLUGS.has(a) ? m : `href="#${page}~${a}"`);
}

const symbol = `<svg style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <symbol id="reeslogo" viewBox="0 0 344 88">
    <path d="M8 20 18 14 28 20v28l-10 6-10-6z" fill="var(--lg-grey,#93a2b3)"/>
    <g fill="none" stroke="var(--lg-grey,#93a2b3)" stroke-width="2.4" stroke-linecap="round">
      <path d="M28 25h26M28 31h26M28 37h26M28 43h26M54 24v20"/>
      <path d="M244 28h34v12h-34zM278 25h40v18h-40z"/>
      <path d="M285 25l-6 18M293 25l-6 18M301 25l-6 18M309 25l-6 18M317 25l-6 18"/>
      <path d="M318 26l16 8-16 8"/>
    </g>
    <text x="60" y="55" fill="var(--lg-blue,#1b3c8e)" font-family="Archivo,Inter,Helvetica,sans-serif" font-size="58" font-weight="800" font-style="italic" letter-spacing="-2.5">Rees</text>
    <text x="63" y="77" fill="var(--lg-blue,#1b3c8e)" font-family="Inter,Helvetica,sans-serif" font-size="12.4" font-weight="600" letter-spacing="4.25">ZERSPANUNGSTECHNIK</text>
  </symbol>
</svg>`;

const NAV = ['leistungen', 'produkte', 'unternehmen', 'karriere', 'kontakt'];
const label = s => PAGES.find(p => p[0] === s)[1];

const header = `
<div class="demobar">
  <div class="wrap">
    <span><b>Relaunch-Konzept</b> · Gestaltungsentwurf für rees-zerspanungstechnik.de</span>
    <nav><a href="#karriere">Karriereseite</a><a href="#social-mockup">Social-Media-Mockup</a></nav>
  </div>
</div>

<header class="nav" id="nav">
  <div class="wrap nav__in">
    <a class="logo" href="#index" aria-label="Rees Zerspanungstechnik – Startseite"><svg viewBox="0 0 344 88"><use href="#reeslogo"/></svg></a>
    <nav class="nav__links" aria-label="Hauptnavigation">
      ${NAV.map(s => `<a href="#${s}" data-pg="${s}">${label(s)}</a>`).join('\n      ')}
    </nav>
    <div class="nav__act">
      <span class="lang"><a href="#index" class="is-on">DE</a><a href="#index">EN</a></span>
      <a class="btn btn--pri btn--sm" href="#kontakt">Projekt anfragen</a>
      <button class="burger" id="burger" aria-label="Menü öffnen" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>
  </div>
  <div class="nav__mob" id="navMobile">
    ${NAV.map(s => `<a href="#${s}" data-pg="${s}">${label(s)}</a>`).join('\n    ')}
    <a href="#social-mockup" data-pg="social-mockup">Social-Media-Mockup</a>
    <a class="btn btn--pri btn--block" href="#kontakt">Projekt anfragen</a>
  </div>
</header>`;

const footer = `
<footer class="foot">
  <div class="wrap">
    <div class="foot__grid">
      <div>
        <div class="foot__logo logo logo--light"><svg viewBox="0 0 344 88" style="height:46px;width:auto"><use href="#reeslogo"/></svg></div>
        <address>
          Rees Zerspanungstechnik GmbH<br />
          Wengenstr. 16 · 78564 Wehingen<br />
          Tel. <a href="tel:+4974265280110">+49 7426 528011</a><br />
          Fax +49 7426 528066<br />
          <a href="mailto:info@rees-zerspanungstechnik.de">info@rees-zerspanungstechnik.de</a>
        </address>
        <div class="socials">
          <a href="https://www.instagram.com/rees.zerspanungstechnik/" aria-label="Instagram" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg></a>
          <a href="#index" aria-label="LinkedIn"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M3 9h4v12H3zM9 9h3.8v1.7h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.07 1.4-2.07 2.85V21H9z"/></svg></a>
          <a href="#index" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.63C16.4 3.56 15.42 3.5 14.3 3.5c-2.35 0-3.95 1.43-3.95 4.07V9.9H7.6V13h2.75v8z"/></svg></a>
          <a href="#index" aria-label="YouTube"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8M10 15V9l5.2 3z"/></svg></a>
        </div>
      </div>
      <div>
        <h4>Leistungen</h4>
        <ul>
          <li><a href="#leistungen">CNC-Drehen</a></li>
          <li><a href="#leistungen">CNC-Langdrehen</a></li>
          <li><a href="#leistungen">CNC-Fräsen &amp; 5-Achs</a></li>
          <li><a href="#produkte">Produktbeispiele</a></li>
        </ul>
      </div>
      <div>
        <h4>Unternehmen</h4>
        <ul>
          <li><a href="#unternehmen">Über Rees</a></li>
          <li><a href="#unternehmen~lean">Lean Management</a></li>
          <li><a href="#unternehmen~rundgang">Rundgang</a></li>
          <li><a href="#unternehmen~qualitaet">Qualität &amp; Zertifikate</a></li>
        </ul>
      </div>
      <div>
        <h4>Karriere &amp; Kontakt</h4>
        <ul>
          <li><a href="#karriere~stellen">Offene Stellen</a></li>
          <li><a href="#karriere~ausbildung">Ausbildung</a></li>
          <li><a href="#kontakt">Kontakt</a></li>
          <li><a href="#kontakt~downloads">Downloads</a></li>
          <li><a href="#kontakt~faq">Wissenswertes &amp; FAQ</a></li>
        </ul>
      </div>
    </div>
    <div class="foot__bot">
      <span>© <span data-year>2026</span> Rees Zerspanungstechnik GmbH · Wehingen</span>
      <nav><a href="#impressum">Impressum</a><a href="#datenschutz">Datenschutz</a><a href="#index">AGB</a></nav>
    </div>
  </div>
</footer>`;

/* Seiteninhalte einsammeln */
const bodies = PAGES.map(([slug]) => {
  const html = fs.readFileSync(`${SRC}/${slug}.html`, 'utf8');
  const inner = html.split('<main>')[1].split('</main>')[0];
  return `<div class="pg" data-pg="${slug}">\n${rewrite(inner, slug)}\n</div>`;
}).join('\n\n');

const routerCss = `
/* --- Vorschau-Router --- */
.pg{display:none}
.pg.is-live{display:block}
.pgnav{position:fixed;right:18px;bottom:18px;z-index:120;display:flex;flex-wrap:wrap;gap:6px;
  max-width:min(560px,calc(100vw - 36px));justify-content:flex-end;
  padding:10px;border-radius:16px;background:rgba(6,17,40,.9);backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.16);box-shadow:0 24px 50px -20px rgba(0,0,0,.6)}
.pgnav a{padding:.42em .8em;border-radius:9px;font-family:var(--disp);font-weight:600;font-size:.78rem;
  color:rgba(255,255,255,.72);border:1px solid transparent;white-space:nowrap;transition:all .18s}
.pgnav a:hover{color:#fff;background:rgba(255,255,255,.1)}
.pgnav a.is-live{background:var(--cyan);color:#fff;border-color:var(--cyan)}
.pgnav b{align-self:center;padding-right:6px;font-family:var(--mono);font-size:.62rem;letter-spacing:.14em;
  text-transform:uppercase;color:rgba(255,255,255,.45)}
@media (max-width:700px){.pgnav{left:12px;right:12px;bottom:12px;max-width:none;justify-content:center}
  .pgnav b{display:none}.pgnav a{font-size:.72rem}}`;

const pgnav = `
<nav class="pgnav" aria-label="Seiten der Vorschau">
  <b>Vorschau</b>
  ${PAGES.map(([s, l]) => `<a href="#${s}" data-pg="${s}">${l}</a>`).join('\n  ')}
</nav>`;

const router = `
/* ---------- Vorschau-Router: Hash -> Seite ---------- */
(function () {
  "use strict";
  var pages = document.querySelectorAll(".pg");
  var titles = ${JSON.stringify(Object.fromEntries(PAGES))};

  function show(slug, anchor, smooth) {
    if (!document.querySelector('.pg[data-pg="' + slug + '"]')) slug = "index";
    pages.forEach(function (p) { p.classList.toggle("is-live", p.dataset.pg === slug); });
    document.querySelectorAll("[data-pg]").forEach(function (a) {
      if (a.tagName === "A") a.classList.toggle("is-live", a.dataset.pg === slug);
    });
    document.querySelectorAll(".nav__links a, .nav__mob a").forEach(function (a) {
      a.classList.toggle("is-on", a.dataset.pg === slug);
    });
    document.title = titles[slug] + " – Rees Zerspanungstechnik";
    var mob = document.getElementById("navMobile");
    if (mob) { mob.classList.remove("is-open");
      document.getElementById("burger").setAttribute("aria-expanded", "false"); }

    var target = anchor && document.querySelector('.pg[data-pg="' + slug + '"] #' + CSS.escape(anchor));
    if (target) {
      target.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function route(smooth) {
    var parts = location.hash.replace(/^#/, "").split("~");
    show(parts[0] || "index", parts[1], smooth);
  }

  window.addEventListener("hashchange", function () { route(true); });
  route(false);
})();`;

const head = `<title>Rees Zerspanungstechnik – Relaunch-Konzept</title>
<meta name="description" content="Gestaltungsentwurf für den Relaunch von rees-zerspanungstechnik.de inklusive Karriereseite und Social-Media-Mockup." />
<style>
${fonts}
${css}
${routerCss}
</style>`;

const body = `${symbol}
${header}

<main>
${bodies}
</main>

${footer}
${pgnav}

<script>
if(!matchMedia("(prefers-reduced-motion:reduce)").matches)document.documentElement.classList.add("anim");
${js}
${router}
</script>`;

fs.writeFileSync(`${SRC}/vorschau.html`,
`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${head}
<script>if(!matchMedia("(prefers-reduced-motion:reduce)").matches)document.documentElement.classList.add("anim");<\/script>
</head>
<body>
${body}
</body>
</html>
`);

console.log(`vorschau.html gebaut: ${PAGES.length} Seiten, ${Math.round(fs.statSync(`${SRC}/vorschau.html`).size / 1024)} KB`);
