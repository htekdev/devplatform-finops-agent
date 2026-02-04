import type { WebApi } from "azure-devops-node-api";
import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface AzDoAgentPool {
  id: number;
  name: string;
  size: number;
  isHosted: boolean;
  poolType: string;
}

export async function getAzDoAgentPools(
  connection: WebApi,
  organization: string
): Promise<ToolResult<AzDoAgentPool[]>> {
  return wrapToolHandler(async () => {
    const taskAgentApi = await connection.getTaskAgentApi();
    const pools = await taskAgentApi.getAgentPools();
    
    return pools.map((pool) => ({
      id: pool.id || 0,
      name: pool.name || "Unknown",
      size: pool.size || 0,
      isHosted: pool.isHosted || false,
      poolType: pool.poolType?.toString() || "automation",
    }));
  }, `get Azure DevOps agent pools for ${organization}`);
}
