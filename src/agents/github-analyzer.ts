/**
 * GitHub Analyzer Agent
 * Analyzes GitHub platform costs using Copilot SDK
 */

import { defineTool } from '@github/copilot-sdk';
import { z } from 'zod';
import { GitHubClient } from '../clients/github-client';
import { fetchActionsBilling, analyzeWorkflowEfficiency } from '../tools/github/actions-billing';
import { fetchLFSBilling, analyzeLFSUsage } from '../tools/github/lfs-billing';
import {
  fetchCodespacesBilling,
  analyzeCodespacesUsage,
  calculateCodespacesCosts,
} from '../tools/github/codespaces-billing';
import type { FinOpsState, GitHubUsageData } from '../types/state';
import { getLogger } from '../utils/logger';

/**
 * Create GitHub Analyzer tools for use with Copilot SDK
 */
export function createGitHubAnalyzerTools(client: GitHubClient, state: FinOpsState) {
  const logger = getLogger();

  /**
   * Fetch GitHub Actions billing data
   */
  const fetchActionsBillingTool = defineTool('fetch_actions_billing', {
    description:
      'Fetch GitHub Actions billing and usage data for an organization, including minutes by OS type and top workflows',
    parameters: z.object({
      org: z.string().describe('GitHub organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: fetch_actions_billing for org: ${org}`);
      try {
        const data = await fetchActionsBilling(client, org);

        // Store in shared state
        if (!state.githubData[org]) {
          state.githubData[org] = {};
        }
        state.githubData[org].actions = data;

        const analysis = analyzeWorkflowEfficiency(data);

        return {
          success: true,
          data,
          analysis,
          message: `Fetched Actions billing for ${org}: ${data.totalMinutesUsed} total minutes, ${data.paidMinutesUsed} paid minutes`,
        };
      } catch (error) {
        logger.error(`Failed to fetch Actions billing for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Fetch GitHub LFS billing data
   */
  const fetchLFSBillingTool = defineTool('fetch_lfs_billing', {
    description:
      'Fetch GitHub LFS (Large File Storage) billing data for an organization, including storage usage and costs',
    parameters: z.object({
      org: z.string().describe('GitHub organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: fetch_lfs_billing for org: ${org}`);
      try {
        const data = await fetchLFSBilling(client, org);

        // Store in shared state
        if (!state.githubData[org]) {
          state.githubData[org] = {};
        }
        state.githubData[org].lfs = data;

        const analysis = analyzeLFSUsage(data);

        return {
          success: true,
          data,
          analysis,
          message: `Fetched LFS billing for ${org}: ${data.storageGB.toFixed(2)} GB storage, $${data.estimatedMonthlyCost.toFixed(2)}/month`,
        };
      } catch (error) {
        logger.error(`Failed to fetch LFS billing for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Fetch GitHub Codespaces billing data
   */
  const fetchCodespacesBillingTool = defineTool('fetch_codespaces_billing', {
    description:
      'Fetch GitHub Codespaces billing data for an organization, including hours used, machine types, and idle codespaces',
    parameters: z.object({
      org: z.string().describe('GitHub organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: fetch_codespaces_billing for org: ${org}`);
      try {
        const data = await fetchCodespacesBilling(client, org);

        // Store in shared state
        if (!state.githubData[org]) {
          state.githubData[org] = {};
        }
        state.githubData[org].codespaces = data;

        const analysis = analyzeCodespacesUsage(data);
        const costs = calculateCodespacesCosts(data);

        return {
          success: true,
          data,
          analysis,
          costs,
          message: `Fetched Codespaces billing for ${org}: ${data.totalHours} hours, ${data.idleCodespaces.length} idle codespaces`,
        };
      } catch (error) {
        logger.error(`Failed to fetch Codespaces billing for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Get comprehensive GitHub usage summary
   */
  const getGitHubUsageSummaryTool = defineTool('get_github_usage_summary', {
    description:
      'Fetch all GitHub usage data (Actions, LFS, Codespaces) for an organization in a single call',
    parameters: z.object({
      org: z.string().describe('GitHub organization name'),
    }) as never,
    handler: async ({ org }: { org: string }) => {
      logger.info(`Tool: get_github_usage_summary for org: ${org}`);

      const results: {
        actions?: unknown;
        lfs?: unknown;
        codespaces?: unknown;
        errors?: string[];
      } = {};
      const errors: string[] = [];

      // Fetch Actions billing
      try {
        const actionsData = await fetchActionsBilling(client, org);
        if (!state.githubData[org]) {
          state.githubData[org] = {};
        }
        state.githubData[org].actions = actionsData;

        const actionsAnalysis = analyzeWorkflowEfficiency(actionsData);
        results.actions = {
          data: actionsData,
          analysis: actionsAnalysis,
        };
      } catch (error) {
        errors.push(`Actions: ${String(error)}`);
      }

      // Fetch LFS billing
      try {
        const lfsData = await fetchLFSBilling(client, org);
        if (!state.githubData[org]) {
          state.githubData[org] = {};
        }
        state.githubData[org].lfs = lfsData;

        const lfsAnalysis = analyzeLFSUsage(lfsData);
        results.lfs = {
          data: lfsData,
          analysis: lfsAnalysis,
        };
      } catch (error) {
        errors.push(`LFS: ${String(error)}`);
      }

      // Fetch Codespaces billing
      try {
        const codespacesData = await fetchCodespacesBilling(client, org);
        if (!state.githubData[org]) {
          state.githubData[org] = {};
        }
        state.githubData[org].codespaces = codespacesData;

        const codespacesAnalysis = analyzeCodespacesUsage(codespacesData);
        const codespacesCosts = calculateCodespacesCosts(codespacesData);
        results.codespaces = {
          data: codespacesData,
          analysis: codespacesAnalysis,
          costs: codespacesCosts,
        };
      } catch (error) {
        errors.push(`Codespaces: ${String(error)}`);
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
            : `Successfully fetched all GitHub usage data for ${org}`,
      };
    },
  });

  /**
   * Analyze specific workflow efficiency
   */
  const analyzeWorkflowEfficiencyTool = defineTool('analyze_workflow_efficiency', {
    description:
      'Analyze efficiency of workflows for a GitHub organization, identifying high-cost or problematic workflows',
    parameters: z.object({
      org: z.string().describe('GitHub organization name'),
    }) as never,
    handler: ({ org }: { org: string }) => {
      logger.info(`Tool: analyze_workflow_efficiency for org: ${org}`);

      // Check if we have Actions data
      const actionsData = state.githubData[org]?.actions;
      if (!actionsData) {
        return {
          success: false,
          error: `No Actions data available for ${org}. Run fetch_actions_billing first.`,
        };
      }

      const analysis = analyzeWorkflowEfficiency(actionsData);

      return {
        success: true,
        org,
        analysis,
        topWorkflows: actionsData.topWorkflows,
        message: `Found ${analysis.inefficientWorkflows.length} inefficient workflows and ${analysis.recommendations.length} recommendations`,
      };
    },
  });

  return {
    tools: [
      fetchActionsBillingTool,
      fetchLFSBillingTool,
      fetchCodespacesBillingTool,
      getGitHubUsageSummaryTool,
      analyzeWorkflowEfficiencyTool,
    ],
  };
}

/**
 * System prompt for GitHub Analyzer Agent
 */
export const GITHUB_ANALYZER_SYSTEM_PROMPT = `You are a GitHub platform cost analysis expert. Your role is to:

1. Analyze GitHub platform usage and costs across:
   - GitHub Actions (CI/CD minutes, runner types, workflow efficiency)
   - LFS (Large File Storage and bandwidth)
   - Codespaces (development environments, machine types, idle instances)

2. Identify cost optimization opportunities:
   - Inefficient workflows (high failure rates, excessive duration)
   - Over-provisioned resources (premium machines when standard suffices)
   - Waste (idle Codespaces, excessive macOS runner usage)
   - License inefficiencies (paid minutes when free tier available)

3. Provide actionable recommendations:
   - Specific steps to reduce costs
   - Estimated savings from each recommendation
   - Priority ranking (quick wins vs strategic changes)

4. Present insights clearly:
   - Executive summary with top 3 findings
   - Detailed breakdown by category
   - Visual comparisons (e.g., cost by OS type, top consumers)

When analyzing data:
- Always fetch all available data for comprehensive analysis
- Compare current usage against free tier limits
- Highlight trends and anomalies
- Quantify cost impact in dollars
- Consider both immediate fixes and long-term optimizations

Be concise, data-driven, and focus on actionable insights that engineering teams can implement.`;

/**
 * Analyze GitHub usage for an organization (standalone function)
 */
export async function analyzeGitHubUsage(
  client: GitHubClient,
  org: string
): Promise<GitHubUsageData> {
  const logger = getLogger();
  logger.info(`Analyzing GitHub usage for org: ${org}`);

  const result: GitHubUsageData = {};

  // Fetch Actions data
  try {
    result.actions = await fetchActionsBilling(client, org);
    logger.info(`✓ Actions data fetched for ${org}`);
  } catch (error) {
    logger.warn(`Failed to fetch Actions data for ${org}:`, error);
  }

  // Fetch LFS data
  try {
    result.lfs = await fetchLFSBilling(client, org);
    logger.info(`✓ LFS data fetched for ${org}`);
  } catch (error) {
    logger.warn(`Failed to fetch LFS data for ${org}:`, error);
  }

  // Fetch Codespaces data
  try {
    result.codespaces = await fetchCodespacesBilling(client, org);
    logger.info(`✓ Codespaces data fetched for ${org}`);
  } catch (error) {
    logger.warn(`Failed to fetch Codespaces data for ${org}:`, error);
  }

  return result;
}
