import type Database from "better-sqlite3";
import { config } from "../config.js";

/**
 * Dashboard-Abfragen. WICHTIG zur Mandantentrennung: Jede Funktion filtert
 * ausschließlich über die übergebene `websiteIds`-Liste. Diese Liste wird vom
 * Aufrufer aus den Zugriffsrechten des Benutzers gebildet – niemals aus
 * ungeprüften Client-Parametern. Alle Werte werden parametrisiert übergeben
 * (Schutz vor SQL-Injection).
 */

export interface Range {
  from: string; // ISO
  to: string; // ISO
}

/** Erzeugt (?, ?, ...)-Platzhalter für eine IN-Liste. */
function placeholders(n: number): string {
  return Array(n).fill("?").join(",");
}

/** Leere Ergebnisse, wenn der Benutzer keine Websites sehen darf. */
function guard(websiteIds: string[]): boolean {
  return websiteIds.length > 0;
}

export function listWebsites(db: Database.Database, websiteIds: string[]) {
  if (!guard(websiteIds)) return [];
  return db
    .prepare(
      `SELECT w.id, w.name, w.domain, w.tracking_id, w.tenant_id, t.name AS tenant_name
         FROM websites w JOIN tenants t ON t.id = w.tenant_id
        WHERE w.id IN (${placeholders(websiteIds.length)})
        ORDER BY t.name, w.name`,
    )
    .all(...websiteIds);
}

export function overview(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) {
    return { pageViews: 0, sessions: 0, uniqueVisitors: 0, avgDurationSeconds: 0, bounceRate: 0 };
  }
  const ph = placeholders(websiteIds.length);
  const args = [...websiteIds, range.from, range.to];

  const pv = db
    .prepare(
      `SELECT COUNT(*) AS c FROM events
        WHERE website_id IN (${ph}) AND event_type='page_view'
          AND created_at BETWEEN ? AND ?`,
    )
    .get(...args) as { c: number };

  const sess = db
    .prepare(
      `SELECT
          COUNT(*) AS sessions,
          COUNT(DISTINCT visitor_id) AS visitors,
          SUM(CASE WHEN page_view_count <= 1 THEN 1 ELSE 0 END) AS bounces,
          SUM(MAX((julianday(last_seen)-julianday(first_seen))*86400, 0)) AS total_duration
         FROM sessions
        WHERE website_id IN (${ph}) AND first_seen BETWEEN ? AND ?`,
    )
    .get(...args) as {
    sessions: number;
    visitors: number;
    bounces: number;
    total_duration: number | null;
  };

  const sessions = sess.sessions ?? 0;
  return {
    pageViews: pv.c ?? 0,
    sessions,
    uniqueVisitors: sess.visitors ?? 0,
    avgDurationSeconds: sessions > 0 ? round2((sess.total_duration ?? 0) / sessions) : 0,
    bounceRate: sessions > 0 ? round2(((sess.bounces ?? 0) / sessions) * 100) : 0,
  };
}

/** Besucher-/Session-Entwicklung pro Tag (für das Diagramm). */
export function visitorTrend(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return [];
  const ph = placeholders(websiteIds.length);
  return db
    .prepare(
      `SELECT date(first_seen) AS day,
              COUNT(*) AS sessions,
              COUNT(DISTINCT visitor_id) AS visitors
         FROM sessions
        WHERE website_id IN (${ph}) AND first_seen BETWEEN ? AND ?
        GROUP BY day ORDER BY day`,
    )
    .all(...websiteIds, range.from, range.to);
}

/** Aktuell aktive Besucher (letzte 5 Minuten), gesamt + pro Website. */
export function realtime(db: Database.Database, websiteIds: string[]) {
  if (!guard(websiteIds)) return { active: 0, perWebsite: [], activePages: [] };
  const since = new Date(Date.now() - config.activeWindowMs).toISOString();
  const ph = placeholders(websiteIds.length);

  const active = db
    .prepare(
      `SELECT COUNT(DISTINCT visitor_id) AS c FROM sessions
        WHERE website_id IN (${ph}) AND last_seen >= ?`,
    )
    .get(...websiteIds, since) as { c: number };

  const perWebsite = db
    .prepare(
      `SELECT w.id AS website_id, w.name,
              COUNT(DISTINCT s.visitor_id) AS active
         FROM websites w
         LEFT JOIN sessions s
                ON s.website_id = w.id AND s.last_seen >= ?
        WHERE w.id IN (${ph})
        GROUP BY w.id, w.name ORDER BY active DESC`,
    )
    .all(since, ...websiteIds);

  const activePages = db
    .prepare(
      `SELECT exit_path AS path, COUNT(*) AS visitors,
              MAX((julianday(last_seen)-julianday(first_seen))*86400) AS max_duration
         FROM sessions
        WHERE website_id IN (${ph}) AND last_seen >= ?
        GROUP BY exit_path ORDER BY visitors DESC LIMIT 20`,
    )
    .all(...websiteIds, since);

  return { active: active.c ?? 0, perWebsite, activePages };
}

export function topPages(db: Database.Database, websiteIds: string[], range: Range) {
  return groupEvents(db, websiteIds, range, "page_path", { pageViewOnly: true });
}

