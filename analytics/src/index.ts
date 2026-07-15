import { createApp } from "./app.js";
import { getDb } from "./db/index.js";
import { config, assertProdSecrets } from "./config.js";

/** Server-Einstiegspunkt. */
function main(): void {
  assertProdSecrets();
  const db = getDb();
  const app = createApp(db);

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `WEBUNDO Analytics läuft auf http://localhost:${config.port} (env=${config.nodeEnv})`,
    );
    console.log(`  Dashboard:   http://localhost:${config.port}/`);
    console.log(`  Tracker:     http://localhost:${config.port}/tracker.js`);
    console.log(`  Event-API:   POST http://localhost:${config.port}/api/analytics/events`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main();
