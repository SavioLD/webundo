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

## Domain webundo.de auf GitHub Pages schalten (IONOS DNS)

> ⚠️ **Nur die A-/AAAA-Records von `@` und `www` ändern.**
> Die **Mail-Records bleiben unangetastet**: MX (`@`), TXT `v=spf1…` (`@`),
> DKIM (`s1-ionos._domainkey`, `s2-ionos._domainkey`), DMARC (`_dmarc`),
> `_domainconnect`, `autodiscover`. Sonst funktioniert die E-Mail nicht mehr.

### 1) In GitHub
- Repo mit diesen Dateien (inkl. `index.html` und `CNAME`) hochladen.
- **Settings → Pages → Source:** „Deploy from a branch", Branch `main`, Ordner `/root`.
- **Custom domain:** `webundo.de` → Save. Danach **„Enforce HTTPS"** aktivieren
  (sobald das Zertifikat erstellt ist, dauert ein paar Minuten).

### 2) Bei IONOS – Apex-Domain (`webundo.de`, Host `@`)
Den bestehenden WordPress-Eintrag `A @ 217.160.0.79` ersetzen durch **vier A-Records** (`@`):
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```
Den `AAAA @` (WordPress-IPv6) entfernen oder durch GitHubs IPv6 ersetzen:
```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

### 3) Bei IONOS – `www`
Die Einträge `A www` und `AAAA www` löschen und durch **einen CNAME** ersetzen:
```
Typ: CNAME   Host: www   Ziel: saviold.github.io
```
(`saviold.github.io` = `<dein-GitHub-Benutzername>.github.io`.)

### 4) Warten & prüfen
- DNS-Verbreitung dauert je nach TTL (hier 3600 = 1 Std.) bis zu wenige Stunden.
- In GitHub → Settings → Pages zeigt der Status, sobald die Domain aktiv & HTTPS bereit ist.
- Optional: Domain in GitHub (Account → Settings → Pages) verifizieren (Schutz vor Übernahme).
