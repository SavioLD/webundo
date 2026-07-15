import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { requireAuth, accessibleWebsiteIds, canAccessWebsite, type AuthedRequest } from "../lib/auth.js";
import type { AuthUser } from "../types.js";
import * as q from "../services/queries.js";

/**
 * Geschützte Dashboard-API. Alle Endpunkte sind authentifiziert und filtern
 * strikt auf die Websites, die der Benutzer laut Rolle/Zuweisung sehen darf.
 * Ein `websiteId`-Filter kann die Auswahl weiter einschränken, aber niemals
 * über die eigenen Rechte hinaus erweitern (Mandantentrennung).
 */
export function analyticsRouter(db: Database.Database): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/websites", (req, res) => {
    const ids = scope(db, user(req));
    res.json({ websites: q.listWebsites(db, ids) });
  });

  router.get("/overview", (req, res) => withScope(db, req, res, (ids) => ({
    range: range(req),
    ...q.overview(db, ids, range(req)),
    trend: q.visitorTrend(db, ids, range(req)),
  })));

  router.get("/realtime", (req, res) => withScope(db, req, res, (ids) => q.realtime(db, ids)));

  router.get("/pages", (req, res) => withScope(db, req, res, (ids) => ({
    topPages: q.topPages(db, ids, range(req)),
    ...q.entryExitPages(db, ids, range(req)),
  })));

  router.get("/referrers", (req, res) =>
    withScope(db, req, res, (ids) => ({ referrers: q.referrers(db, ids, range(req)) })),
  );

  router.get("/devices", (req, res) => withScope(db, req, res, (ids) => q.devices(db, ids, range(req))));

  router.get("/conversions", (req, res) =>
    withScope(db, req, res, (ids) => ({ conversions: q.conversions(db, ids, range(req)) })),
  );

  router.get("/errors", (req, res) => withScope(db, req, res, (ids) => q.errors(db, ids, range(req))));

  router.get("/performance", (req, res) =>
    withScope(db, req, res, (ids) => q.performance(db, ids, range(req))),
  );

  return router;
}

// ── Helfer ──────────────────────────────────────────────────────────────────

function user(req: Request): AuthUser {
  return (req as AuthedRequest).user!;
}

/** Alle für den Benutzer sichtbaren Website-IDs. */
function scope(db: Database.Database, u: AuthUser): string[] {
  return accessibleWebsiteIds(db, u);
}

/**
 * Ermittelt die effektiven Website-IDs für eine Anfrage:
 *  - optionaler `websiteId`-Filter (muss erlaubt sein, sonst 403),
 *  - sonst alle sichtbaren Websites.
 * Führt die Antwort aus und kapselt Fehlerbehandlung.
 */
function withScope(
  db: Database.Database,
  req: Request,
  res: Response,
  build: (ids: string[]) => unknown,
): void {
  const u = user(req);
  const filter = typeof req.query.websiteId === "string" ? req.query.websiteId : undefined;
  let ids: string[];
  if (filter) {
    if (!canAccessWebsite(db, u, filter)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    ids = [filter];
  } else {
    ids = scope(db, u);
  }
  res.json(build(ids));
}

/** Zeitraum aus Query-Parametern (Default: letzte 7 Tage). */
function range(req: Request): q.Range {
  const now = Date.now();
  const to = parseDate(req.query.to, new Date(now));
  const from = parseDate(req.query.from, new Date(now - 7 * 86_400_000));
  return { from: from.toISOString(), to: to.toISOString() };
}

function parseDate(value: unknown, fallback: Date): Date {
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}
