import * as azdev from 'azure-devops-node-api';
import { z } from 'zod';

export const GetAgentPoolsSchema = z.object({
  org: z.string().describe('Azure DevOps organization name'),
});

export type GetAgentPoolsInput = z.infer<typeof GetAgentPoolsSchema>;

export interface AgentPoolData {
  pools: Array<{
    poolId: number;
    poolName: string;
    isHosted: boolean;
    agentCount: number;
    onlineAgents: number;
    offlineAgents: number;
  }>;
}

export async function getAgentPools(
  connection: azdev.WebApi,
  org: string
): Promise<AgentPoolData> {
  try {
    const taskAgentClient = await connection.getTaskAgentApi();
    const pools = await taskAgentClient.getAgentPools();

    const poolData: AgentPoolData['pools'] = [];

    for (const pool of pools || []) {
      if (!pool.id) continue;

      const agents = await taskAgentClient.getAgents(pool.id);
      const onlineAgents = agents.filter((a) => a.status === 1).length; // 1 = online
      const offlineAgents = agents.filter((a) => a.status !== 1).length;

      poolData.push({
        poolId: pool.id,
        poolName: pool.name || 'Unknown Pool',
        isHosted: pool.isHosted || false,
        agentCount: agents.length,
        onlineAgents,
        offlineAgents,
      });
    }

    return { pools: poolData };
  } catch (error) {
    throw new Error(`Failed to get agent pools for organization '${org}': ${error}`);
  }
}
