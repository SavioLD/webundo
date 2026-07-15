import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type Database from "better-sqlite3";
import { config } from "./config.js";
import { eventsRouter } from "./routes/events.js";
import { authRouter } from "./routes/auth.js";
import { analyticsRouter } from "./routes/analytics.js";
import { privacyRouter } from "./routes/privacy.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Baut die Express-App. Als Factory ausgelegt, damit Tests eine eigene
 * (In-Memory-)DB injizieren können.
 */
export function createApp(db: Database.Database): Express {
  const app = express();
  app.disable("x-powered-by");

  // Sicherheits-Header. CSP für das Dashboard bewusst konservativ.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginResourcePolicy: false,
    }),
  );

  app.use(cookieParser());

  // Health-Check.
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // ── Öffentlich: Tracker-Script + Event-Ingestion ──────────────────────────
  // Der Tracker darf von jeder Kundendomain geladen und angesprochen werden.
  // CORS wird im eventsRouter gezielt nur am /events-Endpunkt gesetzt.
  app.use("/api/analytics", eventsRouter(db));

  // tracker.js wird statisch ausgeliefert (mit langem Cache).
  app.get("/tracker.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(resolve(__dirname, "../tracker/tracker.js"));
  });

  // ── Dashboard-API (auth) ───────────────────────────────────────────────────
  const dashboardCors = cors({ origin: config.dashboardCorsOrigins, credentials: true });
  app.use("/api/auth", dashboardCors, authRouter(db));
  app.use("/api/analytics", dashboardCors, analyticsRouter(db));
  app.use("/api/privacy", dashboardCors, privacyRouter(db));

  // ── Dashboard-SPA (statisch) ──────────────────────────────────────────────
  app.use(express.static(resolve(__dirname, "../public")));

  return app;
}
