/**
 * Pricing data loader and utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PricingData } from '../types/pricing';
import { DEFAULT_PRICING } from '../types/pricing';
import { getLogger } from './logger';

/**
 * Load pricing data from config file or use defaults
 */
export function loadPricing(configPath?: string): PricingData {
  const logger = getLogger();

  // Try to load from config file
  if (configPath) {
    try {
      const absolutePath = path.resolve(configPath);
      if (fs.existsSync(absolutePath)) {
        const content = fs.readFileSync(absolutePath, 'utf-8');
        const pricing = JSON.parse(content) as PricingData;
        logger.info(`Loaded pricing from config: ${absolutePath}`);
        return {
          ...pricing,
          source: 'config',
        };
      } else {
        logger.warn(`Pricing config file not found: ${absolutePath}`);
      }
    } catch (error) {
      logger.error(`Failed to load pricing config: ${configPath}`, error);
    }
  }

  // Check if defaults are old (>90 days)
  const lastUpdated = new Date(DEFAULT_PRICING.lastUpdated);
  const now = new Date();
  const daysSinceUpdate = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceUpdate > 90) {
    logger.warn(
      `Using hardcoded pricing defaults that are ${daysSinceUpdate} days old. Consider updating pricing data or providing a pricing config file.`
    );
  } else {
    logger.debug('Using default pricing data');
  }

  return DEFAULT_PRICING;
}

/**
 * Global pricing instance
 */
let globalPricing: PricingData | null = null;

/**
 * Initialize pricing
 */
export function initPricing(configPath?: string): PricingData {
  globalPricing = loadPricing(configPath);
  return globalPricing;
}

/**
 * Get pricing data
 */
export function getPricing(): PricingData {
  if (!globalPricing) {
    globalPricing = DEFAULT_PRICING;
  }
  return globalPricing;
}

/**
 * Calculate cost with free tier consideration
 */
export function calculateCostWithFreeTier(
  usage: number,
  freeTier: number,
  pricePerUnit: number
): {
  totalCost: number;
  freeUsage: number;
  paidUsage: number;
} {
  const paidUsage = Math.max(0, usage - freeTier);
  const freeUsage = Math.min(usage, freeTier);
  const totalCost = paidUsage * pricePerUnit;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    freeUsage,
    paidUsage,
  };
}
