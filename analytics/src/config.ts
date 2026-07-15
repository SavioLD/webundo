/**
 * Konfiguration aus Umgebungsvariablen. Alle Werte haben sichere Defaults
 * für die lokale Entwicklung; produktive Secrets MÜSSEN überschrieben werden.
 */

function num(value: string | undefined, fallback: number): number {
  const n = value ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num(process.env.PORT, 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  databasePath: process.env.DATABASE_PATH ?? "./data/analytics.db",

  jwtSecret: process.env.JWT_SECRET ?? "dev-insecure-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",

  visitorSalt: process.env.VISITOR_SALT ?? "dev-visitor-salt",
  defaultRetentionDays: num(process.env.DEFAULT_RETENTION_DAYS, 180),

  maxEventPayloadKb: num(process.env.MAX_EVENT_PAYLOAD_KB, 64),
  ingestRateLimit: num(process.env.INGEST_RATE_LIMIT, 120),
  ingestRateWindowMs: num(process.env.INGEST_RATE_WINDOW_MS, 60_000),

  dashboardCorsOrigins: (process.env.DASHBOARD_CORS_ORIGINS ?? "http://localhost:4000")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  /** Ein Besucher gilt als "aktiv", wenn ein Event innerhalb dieses Fensters kam. */
  activeWindowMs: 5 * 60_000,
} as const;

/** Warnung, falls in Produktion Default-Secrets aktiv sind. */
export function assertProdSecrets(): void {
  if (!config.isProd) return;
  const insecure: string[] = [];
  if (config.jwtSecret.includes("change-me") || config.jwtSecret.includes("dev-"))
    insecure.push("JWT_SECRET");
  if (config.visitorSalt.includes("change-me") || config.visitorSalt.includes("dev-"))
    insecure.push("VISITOR_SALT");
  if (insecure.length) {
    throw new Error(
      `Unsichere Default-Secrets in Produktion: ${insecure.join(", ")}. Bitte in .env setzen.`,
    );
  }
}
