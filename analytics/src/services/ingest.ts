import type Database from "better-sqlite3";
import type { ValidatedEvent } from "../lib/validation.js";
import type { DeviceInfo } from "../types.js";
import { sessionDurationSeconds } from "../lib/aggregations.js";

export interface IngestContext {
  visitorId: string;
  device: DeviceInfo;
  country: string;
  /** Serverseitiger, autoritativer Empfangszeitpunkt (ISO). */
  receivedAt: string;
}

interface WebsiteRef {
  id: string;
  tenant_id: string;
}

/**
 * Verarbeitet ein validiertes Event: schreibt die Roh-Zeile und aktualisiert
 * die zugehörige Session (upsert). Läuft in der aufrufenden Transaktion.
 *
 * PII-Schutz: Es werden ausschließlich die validierten, primitiven Properties
 * gespeichert – niemals IP oder Formularinhalte (der Tracker sendet diese
 * gar nicht erst).
 */
export function ingestEvent(
  db: Database.Database,
  website: WebsiteRef,
  ev: ValidatedEvent,
  ctx: IngestContext,
): void {
  // Idempotenz: doppelte eventId (z. B. Beacon-Retry) ignorieren.
  db.prepare(
    `INSERT OR IGNORE INTO events
       (id, website_id, tenant_id, session_id, visitor_id, event_name, event_type,
        page_url, page_path, page_title, referrer, properties,
        device_type, browser, os, country, client_ts, created_at)
     VALUES (@id, @website_id, @tenant_id, @session_id, @visitor_id, @event_name, @event_type,
        @page_url, @page_path, @page_title, @referrer, @properties,
        @device_type, @browser, @os, @country, @client_ts, @created_at)`,
  ).run({
    id: ev.eventId,
    website_id: website.id,
    tenant_id: website.tenant_id,
    session_id: ev.sessionId,
    visitor_id: ctx.visitorId,
    event_name: ev.eventName,
    event_type: ev.eventType,
    page_url: ev.pageUrl,
    page_path: ev.pagePath,
    page_title: ev.pageTitle ?? null,
    referrer: ev.referrer ?? null,
    properties: ev.properties ? JSON.stringify(ev.properties) : null,
    device_type: ctx.device.deviceType,
    browser: ctx.device.browser,
    os: ctx.device.os,
    country: ctx.country,
    client_ts: ev.timestamp ?? null,
    created_at: ctx.receivedAt,
  });

  upsertSession(db, website, ev, ctx);
}

function upsertSession(
  db: Database.Database,
  website: WebsiteRef,
  ev: ValidatedEvent,
  ctx: IngestContext,
): void {
  const existing = db
    .prepare("SELECT id, first_seen FROM sessions WHERE id = ?")
    .get(ev.sessionId) as { id: string; first_seen: string } | undefined;

  const isPageView = ev.eventType === "page_view" ? 1 : 0;

  if (!existing) {
    db.prepare(
      `INSERT INTO sessions
         (id, website_id, tenant_id, visitor_id, first_seen, last_seen,
          entry_path, exit_path, page_view_count, event_count,
          referrer, utm_source, device_type, browser, os, country)
       VALUES (@id, @website_id, @tenant_id, @visitor_id, @first_seen, @last_seen,
          @entry_path, @exit_path, @page_view_count, 1,
          @referrer, @utm_source, @device_type, @browser, @os, @country)`,
    ).run({
      id: ev.sessionId,
      website_id: website.id,
      tenant_id: website.tenant_id,
      visitor_id: ctx.visitorId,
      first_seen: ctx.receivedAt,
      last_seen: ctx.receivedAt,
      entry_path: ev.pagePath,
      exit_path: ev.pagePath,
      page_view_count: isPageView,
      referrer: ev.referrer ?? null,
      utm_source: extractUtmSource(ev.pageUrl),
      device_type: ctx.device.deviceType,
      browser: ctx.device.browser,
      os: ctx.device.os,
      country: ctx.country,
    });
    return;
  }

  db.prepare(
    `UPDATE sessions
        SET last_seen = @last_seen,
            exit_path = @exit_path,
            page_view_count = page_view_count + @pv,
            event_count = event_count + 1
      WHERE id = @id`,
  ).run({
    id: ev.sessionId,
    last_seen: ctx.receivedAt,
    exit_path: ev.pagePath,
    pv: isPageView,
  });
}

/** Liest utm_source aus der URL (für Traffic-Quellen). */
function extractUtmSource(pageUrl: string): string | null {
  try {
    const u = new URL(pageUrl);
    return u.searchParams.get("utm_source");
  } catch {
    return null;
  }
}

/** Abgeleitete Sitzungsdauer (für Aggregationen/Export). */
export function sessionDuration(first: string, last: string): number {
  return sessionDurationSeconds(first, last);
}
