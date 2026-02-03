/**
 * JSON report generator
 */

import type { FinOpsReport } from '../../types/report';
import type { FinOpsState } from '../../types/state';
import { calculateTotalCosts } from '../cost/calculator';
import { generateRecommendations, calculateTotalPotentialSavings } from './recommendations';
import { getPricing } from '../../utils/pricing';
import { getLogger } from '../../utils/logger';

/**
 * Generate a complete JSON report
 */
export function generateJSONReport(state: FinOpsState): string {
  const logger = getLogger();
  logger.info('Generating JSON report');

  const report = buildJSONReportStructure(state);
  const json = JSON.stringify(report, null, 2);

  logger.info(`JSON report generated (${json.length} characters)`);
  return json;
}

/**
 * Build the complete report structure for JSON export
 */
function buildJSONReportStructure(state: FinOpsState): FinOpsReport & { rawData: unknown } {
  const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);
  const recommendations = generateRecommendations(state);
  const totalPotentialSavings = calculateTotalPotentialSavings(recommendations);
  const pricing = getPricing();

  // Build cost breakdown table
  const costBreakdownRows: FinOpsReport['costOverview']['rows'] = [];

  // GitHub costs
  for (const [org, data] of Object.entries(state.githubData)) {
    if (data.actions) {
      costBreakdownRows.push({
        organization: org,
        platform: 'GitHub',
        category: 'Actions',
        cost: costs.github?.actions.currentMonthCost || 0,
        trend: 'stable',
      });
    }
    if (data.lfs) {
      costBreakdownRows.push({
        organization: org,
        platform: 'GitHub',
        category: 'LFS',
        cost: costs.github?.lfs.currentMonthCost || 0,
        trend: 'stable',
      });
    }
    if (data.codespaces) {
      costBreakdownRows.push({
        organization: org,
        platform: 'GitHub',
        category: 'Codespaces',
        cost: costs.github?.codespaces.currentMonthCost || 0,
        trend: 'stable',
      });
    }
  }

  // Azure DevOps costs
  for (const [org, data] of Object.entries(state.azureDevOpsData)) {
    if (data.parallelJobs) {
      costBreakdownRows.push({
        organization: org,
        platform: 'Azure DevOps',
        category: 'Parallel Jobs',
        cost: costs.azureDevOps?.parallelJobs.currentMonthCost || 0,
        trend: 'stable',
      });
    }
    if (data.licenses) {
      costBreakdownRows.push({
        organization: org,
        platform: 'Azure DevOps',
        category: 'Licenses',
        cost: costs.azureDevOps?.licenses.currentMonthCost || 0,
        trend: 'stable',
      });
    }
  }

  // Top cost drivers
  const topDrivers = costBreakdownRows
    .map((row) => ({
      platform: row.platform,
      category: row.category,
      cost: row.cost,
      percentage: costs.grandTotal > 0 ? (row.cost / costs.grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 3);

  const report: FinOpsReport & { rawData: unknown } = {
    title: 'DevPlatform FinOps Analysis Report',
    subtitle: 'Cost Analysis and Optimization Recommendations',
    executiveSummary: {
      totalMonthlyCost: costs.grandTotal,
      topCostDrivers: topDrivers,
      totalPotentialSavings,
      highPriorityRecommendations: recommendations.filter((r) => r.priority === 'high').length,
      keyFindings: buildKeyFindings(state, costs),
      generatedAt: new Date().toISOString(),
    },
    costOverview: {
      headers: ['Organization', 'Platform', 'Category', 'Monthly Cost', 'Trend'],
      rows: costBreakdownRows,
      totals: {
        github: costs.github?.total || 0,
        azdo: costs.azureDevOps?.total || 0,
        overall: costs.grandTotal,
      },
    },
    githubSection: buildGitHubSection(state, costs),
    azureDevOpsSection: buildAzureDevOpsSection(state, costs),
    recommendations,
    appendix: {
      methodology:
        'Analyzed platform usage data via GitHub and Azure DevOps APIs, calculated costs using current pricing rates, identified optimization opportunities.',
      pricingSource: pricing.source,
      pricingLastUpdated: pricing.lastUpdated,
      dataCollectionTimestamp: new Date().toISOString(),
      organizationsAnalyzed: {
        github: Object.keys(state.githubData),
        azdo: Object.keys(state.azureDevOpsData),
      },
      toolVersion: '0.1.0',
    },
    generatedAt: new Date().toISOString(),
    format: 'json',
    rawData: {
      githubData: state.githubData,
      azureDevOpsData: state.azureDevOpsData,
      costs: state.costs,
    },
  };

  return report;
}

/**
 * Build key findings from state data
 */
function buildKeyFindings(state: FinOpsState, costs: ReturnType<typeof calculateTotalCosts>): string[] {
  const findings: string[] = [];

  // GitHub findings
  const githubOrgs = Object.keys(state.githubData);
  if (githubOrgs.length > 0) {
    const totalActions = Object.values(state.githubData).reduce(
      (sum, data) => sum + (data.actions?.totalMinutesUsed || 0),
      0
    );
    if (totalActions > 0) {
      findings.push(
        `GitHub Actions consumed ${totalActions.toLocaleString()} minutes across ${githubOrgs.length} organizations`
      );
    }

    const totalCodespaces = Object.values(state.githubData).reduce(
      (sum, data) => sum + (data.codespaces?.totalHours || 0),
      0
    );
    if (totalCodespaces > 0) {
      findings.push(`GitHub Codespaces used ${totalCodespaces.toLocaleString()} hours`);
    }
  }

  // Azure DevOps findings
  const azdoOrgs = Object.keys(state.azureDevOpsData);
  if (azdoOrgs.length > 0) {
    const totalUsers = Object.values(state.azureDevOpsData).reduce(
      (sum, data) => sum + (data.licenses?.totalUsers || 0),
      0
    );
    const inactiveUsers = Object.values(state.azureDevOpsData).reduce(
      (sum, data) => sum + (data.licenses?.inactiveUsers || 0),
      0
    );

    if (totalUsers > 0) {
      findings.push(
        `Azure DevOps has ${totalUsers} users, ${inactiveUsers} inactive (${((inactiveUsers / totalUsers) * 100).toFixed(1)}%)`
      );
    }
  }

  // Cost insights
  if (costs.grandTotal > 1000) {
    findings.push(`Total platform costs exceed $1,000/month - significant optimization opportunity`);
  }

  return findings.slice(0, 5);
}

/**
 * Build GitHub platform section
 */
function buildGitHubSection(
  state: FinOpsState,
  costs: ReturnType<typeof calculateTotalCosts>
): FinOpsReport['githubSection'] {
  const orgs = Object.keys(state.githubData);
  if (orgs.length === 0) return undefined;

  const totalCost = costs.github?.total || 0;

  const costBreakdown = [
    {
      category: 'Actions',
      cost: costs.github?.actions.currentMonthCost || 0,
      percentage: totalCost > 0 ? ((costs.github?.actions.currentMonthCost || 0) / totalCost) * 100 : 0,
      trend: 'stable' as const,
    },
    {
      category: 'LFS',
      cost: costs.github?.lfs.currentMonthCost || 0,
      percentage: totalCost > 0 ? ((costs.github?.lfs.currentMonthCost || 0) / totalCost) * 100 : 0,
      trend: 'stable' as const,
    },
    {
      category: 'Codespaces',
      cost: costs.github?.codespaces.currentMonthCost || 0,
      percentage: totalCost > 0 ? ((costs.github?.codespaces.currentMonthCost || 0) / totalCost) * 100 : 0,
      trend: 'stable' as const,
    },
  ];

  return {
    platform: 'github',
    organizationCount: orgs.length,
    totalCost,
    costBreakdown,
    findings: [],
    concerns: [],
  };
}

/**
 * Build Azure DevOps platform section
 */
function buildAzureDevOpsSection(
  state: FinOpsState,
  costs: ReturnType<typeof calculateTotalCosts>
): FinOpsReport['azureDevOpsSection'] {
  const orgs = Object.keys(state.azureDevOpsData);
  if (orgs.length === 0) return undefined;

  const totalCost = costs.azureDevOps?.total || 0;

  const costBreakdown = [
    {
      category: 'Parallel Jobs',
      cost: costs.azureDevOps?.parallelJobs.currentMonthCost || 0,
      percentage: totalCost > 0 ? ((costs.azureDevOps?.parallelJobs.currentMonthCost || 0) / totalCost) * 100 : 0,
      trend: 'stable' as const,
    },
    {
      category: 'Licenses',
      cost: costs.azureDevOps?.licenses.currentMonthCost || 0,
      percentage: totalCost > 0 ? ((costs.azureDevOps?.licenses.currentMonthCost || 0) / totalCost) * 100 : 0,
      trend: 'stable' as const,
    },
  ];

  return {
    platform: 'azdo',
    organizationCount: orgs.length,
    totalCost,
    costBreakdown,
    findings: [],
    concerns: [],
  };
}
