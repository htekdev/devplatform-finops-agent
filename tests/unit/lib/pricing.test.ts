import { describe, it, expect } from "vitest";
import { getPricing, isPricingStale } from "../../../src/lib/pricing.js";

describe("Pricing", () => {
  it("should return default pricing configuration", () => {
    const pricing = getPricing();
    
    expect(pricing.github.actions.UBUNTU).toBe(0.008);
    expect(pricing.github.actions.WINDOWS).toBe(0.016);
    expect(pricing.github.actions.MACOS).toBe(0.08);
    expect(pricing.azureDevOps.licenses.basic).toBe(6);
  });

  it("should detect stale pricing", () => {
    const oldDate = new Date("2020-01-01");
    expect(isPricingStale(oldDate, 30)).toBe(true);
    
    const recentDate = new Date();
    expect(isPricingStale(recentDate, 30)).toBe(false);
  });
});
