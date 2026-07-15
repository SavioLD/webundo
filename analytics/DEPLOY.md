# Deployment – WEBUNDO Analytics

Diese Anleitung bringt das Analytics-Backend produktiv unter
`https://analytics.webundo.de` an den Start. Das Setup ist bewusst einfach:
ein Server, Docker, automatisches HTTPS.

> **Was nur DU tun kannst** (braucht Konten/Zugänge, die niemand von außen hat):
> 1) einen kleinen Server bereitstellen, 2) einen DNS-Eintrag setzen. Alles
> andere ist vorbereitet und automatisiert.

---

## Überblick

```
Kundenwebsites ──▶ https://analytics.webundo.de ──▶ Caddy (TLS) ──▶ App (:4000) ──▶ SQLite-Volume
```

Enthaltene Artefakte: `Dockerfile`, `docker-compose.yml` (App + Caddy mit
Let's-Encrypt-HTTPS), `Caddyfile`. Der komplette Build-/Startpfad wurde
verifiziert.

---

## Voraussetzungen

- Ein kleiner Linux-Server (1 vCPU / 1–2 GB RAM genügen für den Start) mit
  **Docker** und **Docker Compose**. Öffentliche IPv4, Ports **80** und **443**
  erreichbar.
- Zugriff auf die **DNS-Verwaltung von `webundo.de`** (laut Repo: IONOS).

---

## Schritt 1 – DNS-Eintrag setzen (IONOS)

Einen A-Record für die Subdomain anlegen – **nur diesen einen**:

```
Typ: A    Host: analytics    Wert: <SERVER-IP>
```

> ⚠️ Wie in der Haupt-README beschrieben: **Mail-Records (MX, SPF/TXT, DKIM,
> DMARC, autodiscover) unangetastet lassen.** Hier kommt nur ein neuer
> `analytics`-A-Record hinzu, bestehende Einträge werden nicht verändert.

DNS-Verbreitung kann je nach TTL etwas dauern.

## Schritt 2 – Projekt auf den Server bringen

```bash
git clone https://github.com/SavioLD/webundo.git
cd webundo/analytics
```

## Schritt 3 – Secrets setzen

```bash
cp .env.example .env
# JWT_SECRET und VISITOR_SALT auf lange Zufallswerte setzen, z. B.:
sed -i "s#^JWT_SECRET=.*#JWT_SECRET=$(openssl rand -hex 32)#"   .env
sed -i "s#^VISITOR_SALT=.*#VISITOR_SALT=$(openssl rand -hex 32)#" .env
```

## Schritt 4 – Starten

```bash
docker compose up -d --build
```

Caddy holt automatisch ein TLS-Zertifikat für `analytics.webundo.de`. Nach
kurzer Zeit ist erreichbar:

- Dashboard: `https://analytics.webundo.de/`
- Tracker:   `https://analytics.webundo.de/tracker.js`
- Event-API: `POST https://analytics.webundo.de/api/analytics/events`

## Schritt 5 – Websites & Login einrichten

```bash
# Alle Kundenwebsites aus config/websites.json in die DB übernehmen:
docker compose exec app node dist/db/provision.js

# Super-Admin anlegen (Passwort anpassen!):
docker compose exec app node dist/db/create-user.js \
  admin@webundo.de "EIN-STARKES-PASSWORT" super_admin "Admin"
```

Optional Kunden-Logins (sehen nur ihre Website):

```bash
docker compose exec app node dist/db/create-user.js \
  kunde@steger.de "PASSWORT" customer "Steger" steger_gartenservice
```

## Schritt 6 – Tracker ausrollen

Der WEBUNDO-Tracker ist bereits im `webundo`-Repo eingebunden (Branch der
Analytics-Umsetzung). Für die übrigen Websites gibt es ein automatisiertes
Rollout-Skript:

```bash
# aus dem analytics/-Verzeichnis, mit git-Push-Rechten auf die Repos:
ANALYTICS_HOST=https://analytics.webundo.de \
BRANCH=claude/analytics-tracker \
scripts/rollout-tracker.sh
```

Das Skript baut das Snippet (mit korrekter `tracking_id`) in jede Website ein
und pusht je Repo auf einen Branch – der **Live-Stand ändert sich erst beim
Merge** des jeweiligen Pull Requests.

---

## Wartung (Cron)

Tages-Rollup + Aufbewahrungsfristen anwenden (nächtlich):

```bash
0 3 * * *  cd /pfad/zu/webundo/analytics && docker compose exec -T app node dist/db/maintenance.js
```

## Backup

```bash
docker compose exec -T app sh -c "sqlite3 /data/analytics.db \".backup '/data/backup.db'\""
docker compose cp app:/data/backup.db ./backup-$(date +%F).db
```

## Update

```bash
git pull && docker compose up -d --build
```

---

## Alternative Deployments

- **Ohne Docker:** `npm ci && npm run build && cp src/db/schema.sql dist/db/ &&
  NODE_ENV=production node dist/index.js` hinter einem Reverse-Proxy
  (nginx/Caddy) mit TLS. DB-Datei auf persistentem Pfad (`DATABASE_PATH`).
- **Edge/Serverless (später):** Bei sehr hohem Traffic Ingestion und Speicher
  austauschen (siehe README → „Skalierung"): z. B. Cloudflare Workers + D1/
  Queues oder ein Postgres/ClickHouse-Backend. Die Datenzugriffe sind gekapselt.

## Sicherheits-Checkliste (vor Go-Live)

- [ ] `JWT_SECRET` und `VISITOR_SALT` auf starke Zufallswerte gesetzt
- [ ] Nur Ports 80/443 öffentlich; App-Port 4000 nur intern
- [ ] Admin-Passwort geändert, Demo-/Seed-Nutzer nicht in Produktion
- [ ] Backups eingerichtet und einmal getestet
- [ ] **Datenschutz rechtlich geprüft** (Datenschutzerklärung ergänzt,
      Consent-Konzept geklärt – siehe README, „rechtlich zu prüfen")
