import type { WebApi } from "azure-devops-node-api";
import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";

export interface AzDoParallelJob {
  id: number;
  name: string;
  isHosted: boolean;
  parallelism: number;
}

export async function getAzDoParallelJobs(
  connection: WebApi,
  organization: string
): Promise<ToolResult<AzDoParallelJob[]>> {
  return wrapToolHandler(async () => {
    const taskAgentApi = await connection.getTaskAgentApi();
    const pools = await taskAgentApi.getAgentPools();
    
    return pools.map((pool) => ({
      id: pool.id || 0,
      name: pool.name || "Unknown",
      isHosted: pool.isHosted || false,
      parallelism: pool.size || 1,
    }));
  }, `get Azure DevOps parallel jobs for ${organization}`);
}
