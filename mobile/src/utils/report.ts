import type { Department, WorkEntry } from "../types";

export type ReportDepartment = "ALL" | Department;

export type ReportDay = {
  id: string;
  date: string;
  title: string;
  dateLabel: string;
  shortDateLabel: string;
  isToday: boolean;
};

const REPORT_TIME_ZONE = "Asia/Kolkata";
const DAY_MS = 86_400_000;

const pad = (value: number) => String(value).padStart(2, "0");

function partsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
}

export function dateKeyInTimeZone(
  date: Date,
  timeZone: string = REPORT_TIME_ZONE,
): string {
  const parts = partsInTimeZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyToUtc(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function utcKey(epochMs: number): string {
  const date = new Date(epochMs);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function formatUtcDate(
  epochMs: number,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    ...options,
  }).format(new Date(epochMs));
}

export function getReportDays(count = 31): ReportDay[] {
  const todayKey = dateKeyInTimeZone(new Date());
  const todayMs = dateKeyToUtc(todayKey);

  return Array.from({ length: count }, (_, index) => {
    const epochMs = todayMs - index * DAY_MS;
    const date = utcKey(epochMs);
    const title =
      index === 0
        ? "Today"
        : index === 1
          ? "Yesterday"
          : `${index} days ago`;

    return {
      id: date,
      date,
      title,
      dateLabel: formatUtcDate(epochMs, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      shortDateLabel: formatUtcDate(epochMs, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      isToday: index === 0,
    };
  });
}

function csvCell(value: unknown): string {
  const original = value == null ? "" : String(value);
  const formulaSafe = /^[=+\-@]/.test(original) ? `'${original}` : original;
  const escaped = formulaSafe.replace(/"/g, '""');

  return /[",\r\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

const csvDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REPORT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const csvTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REPORT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function workEntriesToCsv(entries: WorkEntry[]): string {
  const rows = [...entries].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  const header = [
    "Date",
    "Time",
    "Entry ID",
    "Employee",
    "Department",
    "Operation",
    "Lot Number",
    "Quantity",
    "Manager",
  ];

  const lines = [header.map(csvCell).join(",")];

  for (const entry of rows) {
    const createdAt = new Date(entry.createdAt);
    lines.push(
      [
        csvDateFormatter.format(createdAt),
        csvTimeFormatter.format(createdAt),
        csvCell(entry.id),
        csvCell(entry.employeeName),
        csvCell(entry.department === "PETTICOAT" ? "Petticoat" : "RMG"),
        csvCell(entry.operationName),
        csvCell(entry.lotNo),
        String(entry.quantity),
        csvCell(entry.managerName),
      ].join(","),
    );
  }

  // A UTF-8 BOM helps Microsoft Excel detect the file's encoding.
  return `\uFEFF${lines.join("\r\n")}`;
}

export function reportFileName(
  day: Pick<ReportDay, "date">,
  department: ReportDepartment,
): string {
  const departmentPart =
    department === "ALL" ? "all" : department.toLowerCase();

  return `silai-saathi_${departmentPart}_${day.date}.csv`;
}

export function reportDepartmentLabel(department: ReportDepartment): string {
  if (department === "PETTICOAT") return "Petticoat";
  if (department === "RMG") return "RMG";
  return "All sections";
}

export function reportSummary(entries: WorkEntry[]): {
  entries: number;
  pieces: number;
} {
  return {
    entries: entries.length,
    pieces: entries.reduce((sum, entry) => sum + entry.quantity, 0),
  };
}
