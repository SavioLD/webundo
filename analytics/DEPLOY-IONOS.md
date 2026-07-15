# Schritt-für-Schritt: WEBUNDO Analytics auf IONOS live schalten

Diese Anleitung ist bewusst für Einsteiger geschrieben. Du brauchst kein
Vorwissen – einfach der Reihe nach durchgehen. Wo du Befehle „eintippst", kannst
du sie einfach kopieren und einfügen.

**Was am Ende dabei rauskommt:** Dein eigenes Analytics läuft unter
`https://analytics.webundo.de`, mit Dashboard und automatischem HTTPS.

Zeitaufwand: ca. 30–45 Minuten. Kosten: der VPS (~1–8 €/Monat).

---

## Teil 1 – Server bei IONOS bestellen (nur Klicks)

1. Bei **ionos.de** anmelden.
2. Menü **„Server & Cloud"** öffnen → **VPS** (oder „Cloud Server") **bestellen**.
3. Tarif: ein kleiner reicht – z. B. **VPS Linux S** (2 GB RAM). Nicht den
   kleinsten mit 1 GB, damit der Build flüssig läuft.
4. Betriebssystem: **Ubuntu 24.04** (oder 22.04).
5. Rechenzentrum: **Deutschland** (Datenschutz).
6. Bestellen. Nach ein paar Minuten siehst du im IONOS-Kundenbereich:
   - die **IP-Adresse** des Servers (z. B. `81.123.45.67`)
   - ein **Root-Passwort** (bzw. du legst eines fest).

> Notiere dir **IP-Adresse** und **Passwort** – beides brauchst du gleich.

---

## Teil 2 – Mit dem Server verbinden

Du verbindest dich per „SSH" (eine Fernverbindung zum Server).

**Windows:** „Terminal" oder „PowerShell" öffnen (Startmenü → „Terminal" tippen).
**Mac:** „Terminal" öffnen (über Spotlight suchen).

Dann eintippen (IP durch deine ersetzen):

```bash
ssh root@DEINE-SERVER-IP
```

- Beim ersten Mal kommt eine Sicherheitsfrage → `yes` eingeben.
- Dann das **Root-Passwort** eingeben (beim Tippen sieht man nichts – das ist normal).

> Alternativ hat IONOS im Kundenbereich eine **„Remote-Konsole"** (Fenster im
> Browser) – die funktioniert genauso, falls SSH nicht klappt.

Firewall: Im IONOS-Kundenbereich beim Server sicherstellen, dass die **Ports 80
und 443** erlaubt sind (meist Standard). Diese braucht die Webseite/HTTPS.

---

## Teil 3 – Analytics installieren und starten

Jetzt bist du „auf dem Server". Kopiere die folgenden Blöcke nacheinander hinein
und drücke jeweils Enter.

**1) Docker installieren** (die Technik, die alles startet):

```bash
curl -fsSL https://get.docker.com | sh
```

**2) Projekt holen** (die Analytics-Software):

```bash
git clone https://github.com/SavioLD/webundo.git
cd webundo
git checkout claude/multi-tenant-analytics-d08tl6
cd analytics
```

**3) Geheim-Schlüssel setzen** (macht deine Installation sicher – wird
automatisch erzeugt):

```bash
cp .env.example .env
sed -i "s#^JWT_SECRET=.*#JWT_SECRET=$(openssl rand -hex 32)#" .env
sed -i "s#^VISITOR_SALT=.*#VISITOR_SALT=$(openssl rand -hex 32)#" .env
```

**4) Starten:**

```bash
docker compose up -d --build
```

Das dauert beim ersten Mal ein paar Minuten (er baut alles zusammen). Fertig,
wenn die Eingabe wieder frei ist.

---

## Teil 4 – DNS-Eintrag bei IONOS (damit die Adresse funktioniert)

Damit `analytics.webundo.de` auf deinen Server zeigt:

1. Im IONOS-Kundenbereich → **Domains** → **webundo.de** → **DNS**.
2. **Neuen Eintrag** hinzufügen:
   - **Typ:** `A`
   - **Host/Name:** `analytics`
   - **Wert / zeigt auf:** deine **Server-IP** (aus Teil 1)
   - TTL: Standard lassen
3. Speichern.

> ⚠️ **Wichtig:** Nur diesen **einen neuen** Eintrag hinzufügen. Die bestehenden
> Einträge (vor allem **MX, TXT/SPF, DKIM, DMARC** für deine E-Mails) **nicht**
> anfassen – sonst funktioniert deine E-Mail nicht mehr.

Die Umstellung kann ein paar Minuten bis wenige Stunden dauern. Caddy holt dann
automatisch das HTTPS-Zertifikat – du musst dafür nichts tun.

---

## Teil 5 – Websites & dein Login einrichten

Zurück im Server-Fenster (im Ordner `webundo/analytics`):

**Alle 35 Websites ins System übernehmen:**

```bash
docker compose exec app node dist/db/provision.js
```

**Dein Admin-Login anlegen** (Passwort ersetzen!):

```bash
docker compose exec app node dist/db/create-user.js admin@webundo.de "DEIN-SICHERES-PASSWORT" super_admin "Admin"
```

---

## Teil 6 – Ausprobieren 🎉

Sobald der DNS-Eintrag aktiv ist, im Browser öffnen:

- **Dashboard:** `https://analytics.webundo.de`
  → mit `admin@webundo.de` und deinem Passwort anmelden.

WEBUNDO sammelt ab dann Daten (der Tracker ist dort schon eingebaut, sobald der
Branch in `main` gemergt ist – siehe unten).

---

## Teil 7 – Restliche Websites ausrollen

Den Tracker in die übrigen Websites einbauen (in einem Durchgang):

```bash
ANALYTICS_HOST=https://analytics.webundo.de scripts/rollout-tracker.sh
```

Das erzeugt pro Website einen Branch. **Live geht der Tracker je Website erst,
wenn du deren Branch in `main` mergst** (bei GitHub-Pages-Seiten wird `main`
angezeigt).

---

## Danach: Pflege (optional, aber empfohlen)

- **Backup** (regelmäßig):
  ```bash
  docker compose exec -T app sh -c "sqlite3 /data/analytics.db \".backup '/data/backup.db'\""
  docker compose cp app:/data/backup.db ./backup-$(date +%F).db
  ```
- **Aufräumen/Aufbewahrung** (z. B. per Cron nachts):
  ```bash
  docker compose exec -T app node dist/db/maintenance.js
  ```
- **Updates einspielen:**
  ```bash
  git pull && docker compose up -d --build
  ```

---

## Wenn etwas klemmt

- Läuft alles? `docker compose ps`
- Log ansehen: `docker compose logs app` bzw. `docker compose logs caddy`
- HTTPS kommt nicht? Fast immer der DNS-Eintrag (Teil 4) noch nicht aktiv – kurz
  warten und erneut probieren.

Melde dich einfach mit der Fehlermeldung – ich helfe dir weiter.

> **Rechtlicher Hinweis:** Vor der ersten echten Datenerfassung die
> Datenschutzerklärung prüfen/ergänzen (im Projekt als „rechtlich zu prüfen"
> markiert).
