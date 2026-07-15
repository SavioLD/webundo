import type { Request } from "express";

/**
 * Ungefähres Land/Region ermitteln – ohne IP-Speicherung.
 *
 * MVP: Nutzt einen bereits vorhandenen Länder-Header des Reverse-Proxys/CDN
 * (z. B. Cloudflare `cf-ipcountry`, sonst gängige Varianten). Damit findet die
 * Geo-Zuordnung an der Edge statt und wir müssen die IP nicht selbst
 * verarbeiten.
 *
 * Skalierung/Alternative: lokale MaxMind-GeoLite2-DB (Country-Granularität)
 * gegen die transient anonymisierte IP. Bewusst nur Land, keine Stadt/GPS.
 */
export function resolveCountry(req: Request): string {
  const header =
    req.header("cf-ipcountry") ??
    req.header("x-vercel-ip-country") ??
    req.header("x-country-code") ??
    "";
  const code = header.trim().toUpperCase();
  // "XX"/"T1" sind Platzhalter mancher CDNs für unbekannt/anonym.
  if (!code || code === "XX" || code === "T1") return "unknown";
  return code.slice(0, 2);
}
