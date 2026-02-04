/**
 * Agent Pools Tool
 * 
 * Retrieves Azure DevOps agent pool information and utilization.
 */

import type { WebApi } from "azure-devops-node-api";
import { wrapToolHandler, type ToolResult } from "../../lib/error-handling.js";

export interface AgentPoolInfo {
  id: number;
  name: string;
  isHosted: boolean;
  poolType: string;
  size: number;
  agentCount?: number;
}

export interface AgentPoolsData {
  pools: AgentPoolInfo[];
  totalPools: number;
  hostedPools: number;
  selfHostedPools: number;
}

/**
 * Get agent pools for an Azure DevOps organization
 */
export async function getAgentPools(
  connection: WebApi
): Promise<ToolResult<AgentPoolsData>> {
  return wrapToolHandler(
    async () => {
      const taskAgentApi = await connection.getTaskAgentApi();
      const pools = await taskAgentApi.getAgentPools();
      
      const poolInfos: AgentPoolInfo[] = pools.map(pool => ({
        id: pool.id!,
        name: pool.name!,
        isHosted: pool.isHosted ?? false,
        poolType: pool.poolType === 1 ? "deployment" : "automation",
        size: pool.size ?? 0,
        agentCount: pool.size ?? 0,
      }));
      
      const hostedPools = poolInfos.filter(p => p.isHosted).length;
      const selfHostedPools = poolInfos.filter(p => !p.isHosted).length;
      
      return {
        pools: poolInfos,
        totalPools: poolInfos.length,
        hostedPools,
        selfHostedPools,
      };
    },
    "get agent pools"
  );
}

export interface AgentInfo {
  id: number;
  name: string;
  status: string;
  enabled: boolean;
  lastCompletedRequestFinishTime?: string;
  lastCompletedRequestResult?: string;
}

export interface AgentsInPoolData {
  poolId: number;
  poolName: string;
  agents: AgentInfo[];
  totalAgents: number;
  onlineAgents: number;
  offlineAgents: number;
}

/**
 * Get agents in a specific pool with utilization data
 */
export async function getAgentsInPool(
  connection: WebApi,
  poolId: number,
  poolName: string
): Promise<ToolResult<AgentsInPoolData>> {
  return wrapToolHandler(
    async () => {
      const taskAgentApi = await connection.getTaskAgentApi();
      const agents = await taskAgentApi.getAgents(poolId, undefined, true);
      
      const agentInfos: AgentInfo[] = agents.map(agent => {
        const status = agent.status === 1 ? "online" : "offline";
        const result = agent.lastCompletedRequest?.result;
        let resultStr = "unknown";
        if (result === 2) resultStr = "succeeded";
        else if (result === 3) resultStr = "failed";
        else if (result === 4) resultStr = "canceled";
        
        return {
          id: agent.id!,
          name: agent.name!,
          status,
          enabled: agent.enabled ?? false,
          lastCompletedRequestFinishTime: agent.lastCompletedRequest?.finishTime?.toISOString(),
          lastCompletedRequestResult: resultStr,
        };
      });
      
      const onlineAgents = agentInfos.filter(a => a.status === "online").length;
      const offlineAgents = agentInfos.filter(a => a.status === "offline").length;
      
      return {
        poolId,
        poolName,
        agents: agentInfos,
        totalAgents: agentInfos.length,
        onlineAgents,
        offlineAgents,
      };
    },
    `get agents in pool ${poolId}`
  );
}
