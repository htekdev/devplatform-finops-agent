/**
 * Azure DevOps User License Status Fetcher
 * Analyzes user licenses and identifies inactive users
 */

import type { AzureDevOpsLicenseData } from '../../types/state';
import type { AzureDevOpsClient } from '../../clients/azdo-client';
import { getLogger } from '../../utils/logger';

/**
 * License pricing (approximate monthly cost in USD)
 */
const LICENSE_PRICING: Record<string, number> = {
  express: 0, // Visual Studio subscribers
  stakeholder: 0, // Free for limited access
  basic: 6, // Basic license
  'basic + test plans': 52, // Basic + Test Plans
  professional: 6, // Professional (same as Basic in some contexts)
};

/**
 * Fetch user license status for an organization
 */
export async function fetchUserLicenses(
  client: AzureDevOpsClient,
  org: string,
  inactiveThresholdDays: number = 90
): Promise<AzureDevOpsLicenseData> {
  const logger = getLogger();
  logger.info(`Fetching user licenses for org: ${org}`);

  try {
    const entitlements = await client.getUserEntitlements(org);
    logger.debug(`Found ${entitlements.length} user entitlements for ${org}`);

    const licensesByType: Record<string, number> = {};
    const inactiveUserDetails: AzureDevOpsLicenseData['inactiveUserDetails'] = [];
    let activeUsers = 0;
    let inactiveUsers = 0;

    const now = new Date();
    const thresholdDate = new Date(now.getTime() - inactiveThresholdDays * 24 * 60 * 60 * 1000);

    for (const entitlement of entitlements) {
      const licenseType = entitlement.accessLevel.accountLicenseType.toLowerCase();

      // Count by license type
      licensesByType[licenseType] = (licensesByType[licenseType] || 0) + 1;

      // Check if inactive
      const lastAccessDate = new Date(entitlement.lastAccessedDate);
      const daysSinceLastAccess = Math.floor((now.getTime() - lastAccessDate.getTime()) / (1000 * 60 * 60 * 24));

      if (lastAccessDate < thresholdDate) {
        inactiveUsers++;
        inactiveUserDetails.push({
          userId: entitlement.id,
          userName: entitlement.user.displayName,
          licenseType,
          lastAccessDate: entitlement.lastAccessedDate,
          daysSinceLastAccess,
        });
      } else {
        activeUsers++;
      }
    }

    // Sort inactive users by days since last access (most inactive first)
    inactiveUserDetails.sort((a, b) => b.daysSinceLastAccess - a.daysSinceLastAccess);

    logger.info(
      `License analysis for ${org}: ${activeUsers} active, ${inactiveUsers} inactive (>${inactiveThresholdDays} days)`
    );

    return {
      organization: org,
      totalUsers: entitlements.length,
      activeUsers,
      inactiveUsers,
      licensesByType,
      inactiveUserDetails,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to fetch user licenses for ${org}:`, error);
    throw new Error(`Failed to fetch user licenses for ${org}: ${String(error)}`);
  }
}

/**
 * Analyze license utilization and calculate potential savings
 */
export function analyzeLicenseUtilization(
  data: AzureDevOpsLicenseData
): {
  concerns: string[];
  recommendations: string[];
  potentialSavings: number;
  savingsBreakdown: Array<{ licenseType: string; count: number; monthlySavings: number }>;
} {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  const savingsBreakdown: Array<{ licenseType: string; count: number; monthlySavings: number }> =
    [];
  let potentialSavings = 0;

  // Calculate savings from inactive users
  const inactiveByType: Record<string, number> = {};
  for (const user of data.inactiveUserDetails) {
    inactiveByType[user.licenseType] = (inactiveByType[user.licenseType] || 0) + 1;
  }

  for (const [licenseType, count] of Object.entries(inactiveByType)) {
    const pricePerUser = LICENSE_PRICING[licenseType] || 0;
    const monthlySavings = count * pricePerUser;

    if (monthlySavings > 0) {
      savingsBreakdown.push({
        licenseType,
        count,
        monthlySavings,
      });
      potentialSavings += monthlySavings;
    }
  }

  // Generate concerns and recommendations
  if (data.inactiveUsers > 0) {
    concerns.push(
      `${data.inactiveUsers} inactive users (${((data.inactiveUsers / data.totalUsers) * 100).toFixed(1)}% of total)`
    );

    if (potentialSavings > 0) {
      recommendations.push(
        `Remove or downgrade ${data.inactiveUsers} inactive user licenses to save ~$${potentialSavings.toFixed(2)}/month. Top inactive users: ${data.inactiveUserDetails.slice(0, 5).map((u) => `${u.userName} (${u.daysSinceLastAccess} days)`).join(', ')}`
      );
    } else {
      recommendations.push(
        `${data.inactiveUsers} users haven't accessed the system recently. Consider reviewing their access even if they're on free licenses.`
      );
    }
  }

  // Check for high proportion of paid licenses
  const paidLicenses = (data.licensesByType['basic'] || 0) + (data.licensesByType['basic + test plans'] || 0);

  if (paidLicenses > data.totalUsers * 0.8) {
    concerns.push(
      `High proportion of paid licenses: ${paidLicenses} of ${data.totalUsers} users (${((paidLicenses / data.totalUsers) * 100).toFixed(1)}%)`
    );

    recommendations.push(
      `Review if all users need paid licenses. Consider Stakeholder licenses for users who only need to view work items.`
    );
  }

  // Recommendations for very inactive users
  const veryInactive = data.inactiveUserDetails.filter((u) => u.daysSinceLastAccess > 180);
  if (veryInactive.length > 0) {
    recommendations.push(
      `${veryInactive.length} users haven't accessed the system in over 6 months. These should be priority for license reclamation.`
    );
  }

  // Overall recommendation if no issues
  if (data.inactiveUsers === 0) {
    recommendations.push(
      `All ${data.totalUsers} users are active. License utilization is optimal.`
    );
  }

  return {
    concerns,
    recommendations,
    potentialSavings,
    savingsBreakdown,
  };
}

/**
 * Get license cost summary
 */
export function calculateLicenseCosts(data: AzureDevOpsLicenseData): {
  totalMonthlyCost: number;
  costByLicenseType: Record<string, { count: number; costPerUser: number; totalCost: number }>;
} {
  const costByLicenseType: Record<string, { count: number; costPerUser: number; totalCost: number }> = {};
  let totalMonthlyCost = 0;

  for (const [licenseType, count] of Object.entries(data.licensesByType)) {
    const costPerUser = LICENSE_PRICING[licenseType] || 0;
    const totalCost = count * costPerUser;

    costByLicenseType[licenseType] = {
      count,
      costPerUser,
      totalCost,
    };

    totalMonthlyCost += totalCost;
  }

  return {
    totalMonthlyCost,
    costByLicenseType,
  };
}
