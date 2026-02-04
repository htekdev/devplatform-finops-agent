import type { WebApi } from "azure-devops-node-api";
import type { ToolResult } from "../../lib/types.js";
import { wrapToolHandler } from "../../lib/error-handler.js";
import { get90DayPeriod } from "../../lib/date-utils.js";

export interface AzDoPipelineRun {
  id: number;
  name: string;
  status: string;
  result?: string;
  startTime?: string;
  finishTime?: string;
  queueTime?: string;
}

export async function getAzDoPipelineRuns(
  connection: WebApi,
  organization: string,
  project: string
): Promise<ToolResult<AzDoPipelineRun[]>> {
  return wrapToolHandler(async () => {
    const buildApi = await connection.getBuildApi();
    const { start } = get90DayPeriod();
    
    const builds = await buildApi.getBuilds(
      project,
      undefined,
      undefined,
      undefined,
      start,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      1000
    );
    
    return builds.map((build) => ({
      id: build.id || 0,
      name: build.definition?.name || "Unknown",
      status: build.status?.toString() || "unknown",
      result: build.result?.toString(),
      startTime: build.startTime?.toISOString(),
      finishTime: build.finishTime?.toISOString(),
      queueTime: build.queueTime?.toISOString(),
    }));
  }, `get Azure DevOps pipeline runs for ${organization}/${project}`);
}
