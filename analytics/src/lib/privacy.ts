import { createHash, randomBytes } from "node:crypto";
import type Database from "better-sqlite3";
import { config } from "../config.js";

/**
 * Datenschutz-Hilfsfunktionen.
 *
 * Leitidee (Plausible-Stil): Wir speichern KEINE IP-Adressen und setzen KEINE
 * persistenten Cookies/Identifier. Eindeutige Besucher werden über einen
 * täglich rotierenden Hash aus (Salt des Tages + Website + anonymisierte IP +
 * User-Agent) gebildet. Dadurch:
 *   - keine seitenübergreifende Wiedererkennung,
 *   - keine Wiedererkennung über Tage hinweg (Salt rotiert),
 *   - kein klassisches Fingerprinting (nur grobe Merkmale, gehasht),
 *   - IP wird vor der Verarbeitung anonymisiert und nie gespeichert.
 *
 * HINWEIS (rechtlich zu prüfen): Ob dieses Verfahren im Einzelfall
 * einwilligungsfrei zulässig ist, muss juristisch bewertet werden.
 */

/** Anonymisiert eine IP-Adresse: IPv4 -> /24, IPv6 -> /48. */
export function anonymizeIp(ip: string | undefined | null): string {
  if (!ip) return "0.0.0.0";
  // X-Forwarded-For kann eine Liste sein – erste (Client-)IP nehmen.
  const first = ip.split(",")[0].trim();
  if (first.includes(":")) {
    // IPv6 -> erste 3 Hextets behalten (/48).
    const parts = first.split(":");
    return parts.slice(0, 3).join(":") + "::";
  }
  const octets = first.split(".");
  if (octets.length === 4) {
    octets[3] = "0";
    return octets.join(".");
  }
  return "0.0.0.0";
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Holt (oder erzeugt) das rotierende Tages-Salt aus der DB. Kombiniert mit dem
 * statischen VISITOR_SALT aus der Konfiguration.
 */
export function getDailySalt(db: Database.Database, day = today()): string {
  const row = db.prepare("SELECT salt FROM privacy_salts WHERE day = ?").get(day) as
    | { salt: string }
    | undefined;
  if (row) return row.salt;
  const salt = randomBytes(16).toString("hex");
  db.prepare("INSERT OR IGNORE INTO privacy_salts(day, salt) VALUES (?, ?)").run(day, salt);
  const stored = db.prepare("SELECT salt FROM privacy_salts WHERE day = ?").get(day) as {
    salt: string;
  };
  return stored.salt;
}

/**
 * Leitet die anonyme, tagesstabile visitor_id ab. Rohdaten (IP, UA) werden
 * nur transient verwendet und niemals gespeichert.
 */
export function deriveVisitorId(
  db: Database.Database,
  websiteId: string,
  rawIp: string | undefined,
  userAgent: string | undefined,
): string {
  const dailySalt = getDailySalt(db);
  const anonIp = anonymizeIp(rawIp);
  return createHash("sha256")
    .update(`${config.visitorSalt}|${dailySalt}|${websiteId}|${anonIp}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

/** Prüft den Do-Not-Track-Header. */
export function isDoNotTrack(dntHeader: string | undefined): boolean {
  return dntHeader === "1";
}