export function entryExitPages(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return { entry: [], exit: [] };
  const ph = placeholders(websiteIds.length);
  const args = [...websiteIds, range.from, range.to];
  const entry = db
    .prepare(
      `SELECT entry_path AS label, COUNT(*) AS count FROM sessions
        WHERE website_id IN (${ph}) AND first_seen BETWEEN ? AND ?
        GROUP BY entry_path ORDER BY count DESC LIMIT 10`,
    )
    .all(...args);
  const exit = db
    .prepare(
      `SELECT exit_path AS label, COUNT(*) AS count FROM sessions
        WHERE website_id IN (${ph}) AND first_seen BETWEEN ? AND ?
        GROUP BY exit_path ORDER BY count DESC LIMIT 10`,
    )
    .all(...args);
  return { entry, exit };
}

export function referrers(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return [];
  const ph = placeholders(websiteIds.length);
  // Referrer auf Host-Ebene gruppieren; leere = "Direkt".
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(referrer,''), '(direkt)') AS label, COUNT(*) AS count
         FROM sessions
        WHERE website_id IN (${ph}) AND first_seen BETWEEN ? AND ?
        GROUP BY label ORDER BY count DESC LIMIT 15`,
    )
    .all(...websiteIds, range.from, range.to);
}

export function devices(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return { deviceType: [], browser: [], os: [], country: [] };
  return {
    deviceType: groupSessions(db, websiteIds, range, "device_type"),
    browser: groupSessions(db, websiteIds, range, "browser"),
    os: groupSessions(db, websiteIds, range, "os"),
    country: groupSessions(db, websiteIds, range, "country"),
  };
}

export function conversions(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return [];
  const ph = placeholders(websiteIds.length);
  return db
    .prepare(
      `SELECT event_name AS label, COUNT(*) AS count,
              COUNT(DISTINCT session_id) AS sessions
         FROM events
        WHERE website_id IN (${ph}) AND event_type='conversion'
          AND created_at BETWEEN ? AND ?
        GROUP BY event_name ORDER BY count DESC`,
    )
    .all(...websiteIds, range.from, range.to);
}

export function errors(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return { total: 0, top: [] };
  const ph = placeholders(websiteIds.length);
  const args = [...websiteIds, range.from, range.to];
  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM events
        WHERE website_id IN (${ph}) AND event_type='error' AND created_at BETWEEN ? AND ?`,
    )
    .get(...args) as { c: number };
  const top = db
    .prepare(
      `SELECT event_name AS label, page_path, COUNT(*) AS count
         FROM events
        WHERE website_id IN (${ph}) AND event_type='error' AND created_at BETWEEN ? AND ?
        GROUP BY event_name, page_path ORDER BY count DESC LIMIT 20`,
    )
    .all(...args);
  return { total: total.c ?? 0, top };
}

/**
 * Performance-Kennzahlen (Core Web Vitals). Der Tracker sendet Werte als
 * numerische Properties (z. B. lcp, cls, inp, ttfb) in performance-Events.
 */
export function performance(db: Database.Database, websiteIds: string[], range: Range) {
  if (!guard(websiteIds)) return { metrics: [], samples: 0 };
  const ph = placeholders(websiteIds.length);
  const rows = db
    .prepare(
      `SELECT properties FROM events
        WHERE website_id IN (${ph}) AND event_type='performance'
          AND created_at BETWEEN ? AND ? AND properties IS NOT NULL
        LIMIT 20000`,
    )
    .all(...websiteIds, range.from, range.to) as { properties: string }[];

  const buckets: Record<string, number[]> = {};
  for (const r of rows) {
    let props: Record<string, unknown>;
    try {
      props = JSON.parse(r.properties);
    } catch {
      continue;
    }
    for (const [k, v] of Object.entries(props)) {
      if (typeof v === "number" && Number.isFinite(v)) (buckets[k] ??= []).push(v);
    }
  }

  const metrics = Object.entries(buckets).map(([name, values]) => {
    values.sort((a, b) => a - b);
    return {
      metric: name,
      count: values.length,
      avg: round2(values.reduce((s, x) => s + x, 0) / values.length),
      p75: percentile(values, 75),
      p95: percentile(values, 95),
    };
  });
  return { metrics, samples: rows.length };
}

// ── interne Helfer ──────────────────────────────────────────────────────────

function groupSessions(
  db: Database.Database,
  websiteIds: string[],
  range: Range,
  column: "device_type" | "browser" | "os" | "country",
) {
  const ph = placeholders(websiteIds.length);
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(${column},''), 'unknown') AS label, COUNT(*) AS count
         FROM sessions
        WHERE website_id IN (${ph}) AND first_seen BETWEEN ? AND ?
        GROUP BY label ORDER BY count DESC LIMIT 15`,
    )
    .all(...websiteIds, range.from, range.to);
}

function groupEvents(
  db: Database.Database,
  websiteIds: string[],
  range: Range,
  column: "page_path",
  opts: { pageViewOnly?: boolean } = {},
) {
  if (!guard(websiteIds)) return [];
  const ph = placeholders(websiteIds.length);
  const typeFilter = opts.pageViewOnly ? "AND event_type='page_view'" : "";
  return db
    .prepare(
      `SELECT ${column} AS label, COUNT(*) AS count,
              COUNT(DISTINCT visitor_id) AS visitors
         FROM events
        WHERE website_id IN (${ph}) ${typeFilter} AND created_at BETWEEN ? AND ?
        GROUP BY ${column} ORDER BY count DESC LIMIT 20`,
    )
    .all(...websiteIds, range.from, range.to);
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.floor((p / 100) * sortedAsc.length));
  return round2(sortedAsc[idx]);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
