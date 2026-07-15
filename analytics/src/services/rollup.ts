import type Database from "better-sqlite3";

/**
 * Tages-Rollup: verdichtet Sessions/Events zu daily_aggregates. Für das MVP
 * werden die Dashboard-Zahlen live aus den Rohdaten berechnet; dieser Rollup
 * ist der Skalierungspfad, um lange Zeiträume und viele Websites schnell zu
 * beantworten (dann Dashboards gegen daily_aggregates statt Rohdaten fahren).
 *
 * Als periodischer Job (z. B. nächtlich per Cron) gedacht; idempotent
 * (REPLACE pro Website/Tag).
 */
export function rollupDaily(db: Database.Database, forDate?: string): number {
  const dateFilter = forDate ? "AND date(first_seen) = ?" : "";
  const rows = db
    .prepare(
      `SELECT website_id, date(first_seen) AS date,
              COUNT(*) AS sessions,
              COUNT(DISTINCT visitor_id) AS unique_visitors,
              SUM(page_view_count) AS page_views,
              SUM(CASE WHEN page_view_count <= 1 THEN 1 ELSE 0 END) AS bounces,
              SUM(MAX((julianday(last_seen)-julianday(first_seen))*86400, 0)) AS total_duration
         FROM sessions
        WHERE 1=1 ${dateFilter}
        GROUP BY website_id, date(first_seen)`,
    )
    .all(...(forDate ? [forDate] : [])) as Array<{
    website_id: string;
    date: string;
    sessions: number;
    unique_visitors: number;
    page_views: number;
    bounces: number;
    total_duration: number;
  }>;

  const upsert = db.prepare(
    `INSERT INTO daily_aggregates
       (website_id, date, page_views, sessions, unique_visitors, bounces, total_duration)
     VALUES (@website_id, @date, @page_views, @sessions, @unique_visitors, @bounces, @total_duration)
     ON CONFLICT(website_id, date) DO UPDATE SET
       page_views=excluded.page_views, sessions=excluded.sessions,
       unique_visitors=excluded.unique_visitors, bounces=excluded.bounces,
       total_duration=excluded.total_duration`,
  );

  const tx = db.transaction(() => {
    for (const r of rows)
      upsert.run({ ...r, total_duration: Math.round(r.total_duration ?? 0) });
  });
  tx();
  return rows.length;
}
