/**
 * Cost calculation logic for GitHub and Azure DevOps usage
 */

import type { GitHubUsageData, AzureDevOpsUsageData, CalculatedCosts } from '../../types/state';
import { getPricing, calculateCostWithFreeTier } from '../../utils/pricing';
import { getLogger } from '../../utils/logger';

/**
 * Calculate GitHub costs from usage data
 */
export function calculateGitHubCosts(usage: GitHubUsageData, org: string): {
  organization: string;
  totalCost: number;
  breakdown: {
    actions: number;
    lfs: number;
    codespaces: number;
  };
  details: {
    actions?: {
      ubuntuCost: number;
      windowsCost: number;
      macosCost: number;
      totalMinutes: number;
      paidMinutes: number;
    };
    lfs?: {
      storageCost: number;
      bandwidthCost: number;
      totalGB: number;
      paidGB: number;
    };
    codespaces?: {
      computeCost: number;
      storageCost: number;
      totalHours: number;
      paidHours: number;
    };
  };
} {
  const logger = getLogger();
  const pricing = getPricing();

  let actionsCost = 0;
  let lfsCost = 0;
  let codespacesCost = 0;

  const details: {
    actions?: {
      ubuntuCost: number;
      windowsCost: number;
      macosCost: number;
      totalMinutes: number;
      paidMinutes: number;
    };
    lfs?: {
      storageCost: number;
      bandwidthCost: number;
      totalGB: number;
      paidGB: number;
    };
    codespaces?: {
      computeCost: number;
      storageCost: number;
      totalHours: number;
      paidHours: number;
    };
  } = {};

  // Calculate Actions costs
  if (usage.actions) {
    const ubuntuCost = usage.actions.minutesByOS.ubuntu * pricing.github.actions.ubuntu;
    const windowsCost = usage.actions.minutesByOS.windows * pricing.github.actions.windows;
    const macosCost = usage.actions.minutesByOS.macos * pricing.github.actions.macos;

    actionsCost = ubuntuCost + windowsCost + macosCost;

    details.actions = {
      ubuntuCost: Math.round(ubuntuCost * 100) / 100,
      windowsCost: Math.round(windowsCost * 100) / 100,
      macosCost: Math.round(macosCost * 100) / 100,
      totalMinutes: usage.actions.totalMinutesUsed,
      paidMinutes: usage.actions.paidMinutesUsed,
    };

    logger.debug(
      `GitHub Actions cost for ${org}: $${actionsCost.toFixed(2)} (Ubuntu: $${ubuntuCost.toFixed(2)}, Windows: $${windowsCost.toFixed(2)}, macOS: $${macosCost.toFixed(2)})`
    );
  }

  // Calculate LFS costs
  if (usage.lfs) {
    const storageCalc = calculateCostWithFreeTier(
      usage.lfs.storageGB,
      pricing.github.freeTiers.lfsStorage,
      pricing.github.lfs.storage
    );

    const bandwidthCalc = calculateCostWithFreeTier(
      usage.lfs.bandwidthGB,
      pricing.github.freeTiers.lfsBandwidth,
      pricing.github.lfs.bandwidth
    );

    lfsCost = storageCalc.totalCost + bandwidthCalc.totalCost;

    details.lfs = {
      storageCost: storageCalc.totalCost,
      bandwidthCost: bandwidthCalc.totalCost,
      totalGB: usage.lfs.storageGB,
      paidGB: storageCalc.paidUsage,
    };

    logger.debug(`GitHub LFS cost for ${org}: $${lfsCost.toFixed(2)}`);
  }

  // Calculate Codespaces costs
  if (usage.codespaces) {
    // Calculate compute cost
    let computeCost = 0;
    for (const [machineType, hours] of Object.entries(usage.codespaces.hoursByMachineType)) {
      const normalizedType = normalizeMachineType(machineType);
      const pricePerHour = pricing.github.codespaces.compute[normalizedType] || 0.36; // Default to 4-core
      computeCost += hours * pricePerHour;
    }

    // Storage cost (simplified - would need separate API data)
    const storageCost = 0;

    codespacesCost = computeCost + storageCost;

    details.codespaces = {
      computeCost: Math.round(computeCost * 100) / 100,
      storageCost: Math.round(storageCost * 100) / 100,
      totalHours: usage.codespaces.totalHours,
      paidHours: usage.codespaces.paidHours,
    };

    logger.debug(`GitHub Codespaces cost for ${org}: $${codespacesCost.toFixed(2)}`);
  }

  const totalCost = actionsCost + lfsCost + codespacesCost;

  return {
    organization: org,
    totalCost: Math.round(totalCost * 100) / 100,
    breakdown: {
      actions: Math.round(actionsCost * 100) / 100,
      lfs: Math.round(lfsCost * 100) / 100,
      codespaces: Math.round(codespacesCost * 100) / 100,
    },
    details,
  };
}

