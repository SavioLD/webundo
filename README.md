# WEBUNDO – Website

Moderne, statische Website für **WEBUNDO UG** (Einkaufsintelligenz · Beschaffung · Optimierung)
mit integriertem **Einkaufs-Potenzial-Rechner** und KI-Assistent-Vorschau.

## Inhalt

| Datei | Beschreibung |
|-------|--------------|
| `index.html` | Startseite |
| `versorgung.html`, `beschaffung.html`, `optimierung.html` | Leistungsseiten |
| `unternehmen.html`, `kontakt.html` | Unternehmen & Kontakt |
| `rechner.html` | Einkaufs-Potenzial-Rechner (Lead-Tool) |
| `impressum.html`, `datenschutz.html` | Rechtliches |
| `css/` | Styles (`style.css`, `rechner.css`) |
| `js/` | Logik (`main.js`, `rechner.js`, `chat-widget.js`) |
| `logo.svg` | Logo |
| `webundo-onepage.html` | **Bonus:** komplette Seite als eine einzige Datei (alles inline) |

## Auf GitHub Pages veröffentlichen

1. Neues Repository anlegen (z. B. `webundo-website`).
2. **Alle Dateien aus diesem ZIP** in das Repo laden (Struktur beibehalten – `index.html` muss im Root liegen).
3. **Settings → Pages → Source: „Deploy from a branch" → Branch `main` / Ordner `/root`** → Save.
4. Nach ca. 1 Minute ist die Seite live unter
   `https://<dein-benutzername>.github.io/webundo-website/`.

### Eigene Domain (optional)
- In **Settings → Pages → Custom domain** die Domain (z. B. `webundo.de`) eintragen.
- Beim Domain-Anbieter einen CNAME-/A-Record auf GitHub Pages setzen.

## Aktualisieren
Einfach die betreffende Datei im Repo ersetzen/bearbeiten – Pages baut automatisch neu.

## Noch anzupassen
- **Impressum:** Handelsregister-Nummer (HRB) und USt-IdNr. eintragen.
- **Logo:** `logo.svg` ist eine SVG-Nachbildung. Original-Logo bei Bedarf austauschen.
- **Kontaktformular & Rechner** senden per `mailto:` an `info@webundo.de`.
  Für direkten Serverversand kann ein Formular-Endpoint angebunden werden.
- **KI-Assistent** (`js/chat-widget.js`) ist aktuell eine Demo-Vorschau ohne Backend.
