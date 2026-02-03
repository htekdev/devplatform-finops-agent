/**
 * GitHub Codespaces Billing Data Fetcher
 * Fetches and processes Codespaces usage data
 */

import type { GitHubCodespacesData } from '../../types/state';
import type { GitHubClient } from '../../clients/github-client';
import { getLogger } from '../../utils/logger';

/**
 * Machine type pricing per hour (approximate as of 2024)
 */
const MACHINE_PRICING: Record<string, number> = {
  basicLinux: 0.18,
  standardLinux: 0.36,
  premiumLinux: 0.72,
  basicLinux32gb: 0.54,
};

/**
 * Fetch Codespaces billing data for an organization
 */
export async function fetchCodespacesBilling(
  client: GitHubClient,
  org: string
): Promise<GitHubCodespacesData> {
  const logger = getLogger();
  logger.info(`Fetching Codespaces billing for org: ${org}`);

  try {
    // Get billing summary
    const billing = await client.getCodespacesBilling(org);

    // Get list of codespaces
    const codespaces = await client.listCodespaces(org);

    logger.debug(`Found ${codespaces.length} codespaces for ${org}`);

    // Calculate hours by machine type
    const hoursByMachineType: Record<string, number> = {};
    const activeCodespaces: Array<{
      owner: string;
      machineType: string;
      lastUsed: string;
      hoursUsed: number;
    }> = [];

    const idleCodespaces: Array<{
      owner: string;
      machineType: string;
      lastUsed: string;
      daysIdle: number;
    }> = [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const codespace of codespaces) {
      // Skip if machine info is missing
      if (!codespace.machine) {
        continue;
      }

      const machineType = codespace.machine.name || 'unknown';

      // Track machine type usage
      if (!hoursByMachineType[machineType]) {
        hoursByMachineType[machineType] = 0;
      }

      // Calculate hours used (approximate from creation to last use)
      const createdAt = new Date(codespace.created_at);
      const lastUsedAt = new Date(codespace.last_used_at);
      const hoursUsed = (lastUsedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      hoursByMachineType[machineType] += hoursUsed;

      // Check if idle
      const lastUsedDate = new Date(codespace.last_used_at);
      const daysIdle = (now.getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (lastUsedDate < sevenDaysAgo) {
        idleCodespaces.push({
          owner: codespace.owner.login,
          machineType: codespace.machine.display_name || machineType,
          lastUsed: codespace.last_used_at,
          daysIdle: Math.floor(daysIdle),
        });
      } else {
        activeCodespaces.push({
          owner: codespace.owner.login,
          machineType: codespace.machine.display_name || machineType,
          lastUsed: codespace.last_used_at,
          hoursUsed: Math.round(hoursUsed * 10) / 10,
        });
      }
    }

    logger.info(
      `Codespaces for ${org}: ${activeCodespaces.length} active, ${idleCodespaces.length} idle`
    );

    return {
      organization: org,
      totalHours: billing.total_hours_used,
      paidHours: billing.total_paid_hours_used,
      includedHours: billing.included_hours,
      hoursByMachineType,
      activeCodespaces: activeCodespaces.slice(0, 20), // Limit to top 20
      idleCodespaces,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const err = error as { status?: number; message?: string };
    
    // Codespaces might not be enabled
    if (err.status === 404 || err.status === 403) {
      logger.debug(`Codespaces not available for org: ${org}`);
      return {
        organization: org,
        totalHours: 0,
        paidHours: 0,
        includedHours: 0,
        hoursByMachineType: {},
        activeCodespaces: [],
        idleCodespaces: [],
        timestamp: new Date().toISOString(),
      };
    }

    logger.error(`Failed to fetch Codespaces billing for ${org}:`, error);
    throw new Error(`Failed to fetch Codespaces billing for ${org}: ${String(error)}`);
  }
}

/**
 * Analyze Codespaces usage and provide recommendations
 */
export function analyzeCodespacesUsage(data: GitHubCodespacesData): {
  concerns: string[];
  recommendations: string[];
  potentialSavings: number;
} {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  let potentialSavings = 0;

  // Check for idle codespaces
  if (data.idleCodespaces.length > 0) {
    concerns.push(`${data.idleCodespaces.length} idle Codespaces (>7 days inactive)`);

    // Estimate savings from deleting idle codespaces
    // Assume idle codespaces waste ~2 hours/day on average
    const estimatedWastedHours = data.idleCodespaces.length * 2 * 30; // per month
    potentialSavings += estimatedWastedHours * 0.36; // Average machine cost

    recommendations.push(
      `Delete ${data.idleCodespaces.length} idle Codespaces to save ~$${potentialSavings.toFixed(2)}/month. Owners: ${data.idleCodespaces.slice(0, 5).map((c) => c.owner).join(', ')}${data.idleCodespaces.length > 5 ? '...' : ''}`
    );
  }

  // Check if using paid hours
  if (data.paidHours > 0) {
    concerns.push(
      `Exceeded included hours (${data.includedHours}). ${data.paidHours} paid hours used.`
    );

    recommendations.push(
      'Consider implementing Codespace timeout policies to prevent leaving instances running.'
    );
  }

  // Check for premium machine usage
  const premiumHours = data.hoursByMachineType['premiumLinux'] || 0;
  if (premiumHours > data.totalHours * 0.3) {
    concerns.push(
      `High premium machine usage: ${premiumHours.toFixed(1)} hours (${((premiumHours / data.totalHours) * 100).toFixed(1)}%)`
    );

    recommendations.push(
      'Review if all users need premium machines. Standard machines (4-core, 8GB) are often sufficient.'
    );
  }

  // Check for overall high usage
  if (data.totalHours > 500) {
    recommendations.push(
      `High Codespaces usage: ${data.totalHours} hours this month. Monitor usage patterns and implement policies.`
    );
  }

  return {
    concerns,
    recommendations,
    potentialSavings: Math.round(potentialSavings * 100) / 100,
  };
}

/**
 * Calculate estimated monthly Codespaces costs
 */
export function calculateCodespacesCosts(data: GitHubCodespacesData): {
  totalCost: number;
  costByMachineType: Record<string, number>;
  averageCostPerUser: number;
} {
  let totalCost = 0;
  const costByMachineType: Record<string, number> = {};

  for (const [machineType, hours] of Object.entries(data.hoursByMachineType)) {
    const pricePerHour = MACHINE_PRICING[machineType] || 0.36; // Default to standard
    const cost = hours * pricePerHour;
    costByMachineType[machineType] = Math.round(cost * 100) / 100;
    totalCost += cost;
  }

  const uniqueUsers = new Set([
    ...data.activeCodespaces.map((c) => c.owner),
    ...data.idleCodespaces.map((c) => c.owner),
  ]).size;

  const averageCostPerUser = uniqueUsers > 0 ? totalCost / uniqueUsers : 0;

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    costByMachineType,
    averageCostPerUser: Math.round(averageCostPerUser * 100) / 100,
  };
}
