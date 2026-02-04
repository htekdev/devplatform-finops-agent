/**
 * Pipeline Runs Tool
 * 
 * Retrieves Azure DevOps pipeline run information.
 * Note: For detailed queue time analysis, Build API may be needed instead.
 */

import type { WebApi } from "azure-devops-node-api";
import { wrapToolHandler, type ToolResult } from "../../lib/error-handling.js";

export interface PipelineRunInfo {
  id: number;
  name: string;
  state: string;
  result?: string;
  createdDate: string;
  finishedDate?: string;
}

export interface PipelineRunsData {
  project: string;
  pipelineId: number;
  runs: PipelineRunInfo[];
  totalRuns: number;
  completedRuns: number;
  inProgressRuns: number;
}

/**
 * Get pipeline runs for a specific pipeline
 */
export async function getPipelineRuns(
  connection: WebApi,
  project: string,
  pipelineId: number,
  limit: number = 100
): Promise<ToolResult<PipelineRunsData>> {
  return wrapToolHandler(
    async () => {
      const pipelinesApi = await connection.getPipelinesApi();
      const runs = await pipelinesApi.listRuns(project, pipelineId);
      
      const runInfos: PipelineRunInfo[] = (runs || []).slice(0, limit).map(run => {
        let state = "unknown";
        const runState = run.state as number | undefined;
        if (runState === 1) state = "inProgress";
        else if (runState === 2) state = "canceling";
        else if (runState === 3) state = "completed";
        
        let result: string | undefined;
        const runResult = run.result as number | undefined;
        if (runResult === 1) result = "succeeded";
        else if (runResult === 2) result = "failed";
        else if (runResult === 3) result = "canceled";
        
        return {
          id: run.id!,
          name: run.name!,
          state,
          result,
          createdDate: run.createdDate?.toISOString() || "",
          finishedDate: run.finishedDate?.toISOString(),
        };
      });
      
      const completedRuns = runInfos.filter(r => r.state === "completed").length;
      const inProgressRuns = runInfos.filter(r => r.state === "inProgress").length;
      
      return {
        project,
        pipelineId,
        runs: runInfos,
        totalRuns: runInfos.length,
        completedRuns,
        inProgressRuns,
      };
    },
    `get pipeline runs for ${project}/${pipelineId}`
  );
}

export interface BuildInfo {
  id: number;
  buildNumber: string;
  status: string;
  result?: string;
  queueTime: string;
  startTime?: string;
  finishTime?: string;
  queueDurationSeconds?: number;
}

export interface BuildsData {
  project: string;
  builds: BuildInfo[];
  totalBuilds: number;
  averageQueueTimeSeconds: number;
}

/**
 * Get builds using Build API (provides queue time data)
 * This is more useful for cost analysis than Pipeline Runs API
 */
export async function getBuilds(
  connection: WebApi,
  project: string,
  limit: number = 100
): Promise<ToolResult<BuildsData>> {
  return wrapToolHandler(
    async () => {
      const buildApi = await connection.getBuildApi();
      const builds = await buildApi.getBuilds(project, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, limit);
      
      const buildInfos: BuildInfo[] = (builds || []).map(build => {
        let status = "unknown";
        if (build.status === 1) status = "inProgress";
        else if (build.status === 2) status = "completed";
        else if (build.status === 4) status = "cancelling";
        
        let result: string | undefined;
        if (build.result === 2) result = "succeeded";
        else if (build.result === 8) result = "failed";
        else if (build.result === 32) result = "canceled";
        
        const queueTime = build.queueTime?.getTime() || 0;
        const startTime = build.startTime?.getTime();
        let queueDurationSeconds: number | undefined;
        if (startTime && queueTime) {
          queueDurationSeconds = Math.round((startTime - queueTime) / 1000);
        }
        
        return {
          id: build.id!,
          buildNumber: build.buildNumber!,
          status,
          result,
          queueTime: build.queueTime?.toISOString() || "",
          startTime: build.startTime?.toISOString(),
          finishTime: build.finishTime?.toISOString(),
          queueDurationSeconds,
        };
      });
      
      const queueTimes = buildInfos
        .filter(b => b.queueDurationSeconds !== undefined)
        .map(b => b.queueDurationSeconds!);
      
      const averageQueueTimeSeconds = queueTimes.length > 0
        ? Math.round(queueTimes.reduce((a, b) => a + b, 0) / queueTimes.length)
        : 0;
      
      return {
        project,
        builds: buildInfos,
        totalBuilds: buildInfos.length,
        averageQueueTimeSeconds,
      };
    },
    `get builds for ${project}`
  );
}
