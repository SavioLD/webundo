import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _db: Database.Database | null = null;

/**
 * Liefert die (Singleton-)Datenbankverbindung. Legt bei Bedarf das
 * Datenverzeichnis an und wendet das Schema idempotent an.
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  if (config.databasePath !== ":memory:") {
    mkdirSync(dirname(resolve(config.databasePath)), { recursive: true });
  }

  const db = new Database(config.databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  _db = db;
  return db;
}

/** Wendet das SQL-Schema an (CREATE TABLE IF NOT EXISTS ...). */
export function migrate(db: Database.Database): void {
  const schema = readFileSync(resolve(__dirname, "schema.sql"), "utf8");
  db.exec(schema);
}

/** Nur für Tests: frische In-Memory-Datenbank. */
export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

/** Setzt das Singleton zurück (Tests). */
export function __resetDb(db?: Database.Database): void {
  _db = db ?? null;
}
