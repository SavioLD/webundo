import { getDb } from "./index.js";
import { config } from "../config.js";

/** Wendet das Schema an (idempotent) und beendet sich. */
getDb();
// eslint-disable-next-line no-console
console.log(`Migration angewendet auf ${config.databasePath}`);
