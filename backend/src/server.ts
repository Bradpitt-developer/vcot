import * as os from "node:os";

import app from "./app";
import { config } from "./config";
import { pool } from "./db";

function localAddresses(): string[] {
  const addresses: string[] = [];
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) {
        addresses.push(entry.address);
      }
    }
  }
  return addresses;
}

async function start(): Promise<void> {
  await pool.query("SELECT 1");
  console.log("Database connected.");

  const server = app.listen(config.port, config.host, () => {
    if (config.isProduction) {
      console.log(`Silai Saathi API listening on port ${config.port}.`);
      return;
    }

    console.log(`Silai Saathi API listening on http://localhost:${config.port}`);
    for (const address of localAddresses()) {
      console.log(`Phone on the same Wi-Fi: http://${address}:${config.port}`);
    }
  });

  let shuttingDown = false;

  function shutdown(signal: NodeJS.Signals): void {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`${signal} received. Closing server...`);

    server.close(() => {
      void (async () => {
        await pool.end().catch(() => {});
        process.exit(0);
      })();
    });
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch(async (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Could not start the API:", message);
  console.error(
    "Check DATABASE_URL, your Supabase database status and network access.",
  );
  await pool.end().catch(() => {});
  process.exit(1);
});
