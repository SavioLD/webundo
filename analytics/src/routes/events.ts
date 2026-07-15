import express, { Router, type Request, type Response } from "express";
import cors from "cors";
import type Database from "better-sqlite3";
import { eventBatchSchema } from "../lib/validation.js";
import { createRateLimiter } from "../lib/rateLimit.js";
import { parseUserAgent } from "../lib/ua.js";
import { resolveCountry } from "../lib/geo.js";
import { deriveVisitorId, isDoNotTrack } from "../lib/privacy.js";
import { ingestEvent } from "../services/ingest.js";
import { config } from "../config.js";

/**
 * Öffentlicher Event-Ingestion-Endpunkt.
 *
 * Schutzmaßnahmen (siehe Aufgabenstellung):
 *  - Schema-Validierung (zod), feste Eventtypen, Payload-Größenlimit (CORS/Body)
 *  - Rate-Limiting pro IP
 *  - tracking_id -> interne website_id/tenant_id: manipulierte IDs werden
 *    verworfen (unbekannt => 202 ohne Speicherung, kein Info-Leak)
 *  - parametrisierte Queries (kein SQL-Injection)
 *  - IP wird nur transient zur Ableitung genutzt und nie gespeichert
 *  - DNT wird respektiert (kein Speichern), Antwort bleibt 202 (kein Fehler)
 *  - "sichere Fehlerbehandlung": nie 5xx-Details nach außen; der Tracker soll
 *    niemals die Kundenwebsite beeinträchtigen.
 */
export function eventsRouter(db: Database.Database): Router {
  const router = Router();
  const limiter = createRateLimiter(config.ingestRateLimit, config.ingestRateWindowMs);

  // Body-Limit als erste Verteidigungslinie gegen große Payloads.
  const bodyLimit = `${config.maxEventPayloadKb}kb`;

  // Cache für tracking_id -> {id, tenant_id}, entlastet die DB bei Hot-Paths.
  const websiteCache = new Map<string, { id: string; tenant_id: string } | null>();
  function resolveWebsite(trackingId: string) {
    if (websiteCache.has(trackingId)) return websiteCache.get(trackingId)!;
    const row = db
      .prepare("SELECT id, tenant_id FROM websites WHERE tracking_id = ?")
      .get(trackingId) as { id: string; tenant_id: string } | undefined;
    const val = row ?? null;
    websiteCache.set(trackingId, val);
    return val;
  }

  // Öffentlicher CORS nur für den Event-Endpunkt (jede Kundendomain darf senden).
  const publicCors = cors({ origin: true, methods: ["POST", "OPTIONS"], maxAge: 86400 });
  router.options("/events", publicCors);

  router.post(
    "/events",
    publicCors,
    // Body-Parser mit striktem Limit direkt an dieser Route.
    express.json({ limit: bodyLimit }),
    (req: Request, res: Response) => {
      try {
        const ip = clientIp(req);

        // Rate-Limit pro IP.
        const rl = limiter.check(ip);
        res.setHeader("X-RateLimit-Remaining", String(rl.remaining));
        if (!rl.allowed) {
          res.status(429).json({ error: "rate_limited" });
          return;
        }

        // Do-Not-Track respektieren: annehmen, aber nicht speichern.
        if (isDoNotTrack(req.header("dnt"))) {
          res.status(202).json({ ok: true, ignored: "dnt" });
          return;
        }

        // Schema-Validierung.
        const parsed = eventBatchSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "invalid_payload" });
          return;
        }
        const events = Array.isArray(parsed.data) ? parsed.data : [parsed.data];

        // Alle Events einer Anfrage müssen zur selben (gültigen) Website gehören.
        const trackingId = events[0].websiteId;
        const website = resolveWebsite(trackingId);
        if (!website || events.some((e) => e.websiteId !== trackingId)) {
          // Unbekannte/gemischte tracking_id: still verwerfen (kein Leak, kein Fehler).
          res.status(202).json({ ok: true });
          return;
        }

        const device = parseUserAgent(req.header("user-agent"));
        const country = resolveCountry(req);
        const visitorId = deriveVisitorId(db, website.id, ip, req.header("user-agent"));
        const receivedAt = new Date().toISOString();

        // Bots nicht als Besucher zählen (Datensparsamkeit/Qualität).
        if (device.deviceType === "bot") {
          res.status(202).json({ ok: true, ignored: "bot" });
          return;
        }

        const tx = db.transaction(() => {
          for (const ev of events) {
            ingestEvent(db, website, ev, { visitorId, device, country, receivedAt });
          }
        });
        tx();

        res.status(202).json({ ok: true, accepted: events.length });
      } catch {
        // Sichere Fehlerbehandlung: keine Details, kein 5xx-Sturz für den Tracker.
        res.status(202).json({ ok: true });
      }
    },
  );

  return router;
}

/** Client-IP aus üblichen Proxy-Headern (nur transient genutzt). */
function clientIp(req: Request): string {
  return (
    req.header("cf-connecting-ip") ??
    req.header("x-real-ip") ??
    req.header("x-forwarded-for")?.split(",")[0].trim() ??
    req.socket.remoteAddress ??
    "0.0.0.0"
  );
}
