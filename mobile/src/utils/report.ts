import type { Department } from "../types";

export type ReportDepartment = "ALL" | Department;

export type ReportRange = {
  from: string;
  to: string;
  dateLabel: string;
};

const REPORT_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 86_400_000;

function dateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
}

export function dateKeyInTimeZone(date: Date): string {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtc(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcKey(epochMs: number): string {
  const date = new Date(epochMs);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function getCombinedReportRange(): ReportRange {
  const today = dateKeyInTimeZone(new Date());
  const from = utcKey(dateKeyToUtc(today) - 30 * DAY_MS);

  return {
    from,
    to: today,
    dateLabel: `${formatDisplayDate(from)} – ${formatDisplayDate(today)}`,
  };
}

export function formatDisplayDate(key: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateKeyToUtc(key)));
}

export function parseDisplayDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;

  const [, rawDay, rawMonth, rawYear] = match;
  const day = Number(rawDay);
  const month = Number(rawMonth);
  const year = Number(rawYear);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return iso;
}

export function calculateRangeInclusiveDays(from: string, to: string): number {
  return Math.round((dateKeyToUtc(to) - dateKeyToUtc(from)) / DAY_MS) + 1;
}

export function reportDepartmentLabel(department: ReportDepartment): string {
  if (department === "PETTICOAT") return "Petticoat";
  if (department === "RMG") return "RMG";
  return "All sections";
}