/**
 * Calculate Azure DevOps costs from usage data
 */
export function calculateAzdoCosts(usage: AzureDevOpsUsageData, org: string): {
  organization: string;
  totalCost: number;
  breakdown: {
    parallelJobs: number;
    licenses: number;
  };
  details: {
    parallelJobs?: {
      hostedCost: number;
      selfHostedCost: number;
      hostedJobs: number;
      selfHostedJobs: number;
    };
    licenses?: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      costByType: Record<string, number>;
    };
  };
} {
  const logger = getLogger();
  const pricing = getPricing();

  let parallelJobsCost = 0;
  let licensesCost = 0;

  const details: {
    parallelJobs?: {
      hostedCost: number;
      selfHostedCost: number;
      hostedJobs: number;
      selfHostedJobs: number;
    };
    licenses?: {
      totalUsers: number;
      activeUsers: number;
      inactiveUsers: number;
      costByType: Record<string, number>;
    };
  } = {};

  // Calculate parallel job costs
  if (usage.parallelJobs) {
    const hostedCost = usage.parallelJobs.hostedJobsPurchased * pricing.azureDevOps.parallelJobs.hosted;
    const selfHostedCost = usage.parallelJobs.selfHostedAgents * pricing.azureDevOps.parallelJobs.selfHosted;

    parallelJobsCost = hostedCost + selfHostedCost;

    details.parallelJobs = {
      hostedCost: Math.round(hostedCost * 100) / 100,
      selfHostedCost: Math.round(selfHostedCost * 100) / 100,
      hostedJobs: usage.parallelJobs.hostedJobsPurchased,
      selfHostedJobs: usage.parallelJobs.selfHostedAgents,
    };

    logger.debug(`Azure DevOps parallel jobs cost for ${org}: $${parallelJobsCost.toFixed(2)}`);
  }

  // Calculate license costs
  if (usage.licenses) {
    const costByType: Record<string, number> = {};

    for (const [licenseType, count] of Object.entries(usage.licenses.licensesByType)) {
      const normalizedType = normalizeLicenseType(licenseType);
      const pricePerUser = pricing.azureDevOps.licenses[normalizedType] || 0;
      const cost = count * pricePerUser;
      costByType[licenseType] = Math.round(cost * 100) / 100;
      licensesCost += cost;
    }

    details.licenses = {
      totalUsers: usage.licenses.totalUsers,
      activeUsers: usage.licenses.activeUsers,
      inactiveUsers: usage.licenses.inactiveUsers,
      costByType,
    };

    logger.debug(`Azure DevOps licenses cost for ${org}: $${licensesCost.toFixed(2)}`);
  }

  const totalCost = parallelJobsCost + licensesCost;

  return {
    organization: org,
    totalCost: Math.round(totalCost * 100) / 100,
    breakdown: {
      parallelJobs: Math.round(parallelJobsCost * 100) / 100,
      licenses: Math.round(licensesCost * 100) / 100,
    },
    details,
  };
}

/**
 * Calculate total costs across all platforms
 */
