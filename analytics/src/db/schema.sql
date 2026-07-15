-- =============================================================================
-- WEBUNDO Analytics – Datenbankschema (SQLite / MVP)
-- Mandantenfähig: jede Zeile mit Analytics-Bezug trägt tenant_id + website_id.
-- Für den Skalierungspfad (Postgres/ClickHouse) siehe README.
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ── Kunden / Mandanten ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 180, -- Aufbewahrung der Rohdaten
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Websites einer Mandantin ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS websites (
  id             TEXT PRIMARY KEY,
  tenant_id      TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  domain         TEXT NOT NULL,
  -- Öffentliche, in <script data-website-id> verwendete ID.
  tracking_id    TEXT NOT NULL UNIQUE,
  -- NULL => Mandanten-Default (tenants.retention_days) verwenden.
  retention_days INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_websites_tenant ON websites(tenant_id);

-- ── Dashboard-Benutzer ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  -- 'super_admin' | 'staff' | 'customer'
  role          TEXT NOT NULL CHECK (role IN ('super_admin','staff','customer')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Website-Zugriffe (für staff & customer; super_admin sieht alles) ─────────
CREATE TABLE IF NOT EXISTS user_website_access (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  website_id TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, website_id)
);
CREATE INDEX IF NOT EXISTS idx_uwa_website ON user_website_access(website_id);

-- ── Analytics-Sessions (anonym) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id               TEXT PRIMARY KEY,        -- vom Client erzeugte Session-ID
  website_id       TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  tenant_id        TEXT NOT NULL,
  visitor_id       TEXT NOT NULL,           -- täglich rotierender Hash (kein Fingerprint)
  first_seen       TEXT NOT NULL,
  last_seen        TEXT NOT NULL,
  entry_path       TEXT,
  exit_path        TEXT,
  page_view_count  INTEGER NOT NULL DEFAULT 0,
  event_count      INTEGER NOT NULL DEFAULT 0,
  referrer         TEXT,
  utm_source       TEXT,
  device_type      TEXT,
  browser          TEXT,
  os               TEXT,
  country          TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_website_last ON sessions(website_id, last_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_website_first ON sessions(website_id, first_seen);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor ON sessions(website_id, visitor_id);

-- ── Roh-Events ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,             -- eventId (Idempotenz)
  website_id  TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  session_id  TEXT NOT NULL,
  visitor_id  TEXT NOT NULL,
  event_name  TEXT NOT NULL,
  event_type  TEXT NOT NULL,
  page_url    TEXT NOT NULL,
  page_path   TEXT NOT NULL,
  page_title  TEXT,
  referrer    TEXT,
  properties  TEXT,                         -- JSON-String (validiert, ohne PII)
  device_type TEXT,
  browser     TEXT,
  os          TEXT,
  country     TEXT,
  client_ts   TEXT,                         -- Zeitstempel vom Client
  created_at  TEXT NOT NULL DEFAULT (datetime('now')) -- serverseitig, autoritativ
);
CREATE INDEX IF NOT EXISTS idx_events_website_created ON events(website_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_website_type ON events(website_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_website_name ON events(website_id, event_name, created_at);

-- ── Conversion-Definitionen ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversion_definitions (
  id           TEXT PRIMARY KEY,
  website_id   TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  event_name   TEXT NOT NULL,               -- z.B. "contact_form_submitted"
  display_name TEXT NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (website_id, event_name)
);

-- ── Tages-Aggregationen (Rollup; beschleunigt lange Zeiträume) ──────────────
CREATE TABLE IF NOT EXISTS daily_aggregates (
  website_id      TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  date            TEXT NOT NULL,            -- YYYY-MM-DD (UTC)
  page_views      INTEGER NOT NULL DEFAULT 0,
  sessions        INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  bounces         INTEGER NOT NULL DEFAULT 0,
  total_duration  INTEGER NOT NULL DEFAULT 0, -- Summe Sitzungsdauer (Sekunden)
  PRIMARY KEY (website_id, date)
);

-- ── Stündliche Aggregationen ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hourly_aggregates (
  website_id  TEXT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  hour_bucket TEXT NOT NULL,                -- YYYY-MM-DD HH:00 (UTC)
  page_views  INTEGER NOT NULL DEFAULT 0,
  sessions    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (website_id, hour_bucket)
);

-- ── Metadaten / rotierendes Salt für die Besucher-Ableitung ─────────────────
CREATE TABLE IF NOT EXISTS privacy_salts (
  day  TEXT PRIMARY KEY,                    -- YYYY-MM-DD
  salt TEXT NOT NULL
);
