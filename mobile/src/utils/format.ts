import type { Department } from "../types";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function departmentLabel(department: Department | null): string {
  return department ? "Petticoat" : "Admin";
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDate(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const includeYear = date.getFullYear() !== now.getFullYear();
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(includeYear ? { year: "numeric" } : {}),
  });
}

export function formatDateTime(value: string): string {
  return `${formatDate(value)}, ${formatTime(value)}`;
}

export function isToday(value: string): boolean {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

export function isWithinDays(value: string, days: number): boolean {
  return Date.now() - new Date(value).getTime() <= days * 24 * 60 * 60 * 1000;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}
