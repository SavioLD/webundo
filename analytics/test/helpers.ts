import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import { createTestDb } from "../src/db/index.js";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/lib/auth.js";

export interface Fixture {
  db: Database.Database;
  tenantA: string;
  tenantB: string;
  siteA1: { id: string; tracking: string };
  siteA2: { id: string; tracking: string };
  siteB1: { id: string; tracking: string };
  users: {
    admin: string;
    staff: string;
    customerA: string;
    customerB: string;
  };
}

/**
 * Baut eine frische In-Memory-DB mit zwei Mandanten, drei Websites und
 * Benutzern aller Rollen. Bewusst ohne Zufalls-Events – Tests fügen gezielt
 * Daten hinzu.
 */
export function makeFixture(): Fixture {
  const db = createTestDb();
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  db.prepare("INSERT INTO tenants(id,name,retention_days) VALUES (?,?,180)").run(tenantA, "Tenant A");
  db.prepare("INSERT INTO tenants(id,name,retention_days) VALUES (?,?,90)").run(tenantB, "Tenant B");

  const siteA1 = { id: randomUUID(), tracking: "trk_a1" };
  const siteA2 = { id: randomUUID(), tracking: "trk_a2" };
  const siteB1 = { id: randomUUID(), tracking: "trk_b1" };
  const mkSite = (s: { id: string; tracking: string }, tenant: string, name: string) =>
    db
      .prepare("INSERT INTO websites(id,tenant_id,name,domain,tracking_id) VALUES (?,?,?,?,?)")
      .run(s.id, tenant, name, name + ".example", s.tracking);
  mkSite(siteA1, tenantA, "A1");
  mkSite(siteA2, tenantA, "A2");
  mkSite(siteB1, tenantB, "B1");

  const pw = hashPassword("pw");
  const mkUser = (email: string, role: string, sites: string[]) => {
    const id = randomUUID();
    db.prepare("INSERT INTO users(id,email,password_hash,name,role) VALUES (?,?,?,?,?)").run(
      id,
      email,
      pw,
      email,
      role,
    );
    for (const sid of sites)
      db.prepare("INSERT INTO user_website_access(user_id,website_id) VALUES (?,?)").run(id, sid);
    return id;
  };
  const admin = mkUser("admin@test.example", "super_admin", []);
  const staff = mkUser("staff@test.example", "staff", [siteA1.id, siteA2.id]);
  const customerA = mkUser("ca@test.example", "customer", [siteA1.id]);
  const customerB = mkUser("cb@test.example", "customer", [siteB1.id]);

  return {
    db,
    tenantA,
    tenantB,
    siteA1,
    siteA2,
    siteB1,
    users: { admin, staff, customerA, customerB },
  };
}

export function makeApp(db: Database.Database) {
  return createApp(db);
}
