import { Pool, type PoolConfig } from "pg";

import { config } from "./config";

const ssl: PoolConfig["ssl"] = config.databaseSsl
  ? {
      rejectUnauthorized: config.strictSsl,
      ...(config.databaseCa ? { ca: config.databaseCa } : {}),
    }
  : false;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  application_name: "silai-saathi-api",
});

pool.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});
