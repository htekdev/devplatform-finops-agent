/**
 * Pricing Data Loader
 * 
 * Loads pricing data from configuration files with staleness detection.
 * Falls back to bundled default pricing if custom pricing not provided.
 */

import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { PricingData } from "../../models/pricing-data.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load pricing data from config path or default
 */
export async function loadPricingData(customPath?: string): Promise<PricingData> {
  let pricingData: PricingData;

  if (customPath && existsSync(customPath)) {
    const content = await readFile(customPath, "utf-8");
    pricingData = JSON.parse(content);
  } else {
    // Load default pricing from config directory
    const defaultPath = join(__dirname, "../../../config/pricing.default.json");
    const content = await readFile(defaultPath, "utf-8");
    pricingData = JSON.parse(content);
  }

  return pricingData;
}

/**
 * Check if pricing data is stale (>30 days old)
 */
export function checkPricingStaleness(pricingData: PricingData): {
  isStale: boolean;
  daysOld: number;
} {
  const lastUpdated = new Date(pricingData.lastUpdated);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    isStale: daysOld > 30,
    daysOld,
  };
}

/**
 * Get pricing with staleness warning
 */
export async function getPricingWithWarnings(
  customPath?: string
): Promise<{
  pricing: PricingData;
  warnings: Array<{ level: "warning"; code: string; message: string }>;
}> {
  const pricing = await loadPricingData(customPath);
  const warnings: Array<{ level: "warning"; code: string; message: string }> = [];

  const staleness = checkPricingStaleness(pricing);
  if (staleness.isStale) {
    warnings.push({
      level: "warning",
      code: "PRICING_STALE",
      message: `Pricing data is ${staleness.daysOld} days old. Consider updating pricing.json for accuracy.`,
    });
  }

  return { pricing, warnings };
}
