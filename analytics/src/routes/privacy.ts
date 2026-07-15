import { Router, type Request, type Response } from "express";
import type Database from "better-sqlite3";
import { requireAuth, canAccessWebsite, hasRole, type AuthedRequest } from "../lib/auth.js";
import type { AuthUser } from "../types.js";
import { exportWebsiteData, deleteWebsiteData } from "../services/privacy.js";

/**
 * Datenschutz-Endpunkte: Export und Löschung der Daten einer Website.
 * Export ist für alle mit Website-Zugriff erlaubt; die Löschung ist auf
 * super_admin und staff (mit Zugriff) beschränkt.
 */
export function privacyRouter(db: Database.Database): Router {
  const router = Router();
  router.use(requireAuth);

  router.get("/websites/:id/export", (req: Request, res: Response) => {
    const u = user(req);
    if (!canAccessWebsite(db, u, req.params.id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    res
      .setHeader("Content-Disposition", `attachment; filename="export-${req.params.id}.json"`)
      .json(exportWebsiteData(db, req.params.id));
  });

  router.delete("/websites/:id/data", (req: Request, res: Response) => {
    const u = user(req);
    if (!hasRole(u, "super_admin", "staff")) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    if (!canAccessWebsite(db, u, req.params.id)) {
      res.status(403).json({ error: "forbidden" });
      return;
    }
    deleteWebsiteData(db, req.params.id);
    res.json({ ok: true });
  });

  return router;
}

function user(req: Request): AuthUser {
  return (req as AuthedRequest).user!;
}
