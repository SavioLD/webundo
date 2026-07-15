import { randomUUID } from "node:crypto";
import { getDb } from "./index.js";
import { hashPassword } from "../lib/auth.js";

/**
 * Seed-Daten für eine lokale Demo. Legt zwei Mandanten mit Websites, Benutzer
 * aller Rollen, Conversion-Definitionen und ~14 Tage synthetische Events an –
 * inklusive einiger "aktiver" Besucher der letzten Minuten für die
 * Echtzeitansicht.
 *
 * Standard-Zugangsdaten (nur Demo!):
 *   Super Admin:  admin@webundo.de   / demo1234
 *   Mitarbeiter:  team@webundo.de    / demo1234
 *   Kunde A:      kunde@stadtwerke.de/ demo1234
 *   Kunde B:      kunde@muster.de    / demo1234
 */

const db = getDb();

function reset() {
  const tables = [
    "events",
    "sessions",
    "daily_aggregates",
    "hourly_aggregates",
    "conversion_definitions",
    "user_website_access",
    "users",
    "websites",
    "tenants",
    "privacy_salts",
  ];
  for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();
}

const PATHS = ["/", "/leistungen", "/beschaffung", "/optimierung", "/rechner", "/kontakt", "/referenzen"];
const REFERRERS = ["", "https://www.google.com/", "https://www.bing.com/", "https://www.linkedin.com/", "https://newsletter.example/"];
const DEVICES: Array<["desktop" | "mobile" | "tablet", string, string]> = [
  ["desktop", "Chrome", "Windows"],
  ["desktop", "Firefox", "macOS"],
  ["mobile", "Safari", "iOS"],
  ["mobile", "Chrome", "Android"],
  ["tablet", "Safari", "iOS"],
];
const COUNTRIES = ["DE", "AT", "CH", "DE", "DE", "FR"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function seed() {
  reset();

  // ── Mandanten ──────────────────────────────────────────────────────────────
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  db.prepare("INSERT INTO tenants(id, name, retention_days) VALUES (?,?,?)").run(
    tenantA,
    "Stadtwerke Musterstadt",
    180,
  );
  db.prepare("INSERT INTO tenants(id, name, retention_days) VALUES (?,?,?)").run(
    tenantB,
    "Muster Handels GmbH",
    90,
  );

  // ── Websites ───────────────────────────────────────────────────────────────
  const sites = [
    { id: randomUUID(), tenant: tenantA, name: "Stadtwerke Hauptseite", domain: "stadtwerke.example", tracking: "sw_main" },
    { id: randomUUID(), tenant: tenantA, name: "Stadtwerke Kampagne", domain: "aktion.stadtwerke.example", tracking: "sw_kampagne" },
    { id: randomUUID(), tenant: tenantB, name: "Muster Shop", domain: "muster.example", tracking: "muster_shop" },
  ];
  for (const s of sites) {
    db.prepare(
      "INSERT INTO websites(id, tenant_id, name, domain, tracking_id) VALUES (?,?,?,?,?)",
    ).run(s.id, s.tenant, s.name, s.domain, s.tracking);
    db.prepare(
      "INSERT INTO conversion_definitions(id, website_id, event_name, display_name) VALUES (?,?,?,?)",
    ).run(randomUUID(), s.id, "contact_form_submitted", "Kontaktformular gesendet");
    db.prepare(
      "INSERT INTO conversion_definitions(id, website_id, event_name, display_name) VALUES (?,?,?,?)",
    ).run(randomUUID(), s.id, "cta_clicked", "CTA geklickt");
  }

  // ── Benutzer & Zugriffe ────────────────────────────────────────────────────
  const pw = hashPassword("demo1234");
  const users = [
    { id: randomUUID(), email: "admin@webundo.de", name: "Super Admin", role: "super_admin", sites: [] as string[] },
    { id: randomUUID(), email: "team@webundo.de", name: "Interner Mitarbeiter", role: "staff", sites: [sites[0].id, sites[1].id] },
    { id: randomUUID(), email: "kunde@stadtwerke.de", name: "Kunde Stadtwerke", role: "customer", sites: [sites[0].id] },
    { id: randomUUID(), email: "kunde@muster.de", name: "Kunde Muster", role: "customer", sites: [sites[2].id] },
  ];
  for (const u of users) {
    db.prepare("INSERT INTO users(id, email, password_hash, name, role) VALUES (?,?,?,?,?)").run(
      u.id,
      u.email,
      pw,
      u.name,
      u.role,
    );
    for (const sid of u.sites)
      db.prepare("INSERT INTO user_website_access(user_id, website_id) VALUES (?,?)").run(u.id, sid);
  }

  // ── Synthetische Events (14 Tage) ─────────────────────────────────────────
  const insertSession = db.prepare(
    `INSERT INTO sessions(id, website_id, tenant_id, visitor_id, first_seen, last_seen,
        entry_path, exit_path, page_view_count, event_count, referrer, utm_source,
        device_type, browser, os, country)
     VALUES (@id,@website_id,@tenant_id,@visitor_id,@first_seen,@last_seen,
        @entry_path,@exit_path,@pv,@ev,@referrer,@utm,@device,@browser,@os,@country)`,
  );
  const insertEvent = db.prepare(
    `INSERT INTO events(id, website_id, tenant_id, session_id, visitor_id, event_name, event_type,
        page_url, page_path, page_title, referrer, properties, device_type, browser, os, country,
        client_ts, created_at)
     VALUES (@id,@website_id,@tenant_id,@session_id,@visitor_id,@event_name,@event_type,
        @page_url,@page_path,@page_title,@referrer,@properties,@device,@browser,@os,@country,
        @client_ts,@created_at)`,
  );

  const now = Date.now();
  const tx = db.transaction(() => {
    for (const s of sites) {
      const baseVisitors = s.tracking === "sw_main" ? 60 : s.tracking === "muster_shop" ? 40 : 15;
      for (let dayAgo = 13; dayAgo >= 0; dayAgo--) {
        const visitors = rand(Math.floor(baseVisitors * 0.6), baseVisitors);
        for (let v = 0; v < visitors; v++) {
          const [device, browser, os] = pick(DEVICES);
          const country = pick(COUNTRIES);
          const referrer = pick(REFERRERS);
          const visitorId = randomUUID().slice(0, 32);
          const sessionId = randomUUID();
          // Startzeitpunkt der Session an diesem Tag.
          const startMs = now - dayAgo * 86_400_000 - rand(0, 82_800_000);
          const pageViews = rand(1, 6);
          const durationSec = pageViews === 1 ? rand(2, 25) : rand(30, 600);
          const entry = pick(PATHS);
          let last = entry;

          const firstSeen = new Date(startMs).toISOString();
          const lastSeen = new Date(startMs + durationSec * 1000).toISOString();

          // Page-View-Events erzeugen.
          let eventCount = 0;
          for (let p = 0; p < pageViews; p++) {
            const path = p === 0 ? entry : pick(PATHS);
            last = path;
            const ts = new Date(startMs + (p / Math.max(1, pageViews)) * durationSec * 1000).toISOString();
            insertEvent.run({
              id: randomUUID(),
              website_id: s.id,
              tenant_id: s.tenant,
              session_id: sessionId,
              visitor_id: visitorId,
              event_name: "page_view",
              event_type: "page_view",
              page_url: `https://${s.domain}${path}`,
              page_path: path,
              page_title: `WEBUNDO ${path}`,
              referrer: p === 0 ? referrer : null,
              properties: null,
              device,
              browser,
              os,
              country,
              client_ts: ts,
              created_at: ts,
            });
            eventCount++;
          }

          // Gelegentlich Conversion, Fehler, Performance.
          if (Math.random() < 0.12) {
            insertEvent.run({
              id: randomUUID(), website_id: s.id, tenant_id: s.tenant, session_id: sessionId,
              visitor_id: visitorId, event_name: "contact_form_submitted", event_type: "conversion",
              page_url: `https://${s.domain}/kontakt`, page_path: "/kontakt", page_title: "Kontakt",
              referrer: null, properties: JSON.stringify({ form: "contact" }),
              device, browser, os, country, client_ts: lastSeen, created_at: lastSeen,
            });
            eventCount++;
          }
          if (Math.random() < 0.05) {
            insertEvent.run({
              id: randomUUID(), website_id: s.id, tenant_id: s.tenant, session_id: sessionId,
              visitor_id: visitorId, event_name: "js_error", event_type: "error",
              page_url: `https://${s.domain}${last}`, page_path: last, page_title: null,
              referrer: null, properties: JSON.stringify({ message: "TypeError: undefined is not a function" }),
              device, browser, os, country, client_ts: lastSeen, created_at: lastSeen,
            });
            eventCount++;
          }
          if (Math.random() < 0.4) {
            insertEvent.run({
              id: randomUUID(), website_id: s.id, tenant_id: s.tenant, session_id: sessionId,
              visitor_id: visitorId, event_name: "web_vitals", event_type: "performance",
              page_url: `https://${s.domain}${entry}`, page_path: entry, page_title: null,
              referrer: null,
              properties: JSON.stringify({
                lcp: rand(1200, 3800), cls: Math.round(Math.random() * 20) / 100,
                inp: rand(80, 400), ttfb: rand(120, 900),
              }),
              device, browser, os, country, client_ts: firstSeen, created_at: firstSeen,
            });
            eventCount++;
          }

          insertSession.run({
            id: sessionId, website_id: s.id, tenant_id: s.tenant, visitor_id: visitorId,
            first_seen: firstSeen, last_seen: lastSeen, entry_path: entry, exit_path: last,
            pv: pageViews, ev: eventCount, referrer: referrer || null,
            utm: null, device, browser, os, country,
          });
        }
      }

      // Ein paar "aktive" Besucher der letzten Minuten (für Realtime-Demo).
      const activeCount = rand(2, 8);
      for (let a = 0; a < activeCount; a++) {
        const [device, browser, os] = pick(DEVICES);
        const country = pick(COUNTRIES);
        const visitorId = randomUUID().slice(0, 32);
        const sessionId = randomUUID();
        const startMs = now - rand(10, 280) * 1000;
        const path = pick(PATHS);
        const ts = new Date(startMs).toISOString();
        insertEvent.run({
          id: randomUUID(), website_id: s.id, tenant_id: s.tenant, session_id: sessionId,
          visitor_id: visitorId, event_name: "page_view", event_type: "page_view",
          page_url: `https://${s.domain}${path}`, page_path: path, page_title: `WEBUNDO ${path}`,
          referrer: pick(REFERRERS) || null, properties: null,
          device, browser, os, country, client_ts: ts, created_at: ts,
        });
        insertSession.run({
          id: sessionId, website_id: s.id, tenant_id: s.tenant, visitor_id: visitorId,
          first_seen: ts, last_seen: ts, entry_path: path, exit_path: path,
          pv: 1, ev: 1, referrer: null, utm: null, device, browser, os, country,
        });
      }
    }
  });
  tx();

  const counts = {
    tenants: (db.prepare("SELECT COUNT(*) c FROM tenants").get() as { c: number }).c,
    websites: (db.prepare("SELECT COUNT(*) c FROM websites").get() as { c: number }).c,
    users: (db.prepare("SELECT COUNT(*) c FROM users").get() as { c: number }).c,
    sessions: (db.prepare("SELECT COUNT(*) c FROM sessions").get() as { c: number }).c,
    events: (db.prepare("SELECT COUNT(*) c FROM events").get() as { c: number }).c,
  };
  // eslint-disable-next-line no-console
  console.log("Seed abgeschlossen:", counts);
  console.log("Login: admin@webundo.de / demo1234 (Super Admin)");
}

seed();
