import path from "node:path";

import { config as loadEnv } from "dotenv";
import type { SignOptions } from "jsonwebtoken";

loadEnv({ path: path.join(__dirname, "..", ".env"), quiet: true });

function fail(message: string): never {
  console.error(`Configuration error: ${message}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail("DATABASE_URL is missing. Copy .env.example to .env.");
}

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  fail("JWT_SECRET is missing. Copy .env.example to .env.");
}

if (jwtSecret.length < 32) {
  fail("JWT_SECRET must be at least 32 characters long.");
}

const isProduction = process.env.NODE_ENV === "production";
const databaseSsl = process.env.DATABASE_SSL !== "false";
const strictSsl = process.env.DATABASE_SSL_STRICT === "true";

export const config = {
  isProduction,
  host: process.env.HOST || "0.0.0.0",
  port: Number(process.env.PORT) || 4000,
  databaseUrl,
  databaseSsl,
  strictSsl,
  databaseCa: process.env.DATABASE_CA,
  jwtSecret,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ||
    "7d") as NonNullable<SignOptions["expiresIn"]>,
  corsOrigin: process.env.CORS_ORIGIN || "*",
  appTimezone: "Asia/Kolkata",
} as const;

if (isProduction && databaseSsl && !strictSsl) {
  console.warn(
    "Warning: database SSL is encrypted but the server certificate is not verified. Set DATABASE_SSL_STRICT=true with DATABASE_CA for strict verification.",
  );
}

if (isProduction && config.corsOrigin === "*") {
  console.warn("Warning: CORS_ORIGIN is set to * in production.");
}
