import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "./index.js";

/**
 * Provisioniert reale Kundenwebsites aus config/websites.json in die Datenbank.
 *
 * Idempotent: Mandanten werden per Name, Websites per tracking_id ge-upsertet.
 * Es werden KEINE Analytics-Daten gelöscht – dieses Skript verwaltet nur die
 * Stammdaten (Mandanten/Websites) und ist beliebig oft ausführbar.
 *
 *   npx tsx src/db/provision.ts     bzw.     npm run provision
 */

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Entry {
  tracking_id: string;
  tenant: string;
  name: string;
  domain?: string;
  repo?: string;
}

const configPath = resolve(__dirname, "../../config/websites.json");
const { websites } = JSON.parse(readFileSync(configPath, "utf8")) as { websites: Entry[] };

const db = getDb();

const findTenant = db.prepare("SELECT id FROM tenants WHERE name = ?");
const insertTenant = db.prepare("INSERT INTO tenants(id, name, retention_days) VALUES (?,?,?)");
const findWebsite = db.prepare("SELECT id, tenant_id FROM websites WHERE tracking_id = ?");
const insertWebsite = db.prepare(
  "INSERT INTO websites(id, tenant_id, name, domain, tracking_id) VALUES (?,?,?,?,?)",
);
const updateWebsite = db.prepare(
  "UPDATE websites SET tenant_id = ?, name = ?, domain = ? WHERE tracking_id = ?",
);

let created = 0;
let updated = 0;
let tenantsCreated = 0;

const tx = db.transaction(() => {
  for (const e of websites) {
    // Mandant sicherstellen.
    let tenant = findTenant.get(e.tenant) as { id: string } | undefined;
    if (!tenant) {
      const id = randomUUID();
      insertTenant.run(id, e.tenant, 180);
      tenant = { id };
      tenantsCreated++;
    }

    // Website upserten (idempotent per tracking_id).
    const existing = findWebsite.get(e.tracking_id) as { id: string } | undefined;
    if (existing) {
      updateWebsite.run(tenant.id, e.name, e.domain ?? "", e.tracking_id);
      updated++;
    } else {
      insertWebsite.run(randomUUID(), tenant.id, e.name, e.domain ?? "", e.tracking_id);
      created++;
    }
  }
});
tx();

const totalWebsites = (db.prepare("SELECT COUNT(*) c FROM websites").get() as { c: number }).c;
const totalTenants = (db.prepare("SELECT COUNT(*) c FROM tenants").get() as { c: number }).c;

// eslint-disable-next-line no-console
console.log(
  `Provisionierung abgeschlossen: ${created} Websites neu, ${updated} aktualisiert, ` +
    `${tenantsCreated} Mandanten neu. Gesamt: ${totalWebsites} Websites / ${totalTenants} Mandanten.`,
);
