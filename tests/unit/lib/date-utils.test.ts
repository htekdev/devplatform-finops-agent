import { describe, it, expect } from "vitest";
import { get90DayPeriod, daysBetween, formatDateISO } from "../../../src/lib/date-utils.js";

describe("Date Utils", () => {
  it("should calculate 90-day period", () => {
    const { start, end } = get90DayPeriod();
    const days = daysBetween(start, end);
    
    expect(days).toBeGreaterThanOrEqual(89);
    expect(days).toBeLessThanOrEqual(91);
  });

  it("should format dates as ISO strings", () => {
    const date = new Date("2026-02-04T16:00:00Z");
    const formatted = formatDateISO(date);
    
    expect(formatted).toBe("2026-02-04");
  });

  it("should calculate days between dates", () => {
    const start = new Date("2026-01-01");
    const end = new Date("2026-01-11");
    const days = daysBetween(start, end);
    
    expect(days).toBe(10);
  });
});