export function calculateTotalCosts(
  githubData: Record<string, GitHubUsageData>,
  azdoData: Record<string, AzureDevOpsUsageData>
): CalculatedCosts {
  const logger = getLogger();
  logger.info('Calculating total costs across all platforms');

  let totalGitHubCost = 0;
  let totalAzdoCost = 0;

  const githubCosts: Record<string, ReturnType<typeof calculateGitHubCosts>> = {};
  const azdoCosts: Record<string, ReturnType<typeof calculateAzdoCosts>> = {};

  // Calculate GitHub costs per org
  for (const [org, usage] of Object.entries(githubData)) {
    try {
      const costs = calculateGitHubCosts(usage, org);
      githubCosts[org] = costs;
      totalGitHubCost += costs.totalCost;
    } catch (error) {
      logger.warn(`Failed to calculate GitHub costs for ${org}:`, error);
    }
  }

  // Calculate Azure DevOps costs per org
  for (const [org, usage] of Object.entries(azdoData)) {
    try {
      const costs = calculateAzdoCosts(usage, org);
      azdoCosts[org] = costs;
      totalAzdoCost += costs.totalCost;
    } catch (error) {
      logger.warn(`Failed to calculate Azure DevOps costs for ${org}:`, error);
    }
  }

  const grandTotal = totalGitHubCost + totalAzdoCost;

  logger.info(
    `Total costs: $${grandTotal.toFixed(2)} (GitHub: $${totalGitHubCost.toFixed(2)}, Azure DevOps: $${totalAzdoCost.toFixed(2)})`
  );

  // Aggregate GitHub costs
  const githubActionsTotal = Object.values(githubCosts).reduce((sum, c) => sum + c.breakdown.actions, 0);
  const githubLfsTotal = Object.values(githubCosts).reduce((sum, c) => sum + c.breakdown.lfs, 0);
  const githubCodespacesTotal = Object.values(githubCosts).reduce((sum, c) => sum + c.breakdown.codespaces, 0);

  // Aggregate Azure DevOps costs
  const azdoParallelJobsTotal = Object.values(azdoCosts).reduce((sum, c) => sum + c.breakdown.parallelJobs, 0);
  const azdoLicensesTotal = Object.values(azdoCosts).reduce((sum, c) => sum + c.breakdown.licenses, 0);

  return {
    github: {
      actions: {
        category: 'GitHub Actions',
        currentMonthCost: Math.round(githubActionsTotal * 100) / 100,
        projectedMonthCost: Math.round(githubActionsTotal * 100) / 100,
        trend: 'stable',
        percentChange: 0,
      },
      lfs: {
        category: 'GitHub LFS',
        currentMonthCost: Math.round(githubLfsTotal * 100) / 100,
        projectedMonthCost: Math.round(githubLfsTotal * 100) / 100,
        trend: 'stable',
        percentChange: 0,
      },
      codespaces: {
        category: 'GitHub Codespaces',
        currentMonthCost: Math.round(githubCodespacesTotal * 100) / 100,
        projectedMonthCost: Math.round(githubCodespacesTotal * 100) / 100,
        trend: 'stable',
        percentChange: 0,
      },
      total: Math.round(totalGitHubCost * 100) / 100,
    },
    azureDevOps: {
      parallelJobs: {
        category: 'Azure DevOps Parallel Jobs',
        currentMonthCost: Math.round(azdoParallelJobsTotal * 100) / 100,
        projectedMonthCost: Math.round(azdoParallelJobsTotal * 100) / 100,
        trend: 'stable',
        percentChange: 0,
      },
      licenses: {
        category: 'Azure DevOps Licenses',
        currentMonthCost: Math.round(azdoLicensesTotal * 100) / 100,
        projectedMonthCost: Math.round(azdoLicensesTotal * 100) / 100,
        trend: 'stable',
        percentChange: 0,
      },
      total: Math.round(totalAzdoCost * 100) / 100,
    },
    grandTotal: Math.round(grandTotal * 100) / 100,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Normalize Codespaces machine type to pricing key
 */
function normalizeMachineType(machineType: string): '2-core' | '4-core' | '8-core' | '16-core' | '32-core' {
  const lower = machineType.toLowerCase();

  if (lower.includes('2') || lower.includes('basic')) {
    return '2-core';
  } else if (lower.includes('4') || lower.includes('standard')) {
    return '4-core';
  } else if (lower.includes('8')) {
    return '8-core';
  } else if (lower.includes('16')) {
    return '16-core';
  } else if (lower.includes('32')) {
    return '32-core';
  }

  // Default to 4-core (standard)
  return '4-core';
}

/**
 * Normalize Azure DevOps license type to pricing key
 */
function normalizeLicenseType(licenseType: string): 'basic' | 'basicTestPlans' | 'stakeholder' | 'express' | 'professional' {
  const lower = licenseType.toLowerCase();

  if (lower.includes('test')) {
    return 'basicTestPlans';
  } else if (lower.includes('stakeholder')) {
    return 'stakeholder';
  } else if (lower.includes('express')) {
    return 'express';
  } else if (lower.includes('professional')) {
    return 'professional';
  } else if (lower.includes('basic')) {
    return 'basic';
  }

  return 'basic'; // Default
}
