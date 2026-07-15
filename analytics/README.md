# WEBUNDO Analytics

Mandantenfähige, datenschutzfreundliche **Web-Analytics-Plattform** für mehrere
Kundenwebsites – mit leichtgewichtigem Tracking-Script, Event-Ingestion-API,
Echtzeitanzeige aktiver Besucher und geschütztem Dashboard mit Rollen- und
Rechteverwaltung.

> **Status: MVP.** Bewusst schlank gehalten (Single-Node, SQLite). Der
> Skalierungspfad (Postgres/ClickHouse, Redis, SSE/WebSocket) ist unten
> beschrieben und die zentralen Komponenten sind austauschbar gekapselt.

---

## Inhaltsverzeichnis

- [Architektur](#architektur)
- [Warum ein eigenes Teilprojekt?](#warum-ein-eigenes-teilprojekt)
- [Schnellstart (lokal)](#schnellstart-lokal)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Datenbank & Migration](#datenbank--migration)
- [Tracking-Script einbinden](#tracking-script-einbinden)
- [Eigene Events definieren](#eigene-events-definieren)
- [Kunden & Websites einrichten](#kunden--websites-einrichten)
- [Rollen & Mandantentrennung](#rollen--mandantentrennung)
- [API-Referenz](#api-referenz)
- [Datenschutz & Consent](#datenschutz--consent)
- [Backup & Datenlöschung](#backup--datenlöschung)
- [Tests](#tests)
- [Deployment](#deployment)
- [Skalierung / nächste Schritte](#skalierung--nächste-schritte)

---

## Architektur

```
 Kundenwebsite                     analytics.example.com (dieser Dienst)
 ┌────────────┐   POST /events    ┌──────────────────────────────────────┐
 │ tracker.js │ ────────────────▶ │ Event-Ingestion (Express + Zod)       │
 └────────────┘   sendBeacon      │  Rate-Limit · Payload-Limit · CORS    │
                                   │  Schema-Validierung · ID-Prüfung      │
                                   │            │                          │
                                   │            ▼                          │
                                   │  SQLite (better-sqlite3)              │
                                   │  events · sessions · aggregates       │
                                   │            │                          │
 Dashboard (SPA) ◀──JWT+Rollen──── │  Query-Service · Realtime (5-Min-Fenster) │
                                   └──────────────────────────────────────┘
```

**Komponenten (wie gefordert):**

| Komponente | Umsetzung | Datei(en) |
|---|---|---|
| Tracking-Script | Vanilla JS, ~7 KB, keine Abhängigkeiten | `tracker/tracker.js` |
| Event-Ingestion-API | `POST /api/analytics/events` | `src/routes/events.ts` |
| Validierung & Rate-Limiting | Zod-Schema, In-Memory-Limiter, Body-Limit | `src/lib/validation.ts`, `src/lib/rateLimit.ts` |
| Event-Speicher | SQLite + Migrationen + Indizes | `src/db/schema.sql`, `src/db/index.ts` |
| Aggregationslogik | reine Funktionen + SQL-Queries | `src/lib/aggregations.ts`, `src/services/queries.ts` |
| Echtzeit (aktive Besucher) | 5-Minuten-Fenster über `last_seen` | `src/services/queries.ts` → `realtime()` |
| Geschütztes Dashboard | SPA (Vanilla JS, inline-SVG-Charts) | `public/` |
| Rollen & Rechte | JWT + `super_admin`/`staff`/`customer` | `src/lib/auth.ts` |
| Monitoring & Fehler | `/health`, sichere Fehlerbehandlung, Fehler-Events | `src/app.ts`, `src/routes/events.ts` |

**Tech-Stack:** Node.js 20+, TypeScript, Express, Zod, better-sqlite3,
JWT (`jsonwebtoken`), bcryptjs. Tests mit Vitest + Supertest.

---

## Warum ein eigenes Teilprojekt?

Die bestehende WEBUNDO-Website (Repo-Root) ist eine **rein statische Seite**
(GitHub Pages). Ein Analytics-System braucht Server, Datenbank, Auth und ein
geschütztes Dashboard – das kann GitHub Pages nicht leisten. Deshalb liegt die
Plattform als **eigenständig deploybares Teilprojekt** unter `analytics/`; die
Marketing-Website bleibt unverändert. Wiederverwendet wird der vorhandene
„Stack" (Web/JS) beim **Tracking-Script**, das sich nahtlos wie `main.js` oder
`chat-widget.js` einbinden lässt.

---

## Schnellstart (lokal)

Voraussetzung: **Node.js ≥ 20**.

```bash
cd analytics
cp .env.example .env          # Secrets bei Bedarf anpassen
npm install
npm run seed                  # legt Demo-Mandanten, Websites, Nutzer & Daten an
npm run dev                   # Server auf http://localhost:4000
```

Dann im Browser öffnen:

- **Dashboard:** http://localhost:4000/
- **Beispielseite mit Tracker:** `analytics/examples/integration.html`
  (Datei direkt öffnen oder statisch servieren)

**Demo-Logins** (nur lokal, Passwort überall `demo1234`):

| Rolle | E-Mail | Sichtbarkeit |
|---|---|---|
| Super Admin | `admin@webundo.de` | alle Websites |
| Mitarbeiter | `team@webundo.de` | Stadtwerke-Websites |
| Kunde A | `kunde@stadtwerke.de` | Stadtwerke Hauptseite |
| Kunde B | `kunde@muster.de` | Muster Shop |

---

## Umgebungsvariablen

Siehe `.env.example`. Die wichtigsten:

| Variable | Default | Bedeutung |
|---|---|---|
| `PORT` | `4000` | Server-Port |
| `DATABASE_PATH` | `./data/analytics.db` | SQLite-Datei (`:memory:` für Tests) |
| `JWT_SECRET` | *(unsicher)* | **In Produktion zwingend setzen** |
| `JWT_EXPIRES_IN` | `12h` | Token-Laufzeit |
| `VISITOR_SALT` | *(unsicher)* | Basis-Salt der Besucher-Ableitung |
| `DEFAULT_RETENTION_DAYS` | `180` | Standard-Aufbewahrung (pro Website überschreibbar) |
| `MAX_EVENT_PAYLOAD_KB` | `64` | Payload-Größenlimit des Event-Endpunkts |
| `INGEST_RATE_LIMIT` / `INGEST_RATE_WINDOW_MS` | `120` / `60000` | Rate-Limit pro IP |
| `DASHBOARD_CORS_ORIGINS` | `http://localhost:4000` | erlaubte Dashboard-Origins |

In Produktion (`NODE_ENV=production`) startet der Server **nicht**, solange
Default-Secrets aktiv sind (Schutz gegen versehentliche Fehlkonfiguration).

---

## Datenbank & Migration

Das Schema wird **idempotent beim Start** angewendet. Manuell:

```bash
npm run migrate       # wendet src/db/schema.sql an
npm run seed          # setzt DB zurück + Demo-Daten
npm run maintenance   # Tages-Rollup + Aufbewahrungsfristen anwenden (Cron)
```

**Datenmodell (Kern):** `tenants`, `websites`, `users`,
`user_website_access`, `sessions`, `events`, `conversion_definitions`,
`daily_aggregates`, `hourly_aggregates`, `privacy_salts`. Indizes u. a. auf
`events(website_id, created_at)`, `events(website_id, event_type, created_at)`,
`sessions(website_id, last_seen)` und `sessions(website_id, visitor_id)`.

---

## Tracking-Script einbinden

Auf jeder Kundenwebsite im `<head>` oder vor `</body>`:

```html
<script
  src="https://analytics.example.com/tracker.js"
  data-website-id="WEBSITE_ID"
  defer>
</script>
```

`WEBSITE_ID` ist die **`tracking_id`** der Website (z. B. `sw_main` aus den
Seed-Daten). Optionale Attribute:

| Attribut | Default | Wirkung |
|---|---|---|
| `data-api` | Origin des Scripts | Basis-URL der Ingestion-API |
| `data-require-consent` | `false` | wenn `true`: sendet erst nach `analytics.consent(true)` |
| `data-track-clicks` | `true` | Klicks auf `[data-track]`-Elemente |
| `data-track-forms` | `true` | Formularstart/-abschluss (ohne Inhalte) |
| `data-track-errors` | `true` | JS-Fehler & unhandled rejections |
| `data-track-performance` | `true` | Core Web Vitals (LCP, CLS, INP, TTFB) |

Das Script erkennt **SPA-Navigation** automatisch (History-API + `popstate`),
verwaltet **anonyme Sessions** (sessionStorage, 30 Min. Timeout), **bündelt**
Events und sendet sie via `sendBeacon`. Es **schlägt niemals sichtbar fehl** –
bei Tracking-Blockern oder Netzwerkfehlern passiert nichts Sichtbares.

---

## Eigene Events definieren

```javascript
// Benutzerdefiniertes Event
window.analytics.track("cta_clicked", { button: "request_demo" });

// Als Conversion markieren (eventType = "conversion")
window.analytics.trackConversion("contact_form_submitted", { form: "contact" });
```

Oder **deklarativ** ohne Code – einfach Attribute setzen:

```html
<button data-track="cta_clicked" data-track-button="request_demo">Demo anfragen</button>
```

Damit ein Custom-Event als **Conversion** im Dashboard erscheint, entweder
`trackConversion(...)` nutzen oder einen Eintrag in `conversion_definitions`
für die Website anlegen (siehe Seed).

**Event-Struktur** (Vertrag Tracker ↔ API, `src/types.ts`):

```typescript
type AnalyticsEvent = {
  eventId: string;
  tenantId: string;    // serverseitig gesetzt
  websiteId: string;   // = tracking_id
  sessionId: string;
  visitorId?: string;  // serverseitig abgeleitet (Tages-Hash)
  eventName: string;
  eventType: "page_view" | "click" | "form" | "conversion" | "error" | "performance" | "custom";
  pageUrl: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  properties?: Record<string, string | number | boolean | null>;
  timestamp: string;
};
```

---

## Kunden & Websites einrichten

### Massen-Provisionierung (empfohlen)

Reale Kundenwebsites werden in **`config/websites.json`** gepflegt und per
Skript idempotent in die Datenbank übernommen (Upsert per `tracking_id`,
**ohne** Analytics-Daten zu löschen):

```bash
npm run provision
```

Jeder Eintrag legt einen Mandanten (`tenant`) und eine Website mit stabiler
`tracking_id` an. Die passenden Einbindungs-Snippets pro Website stehen in
**`config/tracker-snippets.md`** (dort vor dem Ausrollen die echte
Analytics-Domain eintragen). Domains lassen sich in der JSON jederzeit
ergänzen und mit erneutem `npm run provision` übernehmen.

### Manuell per SQL

Alternativ (eine neue Kundin mit Website + Kunden-Login):

```sql
-- Mandant (Kunde)
INSERT INTO tenants(id, name, retention_days) VALUES ('t_neu', 'Neue GmbH', 180);

-- Website (tracking_id = data-website-id im Tracker)
INSERT INTO websites(id, tenant_id, name, domain, tracking_id)
VALUES ('w_neu', 't_neu', 'Neue Website', 'neu.example', 'neu_main');

-- Conversion-Definition (optional)
INSERT INTO conversion_definitions(id, website_id, event_name, display_name)
VALUES ('c1', 'w_neu', 'contact_form_submitted', 'Kontakt gesendet');
```

Benutzer werden mit gehashtem Passwort angelegt – am einfachsten über ein
kleines Node-Snippet mit `hashPassword` aus `src/lib/auth.ts`:

```bash
npx tsx -e "import('./src/lib/auth.ts').then(m => console.log(m.hashPassword('geheim')))"
```

```sql
INSERT INTO users(id, email, password_hash, name, role)
VALUES ('u1', 'kunde@neu.de', '<HASH>', 'Kunde Neu', 'customer');
INSERT INTO user_website_access(user_id, website_id) VALUES ('u1', 'w_neu');
```

> Ein Admin-UI zur Verwaltung von Kunden/Websites/Benutzern ist eine sinnvolle
> Erweiterung nach dem MVP (siehe [Nächste Schritte](#skalierung--nächste-schritte)).

---

## Rollen & Mandantentrennung

| Rolle | Sicht |
|---|---|
| `super_admin` | **alle** Websites & Daten |
| `staff` | nur **zugewiesene** Websites (`user_website_access`) |
| `customer` | **ausschließlich** die eigene(n) Website(s) |

Die Trennung wird **serverseitig in jeder Query** erzwungen: Dashboard-Endpunkte
filtern strikt auf die per Rolle/Zuweisung erlaubten `website_id`s
(`accessibleWebsiteIds` / `canAccessWebsite` in `src/lib/auth.ts`). Ein
`websiteId`-Filter kann nur **einschränken**, nie über die eigenen Rechte
hinaus erweitern – ein Zugriff auf fremde Websites liefert `403`. Abgesichert
durch Berechtigungs-Tests (`test/permissions.test.ts`).

---

## API-Referenz

**Öffentlich (vom Tracker genutzt):**

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/api/analytics/events` | Einzelnes Event **oder** Batch (Array, max. 50). Antwortet immer robust (`202`), auch bei DNT/Bot/unbekannter ID. |
| `GET` | `/tracker.js` | Tracking-Script |
| `GET` | `/health` | Health-Check |

**Auth:**

| Methode | Pfad | Beschreibung |
|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password }` → Token + httpOnly-Cookie |
| `POST` | `/api/auth/logout` | Cookie löschen |
| `GET` | `/api/auth/me` | aktueller Benutzer |

**Dashboard (authentifiziert, rollenbasiert autorisiert).** Alle akzeptieren
`?from`, `?to` (ISO) und optional `?websiteId`:

| Methode | Pfad | Liefert |
|---|---|---|
| `GET` | `/api/analytics/websites` | sichtbare Websites |
| `GET` | `/api/analytics/overview` | KPIs (Seitenaufrufe, Sessions, eind. Besucher, Ø Dauer, Absprungrate) + Trend |
| `GET` | `/api/analytics/realtime` | aktive Besucher (5-Min-Fenster), pro Website, aktuelle Seiten |
| `GET` | `/api/analytics/pages` | meistbesuchte Seiten + Ein-/Ausstiegsseiten |
| `GET` | `/api/analytics/referrers` | Traffic-Quellen / Referrer |
| `GET` | `/api/analytics/devices` | Gerätetyp, Browser, OS, Land |
| `GET` | `/api/analytics/conversions` | Conversion-Events |
| `GET` | `/api/analytics/errors` | Fehler (JS-Fehler etc.) |
| `GET` | `/api/analytics/performance` | Core Web Vitals (Ø, p75, p95) |

**Datenschutz-Endpunkte:**

| Methode | Pfad | Beschreibung |
|---|---|---|
| `GET` | `/api/privacy/websites/:id/export` | vollständiger JSON-Export |
| `DELETE` | `/api/privacy/websites/:id/data` | alle Analytics-Daten löschen (nur `super_admin`/`staff`) |

**Schutz des öffentlichen Endpunkts:** Schema-Validierung (Zod), feste
Eventtypen, Payload-Größenlimit, Rate-Limiting pro IP, CORS, Prüfung der
`tracking_id` (unbekannte/gemischte IDs werden verworfen), parametrisierte
Queries (kein SQL-Injection), sichere Fehlerbehandlung ohne Detail-Leaks.

---

## Datenschutz & Consent

Auf europäische Nutzung vorbereitet, mit Fokus auf Datensparsamkeit:

- **Keine IP-Speicherung.** Die IP wird nur **transient** genutzt und vor der
  Verarbeitung anonymisiert (IPv4 → /24, IPv6 → /48).
- **Kein Fingerprinting, keine Cookies.** Eindeutige Besucher entstehen über
  einen **täglich rotierenden Hash** aus `(Tages-Salt + Website + anonym. IP +
  User-Agent)` (Plausible-Stil). Keine seitenübergreifende und keine
  tageübergreifende Wiedererkennung.
- **Keine Formularinhalte / keine PII.** Der Tracker sendet nur Metadaten
  (z. B. Formularname), niemals Feldwerte; die API akzeptiert nur primitive,
  längenbegrenzte Properties.
- **Do-Not-Track** wird respektiert (Header `DNT: 1` ⇒ keine Speicherung).
- **Consent-Management:** `data-require-consent="true"` puffert Events, bis
  `window.analytics.consent(true)` aufgerufen wird; `consent(false)` verwirft
  den Puffer. Integrierbar mit gängigen Consent-Bannern.
- **Konfigurierbare Aufbewahrung** pro Website/Mandant (`retention_days`),
  angewendet durch `npm run maintenance`.
- **Bot-Traffic** wird nicht als Besucher gezählt.

> ⚠️ **Rechtlicher Hinweis:** Dies ist **keine** verbindliche Aussage zur
> DSGVO-Konformität. Insbesondere **rechtlich zu prüfen**: (1) ob das
> Besucher-Hash-Verfahren im konkreten Einsatz einwilligungsfrei zulässig ist,
> (2) die Notwendigkeit/Reichweite eines Consent-Banners, (3) TOM und
> Auftragsverarbeitung bei mehreren Mandanten, (4) Aufbewahrungsfristen und
> Löschkonzept, (5) Datenschutzerklärung/Informationspflichten. Die im Code mit
> „rechtlich zu prüfen" markierten Stellen sind bewusst hervorgehoben.

---

## Backup & Datenlöschung

**Backup:** Die gesamte Datenbank ist eine Datei. Konsistente Sicherung:

```bash
sqlite3 data/analytics.db ".backup 'backup-$(date +%F).db'"
```

**Export einer Website** (JSON): `GET /api/privacy/websites/:id/export`.

**Löschung:**

- Website-Daten: `DELETE /api/privacy/websites/:id/data` (oder
  `deleteWebsiteData` in `src/services/privacy.ts`).
- Ganzen Kunden inkl. Websites/Daten/Zugriffe: `deleteTenant(db, tenantId)`
  (Kaskadenlöschung via Foreign Keys).
- Abgelaufene Rohdaten: `npm run maintenance` (Aufbewahrungsfristen).

---

## Tests

```bash
npm test          # einmalig
npm run test:watch
```

Abgedeckt:

- **Unit** – zentrale Berechnungen (Absprungrate, Ø Sitzungsdauer, eindeutige
  Besucher, Gruppierung/Prozente): `test/aggregations.test.ts`.
- **Integration** – Event-API: Annahme, Validierung, Batch, Idempotenz, DNT,
  Bot-Filter, unbekannte `tracking_id`, Rate-Limiter: `test/events.api.test.ts`.
- **Berechtigungen / Mandantentrennung** – Rollen-Sichtbarkeit, `403` bei
  Fremdzugriff, keine Datenübergriffe: `test/permissions.test.ts`.

---

## Deployment

Das MVP läuft als **einzelner Node-Prozess** mit einer SQLite-Datei auf
persistentem Volume – ideal für einen kleinen VPS/Container.

```bash
npm ci
npm run build
NODE_ENV=production \
JWT_SECRET=... VISITOR_SALT=... DATABASE_PATH=/data/analytics.db \
npm start
```

Empfehlungen:

- **HTTPS/Reverse-Proxy** (nginx/Caddy/Cloudflare) davor. Länder-Header des CDN
  (`cf-ipcountry`) wird für die Geo-Zuordnung genutzt.
- **Persistentes Volume** für die DB; regelmäßiges Backup (s. o.).
- **Cron** für Wartung: `0 3 * * *  node dist/db/maintenance.js`.
- Für hohe Verfügbarkeit/Skalierung: siehe nächster Abschnitt.

---

## Skalierung / nächste Schritte

Was für die aktuelle Größe **ausreicht** und was später **ausgetauscht** würde:

| Bereich | MVP (ausreichend) | Skalierungspfad |
|---|---|---|
| Event-Speicher | SQLite (eine Datei) | Postgres/TimescaleDB; bei sehr hohem Volumen **ClickHouse** für Events |
| Aggregation | Live-Queries + optionaler Tages-Rollup | Materialisierte Aggregate/Rollup-Jobs, gegen die das Dashboard fährt |
| Realtime | 5-Min-Fenster per SQL, Dashboard-Polling (15 s) | **Redis** (Sorted Sets/Pub-Sub) + **SSE/WebSocket** für Push in Echtzeit |
| Rate-Limiting | In-Memory (pro Instanz) | Redis-basiert (clusterweit) |
| Ingestion | synchrone Schreibvorgänge | Queue/Buffer (Redis/Kafka) + Worker, Backpressure |
| Betrieb | ein Node-Prozess | mehrere Instanzen hinter Load-Balancer, DB extern |

Die Datenzugriffe sind in `src/services/queries.ts` und `src/db` gekapselt, der
Rate-Limiter hinter einer Schnittstelle (`src/lib/rateLimit.ts`) – beide lassen
sich ohne Änderungen an Routen/Dashboard ersetzen.

**Weitere sinnvolle Erweiterungen (nach MVP, bei Bedarf):** Admin-UI zur
Verwaltung von Kunden/Websites/Benutzern, Funnels & Segmente, Alerting bei
Fehler-/Performance-Spitzen, Sampling bei sehr hohem Traffic, Geo per lokaler
GeoLite2-DB, E-Mail-Reports.
