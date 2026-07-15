import { getDb } from "./index.js";
import { rollupDaily } from "../services/rollup.js";
import { applyRetention } from "../services/privacy.js";

/**
 * Wartungslauf für den Cron-Betrieb: verdichtet Tages-Aggregate und wendet die
 * Aufbewahrungsfristen an (löscht abgelaufene Rohdaten).
 *
 * Beispiel-Cron (nächtlich):  0 3 * * *  cd /app && npm run migrate && node dist/db/maintenance.js
 * Lokal:                      npx tsx src/db/maintenance.ts
 */
const db = getDb();
const rolled = rollupDaily(db);
const deleted = applyRetention(db);
// eslint-disable-next-line no-console
console.log(`Wartung: ${rolled} Tages-Aggregate aktualisiert, ${deleted} abgelaufene Datensätze gelöscht.`);
