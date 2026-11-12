import type { Department } from "../types";
import { DEPARTMENTS } from "../types";

export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDepartment(value: unknown): value is Department {
  return (
    typeof value === "string" &&
    (DEPARTMENTS as readonly string[]).includes(value)
  );
}

export function normalizeDepartment(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

export function normalizeUsername(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function cleanText(value: unknown): string {
  return String(value || "").trim();
}

export function isUuid(value: unknown): value is string {
  return UUID_PATTERN.test(String(value || ""));
}

export function parseLimit(
  value: unknown,
  fallback = 100,
  max = 200,
): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
