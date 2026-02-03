/**
 * Cost Calculator Agent
 * Calculates costs from usage data and provides financial insights
 */

import { defineTool } from '@github/copilot-sdk';
import { z } from 'zod';
import {
  calculateGitHubCosts,
  calculateAzdoCosts,
  calculateTotalCosts,
} from '../tools/cost/calculator';
import { compareHostedOptions } from '../tools/cost/hosted-comparison';
import {
  projectFutureCosts,
  checkThresholdBreaches,
  identifyCostAnomalies,
  type HistoricalCostData,
} from '../tools/cost/projections';
import type { FinOpsState } from '../types/state';
import { getLogger } from '../utils/logger';
import { initPricing } from '../utils/pricing';

/**
 * Create Cost Calculator tools for use with Copilot SDK
 */
export function createCostCalculatorTools(state: FinOpsState, pricingConfigPath?: string) {
  const logger = getLogger();

  // Initialize pricing
  initPricing(pricingConfigPath);

  /**
   * Calculate GitHub costs
   */
  const calculateGitHubCostsTool = defineTool('calculate_github_costs', {
    description:
      'Calculate GitHub platform costs including Actions (by OS type), LFS storage/bandwidth, and Codespaces compute',
    parameters: z.object({
      org: z.string().describe('GitHub organization name'),
    }) as never,
    handler: ({ org }: { org: string }) => {
      logger.info(`Tool: calculate_github_costs for org: ${org}`);

      const usage = state.githubData[org];
      if (!usage) {
        return {
          success: false,
          error: `No GitHub usage data available for ${org}. Run GitHub analyzer first.`,
        };
      }

      try {
        const costs = calculateGitHubCosts(usage, org);

        // Store in shared state
        if (!state.costs) {
          state.costs = {
            grandTotal: 0,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          org,
          costs,
          message: `GitHub costs for ${org}: $${costs.totalCost.toFixed(2)}/month (Actions: $${costs.breakdown.actions.toFixed(2)}, LFS: $${costs.breakdown.lfs.toFixed(2)}, Codespaces: $${costs.breakdown.codespaces.toFixed(2)})`,
        };
      } catch (error) {
        logger.error(`Failed to calculate GitHub costs for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Calculate Azure DevOps costs
   */
  const calculateAzdoCostsTool = defineTool('calculate_azdo_costs', {
    description:
      'Calculate Azure DevOps platform costs including parallel jobs (hosted and self-hosted) and user licenses',
    parameters: z.object({
      org: z.string().describe('Azure DevOps organization name'),
    }) as never,
    handler: ({ org }: { org: string }) => {
      logger.info(`Tool: calculate_azdo_costs for org: ${org}`);

      const usage = state.azureDevOpsData[org];
      if (!usage) {
        return {
          success: false,
          error: `No Azure DevOps usage data available for ${org}. Run Azure DevOps analyzer first.`,
        };
      }

      try {
        const costs = calculateAzdoCosts(usage, org);

        return {
          success: true,
          org,
          costs,
          message: `Azure DevOps costs for ${org}: $${costs.totalCost.toFixed(2)}/month (Parallel Jobs: $${costs.breakdown.parallelJobs.toFixed(2)}, Licenses: $${costs.breakdown.licenses.toFixed(2)})`,
        };
      } catch (error) {
        logger.error(`Failed to calculate Azure DevOps costs for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Compare hosted vs self-hosted options
   */
  const compareHostedOptionsTool = defineTool('compare_hosted_options', {
    description:
      'Compare hosted vs self-hosted runner costs with TCO analysis and ROI calculations',
    parameters: z.object({
      org: z.string().describe('Organization name (GitHub or Azure DevOps)'),
      platform: z.enum(['github', 'azdo']).describe('Platform to analyze'),
      averageConcurrentJobs: z
        .number()
        .optional()
        .describe('Average concurrent jobs (estimated from usage data if not provided)'),
    }) as never,
    handler: ({
      org,
      platform,
      averageConcurrentJobs,
    }: {
      org: string;
      platform: 'github' | 'azdo';
      averageConcurrentJobs?: number;
    }) => {
      logger.info(`Tool: compare_hosted_options for ${org} (${platform})`);

      let currentHostedJobs = 0;
      let currentSelfHostedAgents = 0;
      let estimatedConcurrentJobs = averageConcurrentJobs || 1;

      if (platform === 'azdo') {
        const usage = state.azureDevOpsData[org];
        if (usage?.parallelJobs) {
          currentHostedJobs = usage.parallelJobs.hostedJobsPurchased;
          currentSelfHostedAgents = usage.parallelJobs.selfHostedAgents;

          // Estimate concurrent jobs from utilization if not provided
          if (!averageConcurrentJobs && usage.parallelJobs.pools.length > 0) {
            const avgUtilization =
              usage.parallelJobs.pools.reduce((sum, p) => sum + p.utilizationRate * p.totalJobs, 0) /
              usage.parallelJobs.pools.reduce((sum, p) => sum + p.totalJobs, 0);
            estimatedConcurrentJobs = Math.ceil((currentHostedJobs + currentSelfHostedAgents) * avgUtilization);
          }
        }
      }

      try {
        const comparison = compareHostedOptions(
          currentHostedJobs,
          currentSelfHostedAgents,
          estimatedConcurrentJobs,
          platform
        );

        return {
          success: true,
          org,
          platform,
          comparison,
          message: `Recommendation: ${comparison.recommendation.option} - ${comparison.recommendation.reasoning}`,
        };
      } catch (error) {
        logger.error(`Failed to compare hosted options for ${org}:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Project future costs
   */
  const projectFutureCostsTool = defineTool('project_future_costs', {
    description:
      'Project future costs for 1, 3, and 6 months based on historical trends with confidence intervals',
    parameters: z.object({
      platform: z.enum(['github', 'azdo', 'total']).describe('Platform to project'),
      historicalData: z
        .array(
          z.object({
            month: z.string().describe('Month in YYYY-MM format'),
            cost: z.number().describe('Cost for that month'),
          })
        )
        .optional()
        .describe('Historical cost data (optional - will use simple growth if not provided)'),
    }) as never,
    handler: ({
      platform,
      historicalData,
    }: {
      platform: 'github' | 'azdo' | 'total';
      historicalData?: HistoricalCostData[];
    }) => {
      logger.info(`Tool: project_future_costs for platform: ${platform}`);

      // Calculate current costs
      const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);

      let currentCost = 0;
      if (platform === 'github') {
        currentCost = costs.github?.total || 0;
      } else if (platform === 'azdo') {
        currentCost = costs.azureDevOps?.total || 0;
      } else {
        currentCost = costs.grandTotal;
      }

      try {
        const projections = projectFutureCosts(currentCost, historicalData || [], [1, 3, 6]);

        const thresholdBreaches = checkThresholdBreaches(projections, {
          warningThreshold: currentCost * 1.5,
          criticalThreshold: currentCost * 2,
        });

        const anomalies = historicalData ? identifyCostAnomalies(historicalData) : null;

        return {
          success: true,
          platform,
          currentCost,
          projections,
          thresholdBreaches,
          anomalies,
          message: `Projected ${platform} costs: 1-month: $${projections[0]?.projectedCost.toFixed(2)}, 3-month: $${projections[1]?.projectedCost.toFixed(2)}, 6-month: $${projections[2]?.projectedCost.toFixed(2)}`,
        };
      } catch (error) {
        logger.error(`Failed to project future costs:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Get comprehensive cost summary
   */
  const getCostSummaryTool = defineTool('get_cost_summary', {
    description:
      'Get comprehensive cost summary across all platforms with breakdowns, top cost drivers, and optimization opportunities',
    parameters: z.object({}) as never,
    handler: () => {
      logger.info(`Tool: get_cost_summary`);

      try {
        const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);

        // Store in shared state
        state.costs = costs;

        // Identify top cost drivers
        const costDrivers: Array<{ category: string; cost: number; platform: string }> = [];

        if (costs.github) {
          costDrivers.push(
            { category: 'Actions', cost: costs.github.actions.currentMonthCost, platform: 'GitHub' },
            { category: 'LFS', cost: costs.github.lfs.currentMonthCost, platform: 'GitHub' },
            { category: 'Codespaces', cost: costs.github.codespaces.currentMonthCost, platform: 'GitHub' }
          );
        }

        if (costs.azureDevOps) {
          costDrivers.push(
            { category: 'Parallel Jobs', cost: costs.azureDevOps.parallelJobs.currentMonthCost, platform: 'Azure DevOps' },
            { category: 'Licenses', cost: costs.azureDevOps.licenses.currentMonthCost, platform: 'Azure DevOps' }
          );
        }

        // Sort and get top 3
        const topCostDrivers = costDrivers
          .filter((d) => d.cost > 0)
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 3);

        return {
          success: true,
          costs,
          topCostDrivers,
          summary: {
            totalMonthlyCost: costs.grandTotal,
            githubTotal: costs.github?.total || 0,
            azureDevOpsTotal: costs.azureDevOps?.total || 0,
            topDrivers: topCostDrivers.map((d) => `${d.platform} ${d.category}: $${d.cost.toFixed(2)}`),
          },
          message: `Total monthly cost: $${costs.grandTotal.toFixed(2)} (GitHub: $${costs.github?.total || 0}, Azure DevOps: $${costs.azureDevOps?.total || 0})`,
        };
      } catch (error) {
        logger.error(`Failed to get cost summary:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  return {
    tools: [
      calculateGitHubCostsTool,
      calculateAzdoCostsTool,
      compareHostedOptionsTool,
      projectFutureCostsTool,
      getCostSummaryTool,
    ],
  };
}

/**
 * System prompt for Cost Calculator Agent
 */
export const COST_CALCULATOR_SYSTEM_PROMPT = `You are a FinOps cost analysis expert specializing in DevOps platform costs. Your role is to:

1. Calculate accurate costs from usage data:
   - GitHub: Actions (by OS type), LFS storage/bandwidth, Codespaces compute
   - Azure DevOps: Parallel jobs (hosted vs self-hosted), user licenses

2. Identify top cost drivers:
   - Which platforms, categories, and resources cost the most
   - Month-over-month trends and growth rates
   - Projected future costs with confidence intervals

3. Provide financial insights:
   - Total Cost of Ownership (TCO) analysis
   - Hosted vs self-hosted ROI comparisons
   - Break-even calculations for infrastructure investments
   - Savings opportunities with quantified impact

4. Present findings clearly:
   - Executive summary with total monthly costs
   - Top 3 cost drivers
   - Cost optimization recommendations prioritized by savings potential
   - Trend analysis (stable, increasing, decreasing)

When analyzing costs:
- Use actual pricing data (configurable or defaults)
- Account for free tiers accurately
- Consider both direct costs and indirect costs (maintenance, admin time)
- Provide month-over-month comparisons when historical data available
- Flag anomalies and accelerating trends
- Quantify all recommendations in dollars per month

Be precise with numbers, conservative with estimates, and focus on actionable financial insights that drive business decisions.`;

