# Karriereabend Vertrieb – Landingpage & Anmeldung

Eigenständige Kampagnen-Seite für den **Karriereabend Vertrieb im September 2026**
(„Vertrieb erleben – Dein Karriereabend bei Ländle Digital").

Die Seite ist **absichtlich nicht in eine Website eingebunden**: keine Navigation,
kein Menü-Eintrag, kein Link von irgendeiner anderen Seite. Erreichbar ist sie nur über

- die Instagram-/Meta-Anzeige,
- den Link in der Instagram-Bio,
- den QR-Code auf Flyern, Tischkarten und Leinwand,
- direkt geteilte Links (WhatsApp, LinkedIn, E-Mail).

Zusätzlich ist sie per `<meta name="robots" content="noindex, nofollow">` und über die
`robots.txt` im Repo-Root vom Suchindex ausgeschlossen.

---

## Aufbau

Ein einziges File: **`index.html`** – CSS, JavaScript und Icons sind inline.
Keine Web-Fonts, keine externen Skripte, keine Tracker, keine Abhängigkeit zum Rest
des Repos. Der Ordner lässt sich deshalb 1:1 überall hinkopieren (eigene Subdomain,
eigenes GitHub-Pages-Repo, Netlify-Drop, Webspace) und funktioniert dort sofort.

> Weil keine Google Fonts o. Ä. nachgeladen werden, verlässt beim Aufruf der Seite
> kein Datenpaket an Dritte das Gerät der Besucher – bei einem Formular mit
> personenbezogenen Daten die einfachere Variante.

---

## Vor dem Start der Anzeigen ausfüllen

Alles Änderbare steht **an einer Stelle**: im `CONFIG`-Block oben im `<script>`-Teil
von `index.html`. Leere Werte zeigen auf der Seite neutral „wird noch bekannt gegeben"
an, es erscheint also nie ein kaputter Platzhalter.

| Feld | Bedeutung |
|------|-----------|
| `endpoint` | **Wichtigster Wert.** URL des Formular-Dienstes, an den die Anmeldungen gehen. |
| `accessKey` | nur bei Web3Forms nötig |
| `mailTo` | Notfall-Empfänger, falls kein `endpoint` gesetzt ist |
| `datum` | z. B. `"Donnerstag, 17. September 2026"` |
| `ort` | vollständige Adresse des Abends |
| `startISO` / `endeISO` | z. B. `"2026-09-17T18:00:00"` – schaltet den Kalender-Button („Termin in den Kalender") frei |
| `kontaktTel`, `kontaktMail` | Ansprechpartner, erscheinen im Fuß und in Fehlermeldungen |
| `impressum`, `datenschutz` | **bitte auf die echten Rechtstexte zeigen lassen** |
| `instagram` | schaltet den „Auf Instagram folgen"-Button nach der Anmeldung frei |
| `probewochen` | Auswahlmöglichkeiten bei „Welche Termine passen für eine Probewoche?" |

Solange weder `endpoint` noch `mailTo` gesetzt ist, zeigt die Seite über dem Formular
einen gelben Hinweiskasten („noch nicht scharf"). Der verschwindet automatisch, sobald
ein Wert eingetragen ist – so kann die Seite nicht versehentlich live gehen und
Anmeldungen verschlucken.

### Formular-Dienst anbinden

Die Felder werden als normales `multipart/form-data` gepostet – das versteht praktisch
jeder Anbieter. Getestete Kandidaten:

| Anbieter | `endpoint` |
|----------|-----------|
| Formspree | `https://formspree.io/f/DEINE-ID` |
| Web3Forms | `https://api.web3forms.com/submit` (+ `accessKey`) |
| Getform | `https://getform.io/f/DEINE-ID` |
| Make / Zapier | die jeweilige Webhook-URL |

**Bitte einmal echt testen** (Anmeldung abschicken, Eingang prüfen), bevor Werbebudget
auf die Seite läuft.

---

## Was ankommt

Pro Anmeldung werden diese Felder übertragen:

```
Name, Telefon, E-Mail, Aktuelle Tätigkeit, Warum Vertrieb,
Passende Probewochen, Sonstiges, Datenschutz, Anmeldung für, Herkunft
```

`Herkunft` wird automatisch aus den UTM-Parametern der aufgerufenen URL gefüllt.
Damit ist auf einen Blick sichtbar, welcher Kanal die Anmeldungen bringt – dafür in
den Anzeigen einfach mit Parametern verlinken:

```
…/karriereabend/?utm_source=instagram&utm_medium=paid&utm_campaign=karriereabend-sep
…/karriereabend/?utm_source=instagram&utm_medium=bio
…/karriereabend/?src=qr-tischkarte
```

Ohne Parameter wird der Referrer eingetragen, sonst `direkt`.

---

## Spam- und Fehlerverhalten

- **Honeypot:** unsichtbares Feld `_gotcha`; von Bots gefüllte Absendungen werden
  still verworfen.
- **Zeitfalle:** Absenden in unter 3 Sekunden nach Seitenaufruf wird verworfen.
- **Pflichtfeld-Prüfung** direkt im Browser, mit deutschen Fehlermeldungen und
  automatischem Sprung zum ersten Fehler.
- **Server antwortet nicht?** Dann erscheint eine verständliche Meldung mit Telefon
  und E-Mail als Ausweichweg – die Anmeldung geht nicht verloren.

---

## Noch offen / bewusst als Platzhalter gelassen

- **Termin, Uhrzeit-Ort und Probewochen-Termine** – siehe `CONFIG`.
- **Logo:** Das Häkchen im Hero ist ein neutraler Platzhalter, der Austausch ist im
  HTML kommentiert.
- **Vorschaubild** für Link-Vorschauen (`og:image`, 1200 × 630 px) – der Meta-Tag ist
  vorbereitet und auskommentiert. Ohne Bild zeigen WhatsApp und LinkedIn nur Text.
- **Impressum / Datenschutz** verlinken derzeit auf `laendle-digital.com`. Bitte
  prüfen, dass die Datenschutzerklärung die Verarbeitung der Anmeldedaten (Zweck,
  Speicherdauer, Kontaktaufnahme wegen Probewoche) auch abdeckt.
- **Markenfarben:** die vier Werte unter `/* MARKE */` am Anfang des `<style>`-Blocks.

---

## QR-Code

Sobald die endgültige URL steht, den QR-Code auf genau diese URL erzeugen – am besten
mit einem eigenen Parameter (`?src=qr-tischkarte`, `?src=qr-flyer`), dann ist in den
Anmeldungen sichtbar, was der QR-Code gebracht hat.

## Lokal ansehen

```bash
npx http-server . -p 8080     # dann http://localhost:8080/karriereabend/
```
