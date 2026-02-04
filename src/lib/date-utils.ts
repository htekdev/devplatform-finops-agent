/**
 * Date utilities for 90-day period calculations
 */

export function get90DayPeriod(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  return { start, end };
}

export function get30DayPeriod(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { start, end };
}

export function get60DayPeriod(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 60);
  return { start, end };
}

export function formatDateISO(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function daysBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isWithinDays(date: Date, days: number): boolean {
  const now = new Date();
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - days);
  return date >= threshold;
}
