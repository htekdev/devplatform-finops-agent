/**
 * GitHub LFS (Shared Storage) Billing Data Fetcher
 * Fetches and processes LFS storage usage data
 */

import type { GitHubLFSData } from '../../types/state';
import type { GitHubClient } from '../../clients/github-client';
import { getLogger } from '../../utils/logger';

/**
 * GitHub storage pricing (as of 2024)
 * First 0.5 GB included, then $0.07 per GB
 */
const STORAGE_PRICE_PER_GB = 0.07;
const INCLUDED_STORAGE_GB = 0.5;

/**
 * Fetch LFS billing data for an organization
 */
export async function fetchLFSBilling(
  client: GitHubClient,
  org: string
): Promise<GitHubLFSData> {
  const logger = getLogger();
  logger.info(`Fetching LFS billing for org: ${org}`);

  try {
    const billing = await client.getStorageBilling(org);

    // Calculate estimated monthly cost
    const paidStorageGB = Math.max(0, billing.estimated_paid_storage_for_month);
    const estimatedMonthlyCost = paidStorageGB * STORAGE_PRICE_PER_GB;

    logger.debug(
      `LFS for ${org}: ${billing.estimated_storage_for_month} GB total, ${paidStorageGB} GB paid`
    );

    return {
      organization: org,
      storageGB: billing.estimated_storage_for_month,
      bandwidthGB: 0, // Bandwidth not available in current API
      estimatedMonthlyCost,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to fetch LFS billing for ${org}:`, error);
    throw new Error(`Failed to fetch LFS billing for ${org}: ${String(error)}`);
  }
}

/**
 * Analyze LFS usage and provide recommendations
 */
export function analyzeLFSUsage(data: GitHubLFSData): {
  concerns: string[];
  recommendations: string[];
} {
  const concerns: string[] = [];
  const recommendations: string[] = [];

  // Check for high storage usage
  if (data.storageGB > 10) {
    concerns.push(`High LFS storage usage: ${data.storageGB.toFixed(2)} GB`);

    if (data.storageGB > 50) {
      recommendations.push(
        'Consider implementing LFS storage cleanup policies or moving large assets to external storage (e.g., S3).'
      );
    }
  }

  // Check for significant costs
  if (data.estimatedMonthlyCost > 5) {
    concerns.push(
      `LFS storage costs: $${data.estimatedMonthlyCost.toFixed(2)}/month`
    );

    recommendations.push(
      'Review LFS usage patterns. Large binary files in Git can be expensive. Consider alternatives for storing build artifacts or media files.'
    );
  }

  // General recommendation if using LFS
  if (data.storageGB > INCLUDED_STORAGE_GB) {
    recommendations.push(
      `Using ${(data.storageGB - INCLUDED_STORAGE_GB).toFixed(2)} GB beyond free tier. Audit repositories for unnecessary large files.`
    );
  }

  return { concerns, recommendations };
}

/**
 * Project future LFS costs based on current usage
 */
export function projectLFSCosts(
  data: GitHubLFSData,
  months: number = 3
): Array<{ month: number; projectedGB: number; projectedCost: number }> {
  // Simple linear projection (could be enhanced with historical data)
  const currentPaidGB = Math.max(0, data.storageGB - INCLUDED_STORAGE_GB);
  const projections: Array<{ month: number; projectedGB: number; projectedCost: number }> = [];

  // Assume 5% monthly growth (conservative estimate)
  const monthlyGrowthRate = 1.05;

  for (let month = 1; month <= months; month++) {
    const projectedGB = currentPaidGB * Math.pow(monthlyGrowthRate, month);
    const projectedCost = projectedGB * STORAGE_PRICE_PER_GB;

    projections.push({
      month,
      projectedGB: Math.round(projectedGB * 100) / 100,
      projectedCost: Math.round(projectedCost * 100) / 100,
    });
  }

  return projections;
}
