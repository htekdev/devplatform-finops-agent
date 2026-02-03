/**
 * Azure DevOps Agent Pool Metrics Fetcher
 * Analyzes agent health and availability
 */

import type { AzureDevOpsClient, Agent } from '../../clients/azdo-client';
import { getLogger } from '../../utils/logger';

export interface AgentPoolMetrics {
  poolId: number;
  poolName: string;
  isHosted: boolean;
  totalAgents: number;
  onlineAgents: number;
  offlineAgents: number;
  enabledAgents: number;
  disabledAgents: number;
  agentsWithJobs: number;
  idleAgents: Agent[];
  offlineForLongTime: Agent[];
}

/**
 * Fetch agent pool metrics
 */
export async function fetchAgentPoolMetrics(
  client: AzureDevOpsClient,
  org: string,
  poolId: number,
  poolName: string,
  isHosted: boolean
): Promise<AgentPoolMetrics> {
  const logger = getLogger();
  logger.debug(`Fetching agent metrics for pool ${poolName} (${poolId})`);

  try {
    const agents = await client.getAgentsInPool(org, poolId);

    let onlineAgents = 0;
    let offlineAgents = 0;
    let enabledAgents = 0;
    let disabledAgents = 0;
    let agentsWithJobs = 0;
    const idleAgents: Agent[] = [];
    const offlineForLongTime: Agent[] = [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const agent of agents) {
      // Status
      if (agent.status === 'online') {
        onlineAgents++;
      } else {
        offlineAgents++;

        // Check if offline for >7 days
        const statusChangedOn = new Date(agent.statusChangedOn);
        if (statusChangedOn < sevenDaysAgo) {
          offlineForLongTime.push(agent);
        }
      }

      // Enabled/Disabled
      if (agent.enabled) {
        enabledAgents++;
      } else {
        disabledAgents++;
      }

      // Job assignment
      if (agent.assignedRequest) {
        agentsWithJobs++;
      } else if (agent.status === 'online' && agent.enabled) {
        // Online, enabled, but no job = idle
        idleAgents.push(agent);
      }
    }

    return {
      poolId,
      poolName,
      isHosted,
      totalAgents: agents.length,
      onlineAgents,
      offlineAgents,
      enabledAgents,
      disabledAgents,
      agentsWithJobs,
      idleAgents,
      offlineForLongTime,
    };
  } catch (error) {
    const logger = getLogger();
    logger.error(`Failed to fetch agent metrics for pool ${poolName}:`, error);
    throw error;
  }
}

/**
 * Fetch metrics for all agent pools
 */
export async function fetchAllAgentPoolMetrics(
  client: AzureDevOpsClient,
  org: string
): Promise<AgentPoolMetrics[]> {
  const logger = getLogger();
  logger.info(`Fetching agent pool metrics for org: ${org}`);

  try {
    const pools = await client.getAgentPools(org);
    const allMetrics: AgentPoolMetrics[] = [];

    for (const pool of pools) {
      try {
        const metrics = await fetchAgentPoolMetrics(client, org, pool.id, pool.name, pool.isHosted);
        allMetrics.push(metrics);
      } catch (error) {
        logger.warn(`Failed to fetch metrics for pool ${pool.name}:`, error);
        // Continue with other pools
      }
    }

    logger.info(`Fetched metrics for ${allMetrics.length} agent pools`);
    return allMetrics;
  } catch (error) {
    logger.error(`Failed to fetch all agent pool metrics for ${org}:`, error);
    throw new Error(`Failed to fetch all agent pool metrics for ${org}: ${String(error)}`);
  }
}

/**
 * Analyze agent pool health and identify issues
 */
export function analyzeAgentPoolHealth(metrics: AgentPoolMetrics[]): {
  concerns: string[];
  recommendations: string[];
  summary: {
    totalPools: number;
    totalAgents: number;
    onlineAgents: number;
    offlineAgents: number;
    utilizationRate: number;
  };
} {
  const concerns: string[] = [];
  const recommendations: string[] = [];

  let totalAgents = 0;
  let onlineAgents = 0;
  let offlineAgents = 0;
  let agentsWithJobs = 0;

  for (const pool of metrics) {
    // Skip hosted pools (managed by Microsoft)
    if (pool.isHosted) {
      continue;
    }

    totalAgents += pool.totalAgents;
    onlineAgents += pool.onlineAgents;
    offlineAgents += pool.offlineAgents;
    agentsWithJobs += pool.agentsWithJobs;

    // Check for offline agents
    if (pool.offlineAgents > 0 && pool.totalAgents > 0) {
      const offlinePercent = (pool.offlineAgents / pool.totalAgents) * 100;
      if (offlinePercent > 20) {
        concerns.push(
          `Pool "${pool.poolName}" has ${pool.offlineAgents} of ${pool.totalAgents} agents offline (${offlinePercent.toFixed(1)}%)`
        );
      }
    }

    // Check for long-offline agents
    if (pool.offlineForLongTime.length > 0) {
      concerns.push(
        `Pool "${pool.poolName}" has ${pool.offlineForLongTime.length} agents offline for >7 days: ${pool.offlineForLongTime.slice(0, 3).map((a) => a.name).join(', ')}`
      );

      recommendations.push(
        `Remove or repair agents in "${pool.poolName}" that have been offline for extended periods.`
      );
    }

    // Check for disabled agents
    if (pool.disabledAgents > 0) {
      recommendations.push(
        `Pool "${pool.poolName}" has ${pool.disabledAgents} disabled agents. Remove if no longer needed.`
      );
    }

    // Check for low utilization
    if (pool.totalAgents > 3) {
      const utilizationRate = pool.onlineAgents > 0 ? pool.agentsWithJobs / pool.onlineAgents : 0;
      if (utilizationRate < 0.2) {
        recommendations.push(
          `Pool "${pool.poolName}" has low utilization (${(utilizationRate * 100).toFixed(1)}%). Consider reducing agent count or consolidating pools.`
        );
      }
    }

    // Check if pool has no online agents
    if (pool.totalAgents > 0 && pool.onlineAgents === 0) {
      concerns.push(
        `Pool "${pool.poolName}" has no online agents! Pipelines using this pool will fail.`
      );
    }
  }

  const utilizationRate = onlineAgents > 0 ? agentsWithJobs / onlineAgents : 0;

  return {
    concerns,
    recommendations,
    summary: {
      totalPools: metrics.filter((m) => !m.isHosted).length,
      totalAgents,
      onlineAgents,
      offlineAgents,
      utilizationRate,
    },
  };
}
