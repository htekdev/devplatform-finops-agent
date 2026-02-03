/**
 * Report Generator Agent
 * Generates human-readable reports with actionable recommendations
 */

import { defineTool } from '@github/copilot-sdk';
import { z } from 'zod';
import { generateMarkdownReport } from '../tools/report/markdown-generator';
import { generateJSONReport } from '../tools/report/json-generator';
import {
  generateRecommendations,
  prioritizeRecommendations,
  calculateTotalPotentialSavings,
} from '../tools/report/recommendations';
import { calculateTotalCosts } from '../tools/cost/calculator';
import type { FinOpsState } from '../types/state';
import { getLogger } from '../utils/logger';

/**
 * Create Report Generator tools for use with Copilot SDK
 */
export function createReportGeneratorTools(state: FinOpsState) {
  const logger = getLogger();

  /**
   * Generate executive summary
   */
  const generateExecutiveSummaryTool = defineTool('generate_executive_summary', {
    description:
      'Generate a concise executive summary of the FinOps analysis with total costs, top drivers, and key recommendations',
    parameters: z.object({}) as never,
    handler: () => {
      logger.info(`Tool: generate_executive_summary`);

      try {
        const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);
        const recommendations = generateRecommendations(state);
        const totalPotentialSavings = calculateTotalPotentialSavings(recommendations);

        // Build cost breakdown for top drivers
        const costItems: Array<{ platform: string; category: string; cost: number }> = [];

        if (costs.github) {
          costItems.push(
            { platform: 'GitHub', category: 'Actions', cost: costs.github.actions.currentMonthCost },
            { platform: 'GitHub', category: 'LFS', cost: costs.github.lfs.currentMonthCost },
            { platform: 'GitHub', category: 'Codespaces', cost: costs.github.codespaces.currentMonthCost }
          );
        }

        if (costs.azureDevOps) {
          costItems.push(
            {
              platform: 'Azure DevOps',
              category: 'Parallel Jobs',
              cost: costs.azureDevOps.parallelJobs.currentMonthCost,
            },
            {
              platform: 'Azure DevOps',
              category: 'Licenses',
              cost: costs.azureDevOps.licenses.currentMonthCost,
            }
          );
        }

        const topDrivers = costItems
          .filter((item) => item.cost > 0)
          .sort((a, b) => b.cost - a.cost)
          .slice(0, 3)
          .map((item) => ({
            platform: item.platform,
            category: item.category,
            cost: item.cost,
            percentage: (item.cost / costs.grandTotal) * 100,
          }));

        const summary = {
          totalMonthlyCost: costs.grandTotal,
          topCostDrivers: topDrivers,
          totalPotentialSavings,
          highPriorityRecommendations: recommendations.filter((r) => r.priority === 'high').length,
          recommendations: recommendations.slice(0, 5).map((r) => ({
            title: r.title,
            savings: r.estimatedMonthlySavings,
            priority: r.priority,
          })),
        };

        return {
          success: true,
          summary,
          message: `Executive Summary: $${costs.grandTotal.toFixed(2)}/month total, $${totalPotentialSavings.toFixed(2)} potential savings, ${recommendations.filter((r) => r.priority === 'high').length} high-priority actions`,
        };
      } catch (error) {
        logger.error(`Failed to generate executive summary:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Generate full Markdown report
   */
  const generateMarkdownReportTool = defineTool('generate_markdown_report', {
    description:
      'Generate a complete Markdown report with all sections: executive summary, cost breakdown, platform analysis, and recommendations',
    parameters: z.object({}) as never,
    handler: () => {
      logger.info(`Tool: generate_markdown_report`);

      try {
        const markdown = generateMarkdownReport(state);

        return {
          success: true,
          report: markdown,
          length: markdown.length,
          message: `Markdown report generated (${markdown.length} characters, ~${Math.ceil(markdown.length / 3000)} pages)`,
        };
      } catch (error) {
        logger.error(`Failed to generate Markdown report:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Generate JSON report
   */
  const generateJSONReportTool = defineTool('generate_json_report', {
    description:
      'Generate a machine-readable JSON report with all data including raw usage data for programmatic access',
    parameters: z.object({}) as never,
    handler: () => {
      logger.info(`Tool: generate_json_report`);

      try {
        const json = generateJSONReport(state);

        return {
          success: true,
          report: json,
          length: json.length,
          message: `JSON report generated (${json.length} characters)`,
        };
      } catch (error) {
        logger.error(`Failed to generate JSON report:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  /**
   * Generate prioritized recommendations
   */
  const generateRecommendationsTool = defineTool('generate_recommendations', {
    description:
      'Generate prioritized, actionable recommendations based on analysis findings with implementation steps and savings estimates',
    parameters: z.object({
      minSavings: z
        .number()
        .optional()
        .describe('Minimum monthly savings to include a recommendation (default: 0)'),
    }) as never,
    handler: ({ minSavings }: { minSavings?: number }) => {
      logger.info(`Tool: generate_recommendations (minSavings: ${minSavings || 0})`);

      try {
        const allRecommendations = generateRecommendations(state);
        const filtered = minSavings
          ? allRecommendations.filter((r) => r.estimatedMonthlySavings >= minSavings)
          : allRecommendations;

        const prioritized = prioritizeRecommendations(filtered);
        const totalSavings = calculateTotalPotentialSavings(filtered);

        return {
          success: true,
          recommendations: filtered,
          prioritized,
          totalPotentialSavings: totalSavings,
          count: {
            total: filtered.length,
            quickWins: prioritized.quickWins.length,
            mediumEffort: prioritized.mediumEffort.length,
            strategic: prioritized.strategic.length,
            high: filtered.filter((r) => r.priority === 'high').length,
            medium: filtered.filter((r) => r.priority === 'medium').length,
            low: filtered.filter((r) => r.priority === 'low').length,
          },
          message: `Generated ${filtered.length} recommendations with $${totalSavings.toFixed(2)} total potential savings`,
        };
      } catch (error) {
        logger.error(`Failed to generate recommendations:`, error);
        return {
          success: false,
          error: String(error),
        };
      }
    },
  });

  return {
    tools: [
      generateExecutiveSummaryTool,
      generateMarkdownReportTool,
      generateJSONReportTool,
      generateRecommendationsTool,
    ],
  };
}

/**
 * System prompt for Report Generator Agent
 */
export const REPORT_GENERATOR_SYSTEM_PROMPT = `You are a FinOps reporting specialist. Your role is to:

1. Generate clear, actionable reports from cost analysis data:
   - Executive summaries for leadership
   - Detailed cost breakdowns for finance teams
   - Technical recommendations for platform teams

2. Present findings effectively:
   - Use tables for cost data
   - Highlight top cost drivers
   - Prioritize recommendations by impact
   - Include implementation steps

3. Tailor content for the audience:
   - Executive summary: High-level costs, top 3 drivers, key actions
   - Detailed analysis: Platform-specific findings and concerns
   - Recommendations: Actionable steps with savings estimates

4. Ensure reports are actionable:
   - Every recommendation has implementation steps
   - Savings quantified in dollars per month
   - Categorized by effort (Quick Wins, Medium Effort, Strategic)
   - Prioritized by priority (High, Medium, Low)

Generate reports that drive action, not just inform. Focus on what teams should do next, not just what the data says.`;
