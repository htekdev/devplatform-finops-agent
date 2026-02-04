import type { WebApi } from "azure-devops-node-api";
import type { UsageMetric } from "../../models/usage-metric.js";
import { getAzDoUserEntitlements } from "../../tools/azdo/get-user-entitlements.js";

import { getAzDoAgentPools } from "../../tools/azdo/get-agent-pools.js";
import { calculateAzDoLicenseCost, calculateAzDoParallelJobCost } from "../pricing/azdo-pricing.js";
import { get90DayPeriod, isWithinDays } from "../../lib/date-utils.js";

export interface AzDoAnalysisResult {
  metrics: UsageMetric[];
  warnings: string[];
}

export async function analyzeAzureDevOpsOrganization(
  connection: WebApi,
  organization: string
): Promise<AzDoAnalysisResult> {
  const metrics: UsageMetric[] = [];
  const warnings: string[] = [];
  const period = get90DayPeriod();

  const usersResult = await getAzDoUserEntitlements(connection, organization);
  if (usersResult.success && usersResult.data) {
    let totalLicenseCost = 0;
    let activeUsers = 0;
    let inactiveUsers = 0;

    for (const user of usersResult.data) {
      const cost = calculateAzDoLicenseCost(user.licenseType);
      totalLicenseCost += cost;

      if (user.lastAccessedDate && isWithinDays(new Date(user.lastAccessedDate), 90)) {
        activeUsers++;
      } else {
        inactiveUsers++;
      }
    }

    metrics.push({
      id: `azdo-licenses-${organization}`,
      platform: "azure-devops",
      resourceType: "user-license",
      resourceId: organization,
      resourceName: organization,
      orgUnit: { organization },
      quantity: usersResult.data.length,
      unit: "users",
      period,
      cost: { amount: totalLicenseCost, currency: "USD", isEstimated: false },
      metadata: { activeUsers, inactiveUsers },
    });
  } else {
    warnings.push(`Failed to get Azure DevOps user entitlements: ${usersResult.error?.message}`);
  }

  const poolsResult = await getAzDoAgentPools(connection, organization);
  if (poolsResult.success && poolsResult.data) {
    for (const pool of poolsResult.data) {
      const cost = calculateAzDoParallelJobCost(pool.isHosted, pool.size);
      
      metrics.push({
        id: `azdo-pool-${pool.id}`,
        platform: "azure-devops",
        resourceType: "agent-pool",
        resourceId: pool.id.toString(),
        resourceName: pool.name,
        orgUnit: { organization },
        quantity: pool.size,
        unit: "jobs",
        period,
        cost: { amount: cost, currency: "USD", isEstimated: false },
        metadata: { isHosted: pool.isHosted, poolType: pool.poolType },
      });
    }
  } else {
    warnings.push(`Failed to get Azure DevOps agent pools: ${poolsResult.error?.message}`);
  }

  return { metrics, warnings };
}
