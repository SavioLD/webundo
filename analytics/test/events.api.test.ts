import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { makeFixture, makeApp, type Fixture } from "./helpers.js";
import { createRateLimiter } from "../src/lib/rateLimit.js";

function evt(trackingId: string, over: Record<string, unknown> = {}) {
  return {
    eventId: randomUUID(),
    websiteId: trackingId,
    sessionId: randomUUID(),
    eventName: "page_view",
    eventType: "page_view",
    pageUrl: "https://a1.example/",
    pagePath: "/",
    timestamp: new Date().toISOString(),
    ...over,
  };
}

describe("POST /api/analytics/events", () => {
  let fx: Fixture;
  let app: ReturnType<typeof makeApp>;
  beforeEach(() => {
    fx = makeFixture();
    app = makeApp(fx.db);
  });

  it("nimmt ein gültiges Event an und speichert es", async () => {
    const res = await request(app).post("/api/analytics/events").send(evt(fx.siteA1.tracking));
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(1);
    const count = fx.db.prepare("SELECT COUNT(*) c FROM events WHERE website_id=?").get(fx.siteA1.id) as { c: number };
    expect(count.c).toBe(1);
  });

  it("leitet serverseitig eine visitor_id ab und speichert KEINE IP", async () => {
    await request(app).post("/api/analytics/events").send(evt(fx.siteA1.tracking));
    const row = fx.db.prepare("SELECT visitor_id, properties FROM events LIMIT 1").get() as {
      visitor_id: string;
      properties: string | null;
    };
    expect(row.visitor_id).toMatch(/^[a-f0-9]{32}$/);
    // Kein IP-Feld im Schema -> per Design nicht speicherbar.
    const cols = fx.db.prepare("PRAGMA table_info(events)").all() as { name: string }[];
    expect(cols.map((c) => c.name)).not.toContain("ip");
  });

  it("verwirft unbekannte tracking_id ohne zu speichern (202, kein Leak)", async () => {
    const res = await request(app).post("/api/analytics/events").send(evt("unbekannt_xyz"));
    expect(res.status).toBe(202);
    const count = fx.db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number };
    expect(count.c).toBe(0);
  });

  it("lehnt ungültige Payloads mit 400 ab", async () => {
    const res = await request(app)
      .post("/api/analytics/events")
      .send({ websiteId: fx.siteA1.tracking, eventType: "nonsense" });
    expect(res.status).toBe(400);
  });

  it("verarbeitet gebündelte Events (Batch)", async () => {
    const sessionId = randomUUID();
    const batch = [
      evt(fx.siteA1.tracking, { sessionId, pagePath: "/" }),
      evt(fx.siteA1.tracking, { sessionId, pagePath: "/kontakt" }),
    ];
    const res = await request(app).post("/api/analytics/events").send(batch);
    expect(res.status).toBe(202);
    expect(res.body.accepted).toBe(2);
    const sess = fx.db.prepare("SELECT page_view_count, exit_path FROM sessions WHERE id=?").get(sessionId) as {
      page_view_count: number;
      exit_path: string;
    };
    expect(sess.page_view_count).toBe(2);
    expect(sess.exit_path).toBe("/kontakt");
  });

  it("respektiert Do-Not-Track (202, nichts gespeichert)", async () => {
    const res = await request(app)
      .post("/api/analytics/events")
      .set("DNT", "1")
      .send(evt(fx.siteA1.tracking));
    expect(res.status).toBe(202);
    const count = fx.db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number };
    expect(count.c).toBe(0);
  });

  it("ignoriert Bot-User-Agents", async () => {
    const res = await request(app)
      .post("/api/analytics/events")
      .set("User-Agent", "Googlebot/2.1 (+http://www.google.com/bot.html)")
      .send(evt(fx.siteA1.tracking));
    expect(res.status).toBe(202);
    const count = fx.db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number };
    expect(count.c).toBe(0);
  });

  it("ist idempotent bei doppelter eventId", async () => {
    const e = evt(fx.siteA1.tracking);
    await request(app).post("/api/analytics/events").send(e);
    await request(app).post("/api/analytics/events").send(e);
    const count = fx.db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number };
    expect(count.c).toBe(1);
  });
});

describe("Rate-Limiter", () => {
  it("blockt nach Überschreiten des Limits", () => {
    const rl = createRateLimiter(3, 60_000);
    expect(rl.check("ip").allowed).toBe(true);
    expect(rl.check("ip").allowed).toBe(true);
    expect(rl.check("ip").allowed).toBe(true);
    expect(rl.check("ip").allowed).toBe(false);
    // Anderer Schlüssel bleibt unberührt.
    expect(rl.check("other").allowed).toBe(true);
  });
});
