/**
 * Azure DevOps Analyzer Agent
 * Analyzes Azure DevOps platform costs using Copilot SDK
 */

import { defineTool } from '@github/copilot-sdk';
import { z } from 'zod';
import { AzureDevOpsClient } from '../clients/azdo-client';
import {
  fetchParallelJobUsage,
  analyzeParallelJobUtilization,
} from '../tools/azdo/parallel-jobs';
import {
  fetchAllPipelineRuns,
  analyzePipelinePerformance,
} from '../tools/azdo/pipeline-runs';
import {
  fetchUserLicenses,
  analyzeLicenseUtilization,
  calculateLicenseCosts,
} from '../tools/azdo/user-licenses';
import {
  fetchAllAgentPoolMetrics,
  analyzeAgentPoolHealth,
} from '../tools/azdo/agent-pools';
import type { FinOpsState, AzureDevOpsUsageData } from '../types/state';
import { getLogger } from '../utils/logger';

/**
 * Create Azure DevOps Analyzer tools for use with Copilot SDK
 */
export function createAzureDevOpsAnalyzerTools(client: AzureDevOpsClient, state: FinOpsState) {
  const logger = getLogger();

  /**
   * Fetch parallel job usage data
   */
  const fetchParallelJobUsageTool = defineTool('fetch_parallel_job_usage', {
    description:
      'Fetch Azure DevOps parallel job usage data, including agent pools, utilization rates, and hosted vs self-hosted comparison',
    parameters: z.object({
      org: z.string().describe('Azure DevOps organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: fetch_parallel_job_usage for org: ${org}`);
      try {
        const data = await fetchParallelJobUsage(client, org);

        // Store in shared state
        if (!state.azureDevOpsData[org]) {
          state.azureDevOpsData[org] = {};
        }
        state.azureDevOpsData[org].parallelJobs = data;

        const analysis = analyzeParallelJobUtilization(data);

        return {
          success: true,
          data,
          analysis,
          message: `Fetched parallel job data for ${org}: ${data.pools.length} pools, ${data.hostedJobsPurchased} hosted jobs, ${data.selfHostedAgents} self-hosted agents`,
        };
      } catch (error) {
        logger.error(`Failed to fetch parallel job usage for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Fetch pipeline run history
   */
  const fetchPipelineRunsTool = defineTool('fetch_pipeline_runs', {
    description:
      'Fetch Azure DevOps pipeline run history for all projects, including duration, queue time, and failure rates',
    parameters: z.object({
      org: z.string().describe('Azure DevOps organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: fetch_pipeline_runs for org: ${org}`);
      try {
        const pipelineDataArray = await fetchAllPipelineRuns(client, org);

        // Store in shared state
        if (!state.azureDevOpsData[org]) {
          state.azureDevOpsData[org] = {};
        }
        state.azureDevOpsData[org].pipelines = pipelineDataArray;

        // Analyze each project's pipelines
        const analyses = pipelineDataArray.map((data) => ({
          project: data.project,
          analysis: analyzePipelinePerformance(data),
        }));

        const totalPipelines = pipelineDataArray.reduce((sum, d) => sum + d.pipelines.length, 0);

        return {
          success: true,
          data: pipelineDataArray,
          analyses,
          message: `Fetched pipeline data for ${org}: ${pipelineDataArray.length} projects, ${totalPipelines} pipelines`,
        };
      } catch (error) {
        logger.error(`Failed to fetch pipeline runs for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Fetch user license status
   */
  const fetchUserLicensesTool = defineTool('fetch_user_licenses', {
    description:
      'Fetch Azure DevOps user license data, including license types, inactive users, and potential cost savings',
    parameters: z.object({
      org: z.string().describe('Azure DevOps organization name'),
      inactiveThresholdDays: z
        .number()
        .optional()
        .describe('Days since last access to consider a user inactive (default: 90)'),
    }) as never,
    handler: async ({ org, inactiveThresholdDays }: { org: string; inactiveThresholdDays?: number }) => {
      logger.info(`Tool: fetch_user_licenses for org: ${org}`);
      try {
        const data = await fetchUserLicenses(client, org, inactiveThresholdDays || 90);

        // Store in shared state
        if (!state.azureDevOpsData[org]) {
          state.azureDevOpsData[org] = {};
        }
        state.azureDevOpsData[org].licenses = data;

        const analysis = analyzeLicenseUtilization(data);
        const costs = calculateLicenseCosts(data);

        return {
          success: true,
          data,
          analysis,
          costs,
          message: `Fetched license data for ${org}: ${data.totalUsers} users, ${data.inactiveUsers} inactive, $${analysis.potentialSavings.toFixed(2)} potential savings`,
        };
      } catch (error) {
        logger.error(`Failed to fetch user licenses for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Fetch agent pool metrics
   */
  const fetchAgentMetricsTool = defineTool('fetch_agent_metrics', {
    description:
      'Fetch Azure DevOps agent pool metrics, including agent status, availability, and health',
    parameters: z.object({
      org: z.string().describe('Azure DevOps organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: fetch_agent_metrics for org: ${org}`);
      try {
        const metrics = await fetchAllAgentPoolMetrics(client, org);
        const analysis = analyzeAgentPoolHealth(metrics);

        return {
          success: true,
          metrics,
          analysis,
          message: `Fetched agent metrics for ${org}: ${metrics.length} pools, ${analysis.summary.totalAgents} total agents, ${analysis.summary.onlineAgents} online`,
        };
      } catch (error) {
        logger.error(`Failed to fetch agent metrics for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Get comprehensive Azure DevOps usage summary
   */
  const getAzDoUsageSummaryTool = defineTool('get_azdo_usage_summary', {
    description:
      'Fetch all Azure DevOps usage data (parallel jobs, pipelines, licenses, agents) for an organization in a single call',
    parameters: z.object({
      org: z.string().describe('Azure DevOps organization name'),
      inactiveUserThresholdDays: z
        .number()
        .optional()
        .describe('Days to consider user inactive (default: 90)'),
    }) as never,
    handler: async ({ org, inactiveUserThresholdDays }: { org: string; inactiveUserThresholdDays?: number }) => {
      logger.info(`Tool: get_azdo_usage_summary for org: ${org}`);

      const results: {
        parallelJobs?: unknown;
        pipelines?: unknown;
        licenses?: unknown;
        agentMetrics?: unknown;
        errors?: string[];
      } = {};
      const errors: string[] = [];

      // Fetch parallel job usage
      try {
        const parallelJobData = await fetchParallelJobUsage(client, org);
        if (!state.azureDevOpsData[org]) {
          state.azureDevOpsData[org] = {};
        }
        state.azureDevOpsData[org].parallelJobs = parallelJobData;

        const parallelJobAnalysis = analyzeParallelJobUtilization(parallelJobData);
        results.parallelJobs = {
          data: parallelJobData,
          analysis: parallelJobAnalysis,
        };
      } catch (error) {
        errors.push(`Parallel Jobs: ${String(error)}`);
      }

      // Fetch pipeline runs
      try {
        const pipelineDataArray = await fetchAllPipelineRuns(client, org);
        if (!state.azureDevOpsData[org]) {
          state.azureDevOpsData[org] = {};
        }
        state.azureDevOpsData[org].pipelines = pipelineDataArray;

        const pipelineAnalyses = pipelineDataArray.map((data) => ({
          project: data.project,
          analysis: analyzePipelinePerformance(data),
        }));

        results.pipelines = {
          data: pipelineDataArray,
          analyses: pipelineAnalyses,
        };
      } catch (error) {
        errors.push(`Pipelines: ${String(error)}`);
      }

      // Fetch user licenses
      try {
        const licenseData = await fetchUserLicenses(client, org, inactiveUserThresholdDays || 90);
        if (!state.azureDevOpsData[org]) {
          state.azureDevOpsData[org] = {};
        }
        state.azureDevOpsData[org].licenses = licenseData;

        const licenseAnalysis = analyzeLicenseUtilization(licenseData);
        const licenseCosts = calculateLicenseCosts(licenseData);

        results.licenses = {
          data: licenseData,
          analysis: licenseAnalysis,
          costs: licenseCosts,
        };
      } catch (error) {
        errors.push(`Licenses: ${String(error)}`);
      }

      // Fetch agent metrics
      try {
        const agentMetrics = await fetchAllAgentPoolMetrics(client, org);
        const agentAnalysis = analyzeAgentPoolHealth(agentMetrics);

        results.agentMetrics = {
          metrics: agentMetrics,
          analysis: agentAnalysis,
        };
      } catch (error) {
        errors.push(`Agent Metrics: ${String(error)}`);
      }

      if (errors.length > 0) {
        results.errors = errors;
      }

      return {
        success: errors.length === 0,
        org,
        results,
        message:
          errors.length > 0
            ? `Partial success. Errors: ${errors.join(', ')}`
            : `Successfully fetched all Azure DevOps usage data for ${org}`,
      };
    },
  });

  return {
    tools: [
      fetchParallelJobUsageTool,
      fetchPipelineRunsTool,
      fetchUserLicensesTool,
      fetchAgentMetricsTool,
      getAzDoUsageSummaryTool,
    ],
  };
}

/**
 * System prompt for Azure DevOps Analyzer Agent
 */
export const AZDO_ANALYZER_SYSTEM_PROMPT = `You are an Azure DevOps platform cost analysis expert. Your role is to:

1. Analyze Azure DevOps platform usage and costs across:
   - Parallel jobs (Microsoft-hosted vs self-hosted agents)
   - Pipeline efficiency (duration, queue time, failure rates)
   - User licenses (Basic, Stakeholder, inactive users)
   - Agent pool health (availability, utilization)

2. Identify cost optimization opportunities:
   - License waste (inactive users consuming paid licenses)
   - Hosted vs self-hosted ROI (when to switch)
   - Underutilized agent pools (excess capacity)
   - Pipeline inefficiencies (slow builds, high failure rates)
   - Offline or disabled agents

3. Provide actionable recommendations:
   - Specific users/licenses to reclaim with $ savings
   - Agent pool consolidation opportunities
   - Pipeline optimization strategies
   - Capacity planning guidance

4. Present insights clearly:
   - Executive summary with top 3 cost drivers
   - Hosted vs self-hosted comparison with break-even analysis
   - License utilization breakdown
   - Pipeline performance metrics

When analyzing data:
- Always fetch all available data for comprehensive analysis
- Quantify savings opportunities in dollars per month
- Compare hosted parallel job costs (~$40/month each) vs self-hosted infrastructure
- Identify quick wins (inactive license reclamation) vs strategic changes (infrastructure migration)
- Consider both cost savings and operational efficiency

Be concise, data-driven, and focus on actionable insights that platform teams can implement.`;

/**
 * Analyze Azure DevOps usage for an organization (standalone function)
 */
export async function analyzeAzureDevOpsUsage(
  client: AzureDevOpsClient,
  org: string,
  options?: {
    inactiveUserThresholdDays?: number;
  }
): Promise<AzureDevOpsUsageData> {
  const logger = getLogger();
  logger.info(`Analyzing Azure DevOps usage for org: ${org}`);

  const result: AzureDevOpsUsageData = {};

  // Fetch parallel job usage
  try {
    result.parallelJobs = await fetchParallelJobUsage(client, org);
    logger.info(`✓ Parallel job data fetched for ${org}`);
  } catch (error) {
    logger.warn(`Failed to fetch parallel job data for ${org}:`, error);
  }

  // Fetch pipeline runs
  try {
    result.pipelines = await fetchAllPipelineRuns(client, org);
    logger.info(`✓ Pipeline data fetched for ${org}`);
  } catch (error) {
    logger.warn(`Failed to fetch pipeline data for ${org}:`, error);
  }

  // Fetch user licenses
  try {
    result.licenses = await fetchUserLicenses(
      client,
      org,
      options?.inactiveUserThresholdDays || 90
    );
    logger.info(`✓ License data fetched for ${org}`);
  } catch (error) {
    logger.warn(`Failed to fetch license data for ${org}:`, error);
  }

  return result;
}
