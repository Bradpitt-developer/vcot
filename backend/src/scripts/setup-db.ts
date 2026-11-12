import fs from "node:fs";
import path from "node:path";

import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { Pool, type PoolConfig } from "pg";

import type { Department } from "../types";

const backendRoot = path.join(__dirname, "..", "..");
loadEnv({ path: path.join(backendRoot, ".env"), quiet: true });

const ADMIN_USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const DEFAULT_OPERATIONS: Record<Department, readonly string[]> = {
  PETTICOAT: [
    "Kamarpatti",
    "Interlock",
    "Bottom",
    "Dhoka",
    "Folding",
    "Dori",
    "Nada",
  ],
  RMG: [
    "Kamarpatti",
    "Interlock",
    "Bottom",
    "Dhoka",
    "Folding",
    "Dori",
    "Nada",
  ],
};

const RETIRED_STARTER_OPERATIONS: readonly string[] = [
  "Cutting",
  "Stitching",
  "Elastic fitting",
  "Finishing",
  "Packing",
  "Checking",
  "Ironing",
];

function fail(message: string): never {
  console.error(`Database setup failed: ${message}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail("DATABASE_URL is missing. Create backend/.env from .env.example.");
}

const useSsl = process.env.DATABASE_SSL !== "false";
const strictSsl = process.env.DATABASE_SSL_STRICT === "true";
const ssl: PoolConfig["ssl"] = useSsl
  ? {
      rejectUnauthorized: strictSsl,
      ...(process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA } : {}),
    }
  : false;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl,
  max: 2,
  connectionTimeoutMillis: 15_000,
});

async function setup(): Promise<void> {
  const schemaPath = path.join(backendRoot, "supabase", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");

  console.log("Applying database schema...");
  await pool.query(schema);

  const adminUsername = (process.env.ADMIN_USERNAME || "admin")
    .trim()
    .toLowerCase();
  const adminName = (process.env.ADMIN_NAME || "Administrator").trim();
  const usingDefaultPassword = !process.env.ADMIN_PASSWORD;
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin@123";

  if (!ADMIN_USERNAME_PATTERN.test(adminUsername)) {
    fail(
      "ADMIN_USERNAME must be 3-32 lowercase letters, numbers, dots, dashes or underscores.",
    );
  }
  if (adminPassword.length < 8 || adminPassword.length > 72) {
    fail("ADMIN_PASSWORD must be between 8 and 72 characters.");
  }

  const existingAdmin = await pool.query<{ id: string; username: string }>(
    "SELECT id, username FROM staff_users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1",
  );

  const admin = existingAdmin.rows[0];
  if (!admin) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO staff_users (name, username, password_hash, role, department)
       VALUES ($1, $2, $3, 'admin', NULL)`,
      [adminName, adminUsername, hash],
    );
    console.log(`Admin created: ${adminUsername}`);
    if (usingDefaultPassword) {
      console.warn(
        "WARNING: The default admin password is Admin@123. Change it before production use.",
      );
    }
  } else if (process.env.RESET_ADMIN_PASSWORD === "true") {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      "UPDATE staff_users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
      [hash, admin.id],
    );
    console.log(`Password reset for existing admin: ${admin.username}`);
  } else {
    console.log(
      `Admin already exists (${admin.username}); password left unchanged.`,
    );
  }

  let operationsAdded = 0;
  for (const department of Object.keys(DEFAULT_OPERATIONS) as Department[]) {
    for (const name of DEFAULT_OPERATIONS[department]) {
      const result = await pool.query(
        `INSERT INTO operations (name, department)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM operations
           WHERE department = $2 AND lower(name) = lower($1)
         )`,
        [name, department],
      );
      operationsAdded += result.rowCount ?? 0;
    }
  }
  console.log(`Starter operations added: ${operationsAdded}`);

  const retired = await pool.query(
    `UPDATE operations
     SET is_active = false
     WHERE department = ANY($1::text[])
       AND name = ANY($2::text[])
       AND is_active = true`,
    [Object.keys(DEFAULT_OPERATIONS), RETIRED_STARTER_OPERATIONS],
  );
  if ((retired.rowCount ?? 0) > 0) {
    console.log(
      `Previous starter operations disabled: ${retired.rowCount ?? 0}`,
    );
  }

  console.log("Database setup complete.");
}

setup()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
