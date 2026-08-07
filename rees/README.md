# Rees Zerspanungstechnik – Relaunch-Konzept

Gestaltungsentwurf für den Relaunch von **rees-zerspanungstechnik.de**, inklusive
eigenständiger **Karriereseite** und **Social-Media-Mockup**.

Statisches HTML/CSS/JS, kein Build-Schritt, keine Abhängigkeiten außer Google Fonts.
Einfach `index.html` im Browser öffnen oder den Ordner auf GitHub Pages ausliefern
(erreichbar dann unter `…/rees/`).

## Schnellster Weg zum Anschauen

`vorschau.html` öffnen – eine einzige Datei, die alle neun Seiten enthält und über die
Leiste unten rechts durchschaltbar ist. Schriften sind eingebettet, es werden keine
externen Ressourcen geladen. Ideal zum Weitergeben per E-Mail oder USB-Stick.

Erzeugt wird die Datei aus den Einzelseiten; wenn sich dort etwas ändert, muss sie neu
gebaut werden (Skript siehe Abschnitt „Vorschau neu bauen").

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite: Hero, Kennzahlen, Positionierung, Leistungen, Fertigungsspektrum, Branchen, Ablauf, Lean, REESümee, Karriere-Teaser |
| `leistungen.html` | Kernkompetenzen, Langdrehen, Maschinenpark, Qualitätssicherung, Zertifikate |
| `produkte.html` | Teilefamilien, Werkstoffe, Branchen/Anwendungen, Galerie |
| `unternehmen.html` | Historie ab 1938, Standort Heuberg, Werte, Lean Management, Rundgang, Qualität, Partnernetzwerk |
| `karriere.html` | **Karriereseite**: Kampagnen-Hero, Benefits, offene Stellen, Ausbildung, Bewerbungsprozess, Kurzbewerbung, FAQ |
| `kontakt.html` | Kontaktwege, Anfrageformular, Downloads, Wissenswertes & FAQ |
| `social-mockup.html` | **Social-Media-Mockup**: Instagram-Profil & Feed, 8 Post-Templates, Stories/Reels, LinkedIn, Redaktionsplan, Styleguide |
| `impressum.html` | Impressum-Gerüst nach § 5 DDG, offene Felder markiert |
| `datenschutz.html` | Datenschutzerklärung zum Stand des Entwurfs, offene Felder markiert |
| `vorschau.html` | Alle Seiten in einer Datei, mit eingebetteten Schriften – zum Weitergeben |
| `rees.css` | Komplettes Design-System (Farben, Typo, Komponenten, Responsive) |
| `rees.js` | Sticky-Nav, Mobilmenü, Scroll-Reveal, Zähler, Akkordeon, Formular-Versand |
| `build-vorschau.mjs` | Erzeugt `vorschau.html` aus den Einzelseiten |

## Designentscheidungen

**Farben aus dem Logo abgeleitet.** Das Rees-Logo trägt zwei Töne: das Royalblau der
Wortmarke und – aus dem Navigationsband der bisherigen Seite – ein Türkis. Beides bildet
die komplette Palette:

| Token | Hex | Einsatz |
|---|---|---|
| `--blue` | `#1B3C8E` | Wortmarke, Sekundär-Buttons, Zahlen |
| `--blue-800` / `--blue-900` | `#132A66` / `#0B1C45` | Dunkle Flächen |
| `--ink-900` | `#061128` | Hero- und Footer-Grund |
| `--cyan` | `#15A5C8` | Primärfarbe für Aktionen und Akzente |
| `--cyan-400` / `--cyan-300` | `#35BFE0` / `#79D8EF` | Verläufe, Highlights auf Dunkel |
| `--cyan-50` | `#E6F6FB` | Icon-Flächen, helle Akzente |

**Typografie.** Headlines in *Archivo* (700/800, eng gesetzt) für den industriellen,
technischen Charakter; Fließtext in *Inter*; technische Labels und Kennzahlen in einer
Monospace-Stack. Beide Webfonts kommen von Google Fonts.

**Navigation entschlackt.** Die bisherigen neun Menüpunkte (Leistungen, Produkte, Lean
Management, Unternehmen, Rundgang, Karriere, Ausbildung, REESümee, Wissenswertes & FAQ)
sind zu fünf zusammengefasst. Lean Management und Rundgang liegen unter *Unternehmen*,
Ausbildung unter *Karriere*, Wissenswertes & FAQ unter *Kontakt*.

**Karriere als eigene Landingpage.** Die Alien-Kampagne („Außerirdisch gute Drehteile
suchen dich!") wird zum Kopf der Seite ausgebaut, statt nur eine Kachel auf der Startseite
zu sein. Kurzbewerbung ohne Anschreiben, Rückmeldezusage, sichtbarer Bewerbungsprozess.

## Bilder

Es sind **keine Fotos eingebunden**. Alle Bildflächen sind gestaltete Platzhalter
(`.ph`) mit Beschriftung, welches Motiv dort hingehört – z. B. „Foto: Langdrehautomat im
Betrieb". Zum Befüllen den Platzhalter durch ein `<img>` ersetzen:

```html
<!-- vorher -->
<div class="ph ph--4x3"><span class="ph__label">Foto: Langdrehautomat im Betrieb</span></div>
<!-- nachher -->
<img class="ph ph--4x3" src="bilder/langdreher.jpg" alt="Langdrehautomat in der Fertigung"
     style="object-fit:cover" width="1200" height="900" />
```

Das **Logo ist ein SVG-Nachbau** (`<symbol id="reeslogo">`, in jeder Seite oben eingebettet).
Es approximiert die Wortmarke über Webfont-Text und die beiden Werkzeug-Grafiken über
Pfade. Vor dem Livegang durch die Originaldatei ersetzen. Die Farbsteuerung läuft über
zwei Custom Properties, die auch nach dem Austausch beibehalten werden sollten:
`--lg-blue` (Wortmarke) und `--lg-grey` (Werkzeug-Grafiken); `.logo--light` schaltet auf Weiß.

## Datenherkunft

Inhalte stammen aus der bestehenden Website rees-zerspanungstechnik.de, dem
Instagram-Profil [@rees.zerspanungstechnik](https://www.instagram.com/rees.zerspanungstechnik/)
und öffentlich zugänglichen Firmenprofilen.

Wörtlich übernommen und daher unverändert gelassen: der Claim „Kompetenz und Fantasie für
perfekte Zerspanung", die beiden Absätze zur Positionierung auf der Startseite, der
Lean-Management-Absatz, die REESümee-Titel, die Kontaktdaten und die Instagram-Bio.

Gesicherte Eckdaten: Gründung 1938 durch Josef Rees senior im eigenen Haus als Nebenerwerb
zur Landwirtschaft · Führung in dritter Generation durch Thomas Rees, vierte Generation
aktiv im Betrieb · Standort Wengenstr. 16, 78564 Wehingen · CNC-Drehen bis Ø 90 mm
Stangenmaterial bzw. Ø 250 mm im Futter · 5-Achs-Bearbeitungszentren · Losgrößen ab
500 Stück · Werkstoffe von Messing bis Titan · ISO 9001, ISO 14001, ISO 50001:2018 ·
Branchen Antriebstechnik, Automotive, Wehrtechnik, Hydraulik, Maschinenbau, Textiltechnik ·
Ausbildungsberufe Zerspanungsmechaniker Drehautomatensysteme (3,5 J.), Zerspanungsmechaniker
Fräsmaschinensysteme (3,5 J.), Fachkraft Metalltechnik FR Zerspanungstechnik (2 J.),
Start jeweils 1. September · Weiterbildung zu Industriemeister und staatlich geprüftem
Techniker · Benefits: unbefristeter Vertrag, 30 Tage Urlaub, attraktive Vergütung.

## Vor dem Livegang zu prüfen

Die folgenden Angaben sind Platzhalter oder aus widersprüchlichen Quellen übernommen und
müssen von Rees bestätigt werden:

- **Mitarbeiterzahl.** Quellen nennen 50–99, „über 80" und „über 100". Im Entwurf steht
  durchgehend „100+" bzw. „rund 100" – bitte auf den korrekten Wert setzen.
- **Stellenliste** auf `karriere.html`. Zusammengestellt aus öffentlich sichtbaren
  Ausschreibungen; aktueller Stand und genaue Bezeichnungen sind zu prüfen.
- **Historie-Jahreszahlen** für zweite und dritte Generation sowie weitere Meilensteine
  (Neubauten, Maschineninvestitionen, Erstzertifizierungen) auf `unternehmen.html`.
- **Öffnungszeiten** auf `kontakt.html` sind ein Platzhalter.
- **Zitate** auf `karriere.html` sind bewusst als Platzhalter gekennzeichnet und durch
  echte O-Töne mit Namen und Einwilligung zu ersetzen.
- **Zahlen im Fertigungsspektrum** (Toleranzen, Taktzeiten in den Social-Captions) sind
  plausible Beispielwerte, keine zugesicherten Eigenschaften.
- **Impressum und Datenschutz** sind angelegt, aber unvollständig: Geschäftsführung,
  Registergericht, HRB-Nummer, USt-IdNr., redaktionell Verantwortliche(r), Hoster,
  Speicherfristen und Bildnachweise sind mit `[zu ergänzen]` markiert. Beide Texte
  gehören vor dem Livegang rechtlich geprüft – der Entwurf ersetzt keine Rechtsberatung.
- **AGB** sind im Footer noch als Platzhalter verlinkt.

## Technische To-dos für den Livegang

- **Formulare** (`karriere.html`, `kontakt.html`) senden aktuell per `mailto:`. Live an einen
  Formular-Endpunkt oder ein Bewerbermanagement anbinden – inklusive Datei-Upload für
  Zeichnungen bzw. Lebenslauf.
- **Karte** auf `kontakt.html` erst nach aktiver Einwilligung nachladen (Zwei-Klick-Lösung).
- **Stellenanzeigen** mit `JobPosting`-strukturierten Daten auszeichnen, damit sie in
  Google Jobs erscheinen; für das Unternehmen zusätzlich `Organization`/`LocalBusiness`.
- **Sprachumschalter** DE/EN ist im Entwurf angelegt, aber noch nicht verdrahtet.
- **Rechtstexte** und der REESümee-Bereich brauchen eigene Seiten bzw. eine Anbindung an das
  bestehende CMS.
- **Fonts** ggf. selbst hosten statt über Google Fonts zu laden (Datenschutz).

## Social-Media-Mockup

`social-mockup.html` ist ein Präsentationsdokument, keine Vorlage zum direkten Posten. Es zeigt:

- **Instagram-Profil im Telefonrahmen** mit den echten Profildaten (25 Beiträge, 495 Follower,
  18 Gefolgt, Bio) und einem neu gestalteten Feed
- **Feed-Logik** über drei Spalten: A Menschen, B Technik, C Unternehmen
- **Acht Post-Templates** im Format 1:1 mit Caption-Vorschlag und Hashtag-Set
- **Vier Story-Formate** (9:16) plus drei Reel-Ideen
- **LinkedIn-Post** mit angepasster Tonalität
- **Redaktionsplan** über vier Wochen mit drei festen Slots pro Woche
- **Styleguide**: Farbwerte, Typo-Regeln, Bildregeln, Do's und Don'ts, drei Hashtag-Sets,
  Bio-Vorschlag, Ziele und Messgrößen

Follower- und Beitragszahlen entsprechen dem Stand des Profils zum Zeitpunkt der
Konzepterstellung. Alle Kacheln sind Layout-Templates – Fotos, Namen, Zitate und
Kennzahlen werden vor Veröffentlichung durch echte Inhalte ersetzt. Für Mitarbeitendenfotos
ist eine schriftliche Einwilligung nötig, für Kundenteile eine Freigabe.

## Vorschau neu bauen

`build-vorschau.mjs` liest die Einzelseiten, schneidet jeweils den `<main>`-Bereich heraus,
schreibt alle Links auf ein Hash-Schema um (`#karriere`, `#karriere~ausbildung`) und setzt
alles mit gemeinsamem Kopf und Fuß zu `vorschau.html` zusammen.

```bash
cd rees
node build-vorschau.mjs          # nutzt fonts-inline.css, falls vorhanden
```

Die Datei `fonts-inline.css` enthält die Latin-Subsets von Archivo und Inter als
Base64-`@font-face`-Regeln (rund 410 KB). Dadurch ist `vorschau.html` vollständig offlinefähig.
Neu erzeugen lässt sie sich mit `node build-vorschau.mjs --fetch-fonts`; fehlt die Datei,
fällt die Vorschau auf Systemschriften zurück.

## Barrierefreiheit & Technik

- Semantisches HTML, sichtbarer Fokus-Ring, `aria-expanded` an Menü und Akkordeon
- `prefers-reduced-motion` wird respektiert (Animationen und Zähler schalten ab)
- Responsive ab 320 px, geprüft bei 390 px und 1440 px – kein horizontales Scrollen
- Keine externen Skripte, kein Tracking, keine Cookies
