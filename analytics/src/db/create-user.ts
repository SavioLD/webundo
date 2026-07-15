import { randomUUID } from "node:crypto";
import { getDb } from "./index.js";
import { hashPassword } from "../lib/auth.js";
import type { UserRole } from "../types.js";

/**
 * Legt einen Dashboard-Benutzer an (oder aktualisiert dessen Passwort/Rolle).
 *
 * Nutzung:
 *   node dist/db/create-user.js <email> <passwort> <rolle> ["Anzeigename"] [trackingId,trackingId,...]
 *   npx tsx src/db/create-user.ts admin@webundo.de "GeheimesPW" super_admin "Admin"
 *
 * rolle: super_admin | staff | customer
 * Bei staff/customer optional die Websites (per tracking_id) zuweisen.
 */

const [email, password, role, name, trackingIds] = process.argv.slice(2);
const validRoles: UserRole[] = ["super_admin", "staff", "customer"];

if (!email || !password || !validRoles.includes(role as UserRole)) {
  console.error(
    "Nutzung: create-user <email> <passwort> <super_admin|staff|customer> [name] [trackingId,...]",
  );
  process.exit(1);
}

const db = getDb();
const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
  | { id: string }
  | undefined;

const userId = existing?.id ?? randomUUID();
if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, role = ?, name = ? WHERE id = ?").run(
    hashPassword(password),
    role,
    name ?? email,
    userId,
  );
} else {
  db.prepare("INSERT INTO users(id,email,password_hash,name,role) VALUES (?,?,?,?,?)").run(
    userId,
    email,
    hashPassword(password),
    name ?? email,
    role,
  );
}

// Optionale Website-Zuweisungen (für staff/customer).
if (trackingIds) {
  for (const tid of trackingIds.split(",").map((s) => s.trim()).filter(Boolean)) {
    const w = db.prepare("SELECT id FROM websites WHERE tracking_id = ?").get(tid) as
      | { id: string }
      | undefined;
    if (w) {
      db.prepare(
        "INSERT OR IGNORE INTO user_website_access(user_id, website_id) VALUES (?,?)",
      ).run(userId, w.id);
    } else {
      console.warn(`Warnung: keine Website mit tracking_id "${tid}" gefunden.`);
    }
  }
}

// eslint-disable-next-line no-console
console.log(`Benutzer ${existing ? "aktualisiert" : "angelegt"}: ${email} (${role})`);
