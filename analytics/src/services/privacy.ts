import type Database from "better-sqlite3";

/**
 * Datenschutz-Operationen: vollständiger Export und Löschung aller Daten einer
 * Website oder eines Kunden (Mandanten). Erfüllt die Anforderungen an
 * Datenexport und Löschung ("Recht auf Löschung"/Kündigung).
 *
 * HINWEIS (rechtlich zu prüfen): Der Umfang eines Betroffenen-Auskunfts-/
 * Löschungsanspruchs nach DSGVO ist juristisch zu bewerten. Da hier keine
 * personenbezogenen Identifier gespeichert werden, ist eine Zuordnung zu
 * einzelnen Personen technisch nicht vorgesehen.
 */

export function exportWebsiteData(db: Database.Database, websiteId: string) {
  return {
    exportedAt: new Date().toISOString(),
    website: db.prepare("SELECT * FROM websites WHERE id = ?").get(websiteId),
    conversionDefinitions: db
      .prepare("SELECT * FROM conversion_definitions WHERE website_id = ?")
      .all(websiteId),
    sessions: db.prepare("SELECT * FROM sessions WHERE website_id = ?").all(websiteId),
    events: db.prepare("SELECT * FROM events WHERE website_id = ?").all(websiteId),
    dailyAggregates: db.prepare("SELECT * FROM daily_aggregates WHERE website_id = ?").all(websiteId),
  };
}

/** Löscht sämtliche Analytics-Daten einer Website (Metadaten bleiben erhalten). */
export function deleteWebsiteData(db: Database.Database, websiteId: string): void {
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM events WHERE website_id = ?").run(websiteId);
    db.prepare("DELETE FROM sessions WHERE website_id = ?").run(websiteId);
    db.prepare("DELETE FROM daily_aggregates WHERE website_id = ?").run(websiteId);
    db.prepare("DELETE FROM hourly_aggregates WHERE website_id = ?").run(websiteId);
  });
  tx();
}

/** Löscht einen Kunden vollständig inkl. aller Websites, Daten und Zugriffe. */
export function deleteTenant(db: Database.Database, tenantId: string): void {
  // ON DELETE CASCADE räumt websites/events/sessions/access automatisch ab.
  db.prepare("DELETE FROM tenants WHERE id = ?").run(tenantId);
}

/**
 * Wendet die Aufbewahrungsfristen an: löscht Roh-Events/Sessions, die älter
 * als die (Website- oder Mandanten-)Retention sind. Als periodischer Job
 * gedacht (Cron). Aggregierte Kennzahlen bleiben erhalten.
 */
export function applyRetention(db: Database.Database, now = new Date()): number {
  const websites = db
    .prepare(
      `SELECT w.id, COALESCE(w.retention_days, t.retention_days) AS days
         FROM websites w JOIN tenants t ON t.id = w.tenant_id`,
    )
    .all() as { id: string; days: number }[];

  let deleted = 0;
  for (const w of websites) {
    const cutoff = new Date(now.getTime() - w.days * 86_400_000).toISOString();
    const r1 = db
      .prepare("DELETE FROM events WHERE website_id = ? AND created_at < ?")
      .run(w.id, cutoff);
    const r2 = db
      .prepare("DELETE FROM sessions WHERE website_id = ? AND last_seen < ?")
      .run(w.id, cutoff);
    deleted += Number(r1.changes) + Number(r2.changes);
  }
  return deleted;
}
