import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { makeFixture, makeApp, type Fixture } from "./helpers.js";
import { accessibleWebsiteIds, canAccessWebsite } from "../src/lib/auth.js";
import type { AuthUser } from "../src/types.js";

/** Fügt eine einfache Session direkt ein (für Sichtbarkeitstests). */
function seedSession(fx: Fixture, siteId: string, tenantId: string) {
  const now = new Date().toISOString();
  fx.db
    .prepare(
      `INSERT INTO sessions(id,website_id,tenant_id,visitor_id,first_seen,last_seen,
         entry_path,exit_path,page_view_count,event_count)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(randomUUID(), siteId, tenantId, randomUUID().slice(0, 32), now, now, "/", "/", 2, 2);
}

async function login(app: ReturnType<typeof makeApp>, email: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password: "pw" });
  expect(res.status).toBe(200);
  return agent;
}

describe("Zugriffs-Helfer (Einheit)", () => {
  let fx: Fixture;
  beforeEach(() => (fx = makeFixture()));

  it("super_admin sieht alle Websites", () => {
    const u: AuthUser = { id: fx.users.admin, email: "a", name: "a", role: "super_admin" };
    expect(accessibleWebsiteIds(fx.db, u).sort()).toEqual([fx.siteA1.id, fx.siteA2.id, fx.siteB1.id].sort());
  });

  it("staff sieht nur zugewiesene Websites", () => {
    const u: AuthUser = { id: fx.users.staff, email: "s", name: "s", role: "staff" };
    expect(accessibleWebsiteIds(fx.db, u).sort()).toEqual([fx.siteA1.id, fx.siteA2.id].sort());
  });

  it("customer sieht ausschließlich die eigene Website", () => {
    const u: AuthUser = { id: fx.users.customerB, email: "c", name: "c", role: "customer" };
    expect(accessibleWebsiteIds(fx.db, u)).toEqual([fx.siteB1.id]);
    expect(canAccessWebsite(fx.db, u, fx.siteB1.id)).toBe(true);
    expect(canAccessWebsite(fx.db, u, fx.siteA1.id)).toBe(false);
  });
});

describe("Mandantentrennung über die API", () => {
  let fx: Fixture;
  let app: ReturnType<typeof makeApp>;
  beforeEach(() => {
    fx = makeFixture();
    app = makeApp(fx.db);
    seedSession(fx, fx.siteA1.id, fx.tenantA);
    seedSession(fx, fx.siteB1.id, fx.tenantB);
  });

  it("verlangt Authentifizierung", async () => {
    const res = await request(app).get("/api/analytics/overview");
    expect(res.status).toBe(401);
  });

  it("Kunde B sieht in /websites nur die eigene Website", async () => {
    const agent = await login(app, "cb@test.example");
    const res = await agent.get("/api/analytics/websites");
    expect(res.status).toBe(200);
    expect(res.body.websites).toHaveLength(1);
    expect(res.body.websites[0].id).toBe(fx.siteB1.id);
  });

  it("Kunde B erhält 403 beim Zugriff auf die Website von Mandant A", async () => {
    const agent = await login(app, "cb@test.example");
    const res = await agent.get("/api/analytics/overview?websiteId=" + fx.siteA1.id);
    expect(res.status).toBe(403);
  });

  it("Kunde A sieht nur eigene Daten (kein Datenübergriff)", async () => {
    const agent = await login(app, "ca@test.example");
    // Ohne Filter: aggregiert nur über sichtbare Websites (A1) -> 1 Session.
    const res = await agent.get("/api/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body.sessions).toBe(1);
  });

  it("super_admin sieht websiteübergreifend aggregierte Daten", async () => {
    const agent = await login(app, "admin@test.example");
    const res = await agent.get("/api/analytics/overview");
    expect(res.status).toBe(200);
    expect(res.body.sessions).toBe(2); // A1 + B1
  });

  it("Kunde kann Website-Daten von Mandant A nicht löschen", async () => {
    const agent = await login(app, "cb@test.example");
    const res = await agent.delete("/api/privacy/websites/" + fx.siteA1.id + "/data");
    expect(res.status).toBe(403);
  });
});
