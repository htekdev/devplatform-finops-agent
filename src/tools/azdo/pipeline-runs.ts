/**
 * Azure DevOps Pipeline Run History Fetcher
 * Analyzes pipeline performance and identifies issues
 */

import type { AzureDevOpsPipelineData } from '../../types/state';
import type { AzureDevOpsClient } from '../../clients/azdo-client';
import { getLogger } from '../../utils/logger';

/**
 * Fetch pipeline run history for a project
 */
export async function fetchPipelineRuns(
  client: AzureDevOpsClient,
  org: string,
  project: string
): Promise<AzureDevOpsPipelineData> {
  const logger = getLogger();
  logger.info(`Fetching pipeline runs for ${org}/${project}`);

  try {
    // Fetch runs from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const minDate = thirtyDaysAgo.toISOString();

    const runs = await client.getPipelineRuns(org, project, { minDate });
    logger.debug(`Found ${runs.length} pipeline runs for ${org}/${project}`);

    // Aggregate by pipeline
    const pipelineStats = new Map<
      number,
      {
        pipelineId: number;
        pipelineName: string;
        totalRuns: number;
        successfulRuns: number;
        failedRuns: number;
        totalDuration: number;
        totalQueueTime: number;
      }
    >();

    for (const run of runs) {
      if (!pipelineStats.has(run.pipeline.id)) {
        pipelineStats.set(run.pipeline.id, {
          pipelineId: run.pipeline.id,
          pipelineName: run.pipeline.name,
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          totalDuration: 0,
          totalQueueTime: 0,
        });
      }

      const stats = pipelineStats.get(run.pipeline.id)!;
      stats.totalRuns++;

      if (run.result === 'succeeded') {
        stats.successfulRuns++;
      } else if (run.result === 'failed') {
        stats.failedRuns++;
      }

      // Calculate duration
      if (run.finishedDate && run.createdDate) {
        const duration = new Date(run.finishedDate).getTime() - new Date(run.createdDate).getTime();
        stats.totalDuration += duration / 1000 / 60; // Convert to minutes
      }

      // Queue time would be: run_started_at - created_at
      // For now, we'll estimate based on available data
      stats.totalQueueTime += 1; // Placeholder
    }

    // Convert to array and calculate averages
    const pipelines = Array.from(pipelineStats.values()).map((stats) => ({
      pipelineId: stats.pipelineId,
      pipelineName: stats.pipelineName,
      totalRuns: stats.totalRuns,
      failureRate: stats.totalRuns > 0 ? stats.failedRuns / stats.totalRuns : 0,
      avgDuration: stats.totalRuns > 0 ? stats.totalDuration / stats.totalRuns : 0,
      avgQueueTime: stats.totalRuns > 0 ? stats.totalQueueTime / stats.totalRuns : 0,
    }));

    logger.info(`Processed ${pipelines.length} unique pipelines for ${org}/${project}`);

    return {
      organization: org,
      project,
      pipelines,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to fetch pipeline runs for ${org}/${project}:`, error);
    throw new Error(`Failed to fetch pipeline runs for ${org}/${project}: ${String(error)}`);
  }
}

/**
 * Analyze pipeline performance and identify issues
 */
export function analyzePipelinePerformance(data: AzureDevOpsPipelineData): {
  slowestPipelines: Array<{ pipelineName: string; avgDuration: number }>;
  mostFailedPipelines: Array<{ pipelineName: string; failureRate: number; totalRuns: number }>;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  // Identify slowest pipelines (top 10)
  const slowestPipelines = [...data.pipelines]
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 10)
    .map((p) => ({
      pipelineName: p.pipelineName,
      avgDuration: Math.round(p.avgDuration * 10) / 10,
    }));

  // Identify most failed pipelines (top 10 by failure rate, min 5 runs)
  const mostFailedPipelines = [...data.pipelines]
    .filter((p) => p.totalRuns >= 5)
    .sort((a, b) => b.failureRate - a.failureRate)
    .slice(0, 10)
    .map((p) => ({
      pipelineName: p.pipelineName,
      failureRate: Math.round(p.failureRate * 100) / 100,
      totalRuns: p.totalRuns,
    }));

  // Generate recommendations
  for (const pipeline of data.pipelines) {
    // High failure rate
    if (pipeline.failureRate > 0.2 && pipeline.totalRuns >= 5) {
      recommendations.push(
        `Pipeline "${pipeline.pipelineName}" has ${(pipeline.failureRate * 100).toFixed(1)}% failure rate (${pipeline.totalRuns} runs). Investigate and fix flaky tests or infrastructure issues.`
      );
    }

    // Very slow pipelines
    if (pipeline.avgDuration > 60) {
      recommendations.push(
        `Pipeline "${pipeline.pipelineName}" averages ${pipeline.avgDuration.toFixed(1)} minutes. Consider parallelization, caching, or infrastructure upgrades.`
      );
    }

    // High queue time
    if (pipeline.avgQueueTime > 5) {
      recommendations.push(
        `Pipeline "${pipeline.pipelineName}" has ${pipeline.avgQueueTime.toFixed(1)} minute average queue time. Consider adding more parallel job capacity.`
      );
    }
  }

  // Overall stats
  const totalRuns = data.pipelines.reduce((sum, p) => sum + p.totalRuns, 0);
  const avgFailureRate =
    data.pipelines.reduce((sum, p) => sum + p.failureRate * p.totalRuns, 0) / totalRuns;

  if (avgFailureRate > 0.15) {
    recommendations.push(
      `Overall pipeline failure rate is ${(avgFailureRate * 100).toFixed(1)}%. Focus on improving pipeline reliability.`
    );
  }

  return {
    slowestPipelines,
    mostFailedPipelines,
    recommendations,
  };
}

/**
 * Fetch pipeline data for all projects in an organization
 */
export async function fetchAllPipelineRuns(
  client: AzureDevOpsClient,
  org: string
): Promise<AzureDevOpsPipelineData[]> {
  const logger = getLogger();
  logger.info(`Fetching pipeline runs for all projects in ${org}`);

  try {
    const projects = await client.getProjects(org);
    logger.debug(`Found ${projects.length} projects in ${org}`);

    const allPipelineData: AzureDevOpsPipelineData[] = [];

    // Fetch pipeline data for each project
    for (const project of projects) {
      try {
        const pipelineData = await fetchPipelineRuns(client, org, project.name);
        allPipelineData.push(pipelineData);
      } catch (error) {
        logger.warn(`Failed to fetch pipelines for project ${project.name}:`, error);
        // Continue with other projects
      }
    }

    logger.info(`Fetched pipeline data for ${allPipelineData.length} projects`);
    return allPipelineData;
  } catch (error) {
    logger.error(`Failed to fetch all pipeline runs for ${org}:`, error);
    throw new Error(`Failed to fetch all pipeline runs for ${org}: ${String(error)}`);
  }
}
