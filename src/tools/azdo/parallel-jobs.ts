/**
 * Azure DevOps Parallel Job Usage Fetcher
 * Analyzes agent pool utilization and capacity
 */

import type { AzureDevOpsParallelJobData } from '../../types/state';
import type { AzureDevOpsClient } from '../../clients/azdo-client';
import { getLogger } from '../../utils/logger';

/**
 * Fetch parallel job usage data for an organization
 */
export async function fetchParallelJobUsage(
  client: AzureDevOpsClient,
  org: string
): Promise<AzureDevOpsParallelJobData> {
  const logger = getLogger();
  logger.info(`Fetching parallel job usage for org: ${org}`);

  try {
    // Get all agent pools
    const pools = await client.getAgentPools(org);
    logger.debug(`Found ${pools.length} agent pools for ${org}`);

    const poolsData: AzureDevOpsParallelJobData['pools'] = [];
    let hostedJobsPurchased = 0;
    let selfHostedAgents = 0;

    for (const pool of pools) {
      try {
        // Get agents in this pool
        const agents = await client.getAgentsInPool(org, pool.id);

        // Calculate running jobs (agents with assignedRequest)
        const runningJobs = agents.filter((agent) => agent.assignedRequest).length;

        // Calculate utilization
        const poolSize = agents.length || 1; // Avoid division by zero
        const utilizationRate = poolSize > 0 ? runningJobs / poolSize : 0;

        // Calculate average queue time (would need pipeline API for real data)
        // For now, we'll use a placeholder
        const avgQueueTime = 0; // TODO: Calculate from pipeline runs

        poolsData.push({
          poolId: pool.id,
          poolName: pool.name,
          isHosted: pool.isHosted,
          totalJobs: agents.length,
          utilizationRate,
          avgQueueTime,
        });

        // Track hosted vs self-hosted
        if (pool.isHosted) {
          hostedJobsPurchased += pool.targetSize || 0;
        } else {
          selfHostedAgents += agents.length;
        }
      } catch (error) {
        logger.warn(`Failed to fetch agents for pool ${pool.name}:`, error);
        // Continue with other pools
      }
    }

    logger.info(
      `Processed ${poolsData.length} pools: ${hostedJobsPurchased} hosted jobs, ${selfHostedAgents} self-hosted agents`
    );

    return {
      organization: org,
      pools: poolsData,
      hostedJobsPurchased,
      selfHostedAgents,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to fetch parallel job usage for ${org}:`, error);
    throw new Error(`Failed to fetch parallel job usage for ${org}: ${String(error)}`);
  }
}

/**
 * Analyze parallel job utilization and identify issues
 */
export function analyzeParallelJobUtilization(data: AzureDevOpsParallelJobData): {
  underutilizedPools: Array<{ poolName: string; utilizationRate: number; reason: string }>;
  recommendations: string[];
  hostedVsSelfHostedComparison: {
    hostedJobs: number;
    selfHostedAgents: number;
    recommendation: string;
  };
} {
  const underutilizedPools: Array<{ poolName: string; utilizationRate: number; reason: string }> =
    [];
  const recommendations: string[] = [];

  // Check for underutilized pools (<30% utilization)
  for (const pool of data.pools) {
    if (pool.utilizationRate < 0.3 && pool.totalJobs > 0) {
      underutilizedPools.push({
        poolName: pool.poolName,
        utilizationRate: pool.utilizationRate,
        reason: `Only ${(pool.utilizationRate * 100).toFixed(1)}% utilized`,
      });

      if (!pool.isHosted && pool.totalJobs > 3) {
        recommendations.push(
          `Pool "${pool.poolName}" has ${pool.totalJobs} self-hosted agents but only ${(pool.utilizationRate * 100).toFixed(1)}% utilization. Consider reducing agent count.`
        );
      }
    }
  }

  // Hosted vs self-hosted comparison
  const hostedVsSelfHostedComparison = {
    hostedJobs: data.hostedJobsPurchased,
    selfHostedAgents: data.selfHostedAgents,
    recommendation: '',
  };

  if (data.hostedJobsPurchased > 0 && data.selfHostedAgents > 10) {
    // Calculate potential savings from self-hosted
    // Hosted parallel job: ~$40/month, self-hosted: infrastructure cost
    const hostedCost = data.hostedJobsPurchased * 40;
    hostedVsSelfHostedComparison.recommendation = `You have ${data.hostedJobsPurchased} hosted parallel jobs (~$${hostedCost}/month) and ${data.selfHostedAgents} self-hosted agents. Review if all hosted jobs are necessary.`;
    recommendations.push(hostedVsSelfHostedComparison.recommendation);
  } else if (data.hostedJobsPurchased === 0 && data.selfHostedAgents < 5) {
    hostedVsSelfHostedComparison.recommendation =
      'Consider Microsoft-hosted agents for small teams to reduce infrastructure maintenance overhead.';
    recommendations.push(hostedVsSelfHostedComparison.recommendation);
  }

  // Check for high queue times
  for (const pool of data.pools) {
    if (pool.avgQueueTime > 5) {
      recommendations.push(
        `Pool "${pool.poolName}" has high average queue time (${pool.avgQueueTime.toFixed(1)} minutes). Consider adding more capacity.`
      );
    }
  }

  return {
    underutilizedPools,
    recommendations,
    hostedVsSelfHostedComparison,
  };
}
