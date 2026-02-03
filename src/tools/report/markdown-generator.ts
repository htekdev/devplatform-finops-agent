/**
 * Markdown report generator
 */

import type { FinOpsReport, RecommendationItem } from '../../types/report';
import type { FinOpsState } from '../../types/state';
import { calculateTotalCosts } from '../cost/calculator';
import { generateRecommendations, prioritizeRecommendations, calculateTotalPotentialSavings } from './recommendations';
import { getPricing } from '../../utils/pricing';
import { getLogger } from '../../utils/logger';

/**
 * Generate a complete Markdown report
 */
export function generateMarkdownReport(state: FinOpsState): string {
  const logger = getLogger();
  logger.info('Generating Markdown report');

  const report = buildReportStructure(state);
  const markdown = renderMarkdown(report);

  logger.info(`Markdown report generated (${markdown.length} characters)`);
  return markdown;
}

/**
 * Build the report structure from state
 */
function buildReportStructure(state: FinOpsState): FinOpsReport {
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

  const report: FinOpsReport = {
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
    githubSection: buildGitHubSection(state),
    azureDevOpsSection: buildAzureDevOpsSection(state),
    recommendations,
    appendix: {
      methodology: 'Analyzed platform usage data via GitHub and Azure DevOps APIs, calculated costs using current pricing rates, identified optimization opportunities.',
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
    format: 'markdown',
  };

  return report;
}

/**
 * Render the report structure as Markdown
 */
function renderMarkdown(report: FinOpsReport): string {
  const sections: string[] = [];

  // Title
  sections.push(`# ${report.title}\n`);
  sections.push(`**${report.subtitle}**\n`);
  sections.push(`Generated: ${new Date(report.generatedAt).toLocaleString()}\n`);
  sections.push('---\n');

  // Executive Summary
  sections.push('## Executive Summary\n');
  sections.push(`**Total Monthly Cost:** $${report.executiveSummary.totalMonthlyCost.toLocaleString()}\n`);
  sections.push(
    `**Potential Savings:** $${report.executiveSummary.totalPotentialSavings.toLocaleString()} per month\n`
  );
  sections.push(
    `**High Priority Actions:** ${report.executiveSummary.highPriorityRecommendations} recommendations\n`
  );

  sections.push('\n### Top Cost Drivers\n');
  for (let i = 0; i < report.executiveSummary.topCostDrivers.length; i++) {
    const driver = report.executiveSummary.topCostDrivers[i]!;
    sections.push(
      `${i + 1}. **${driver.platform} ${driver.category}**: $${driver.cost.toLocaleString()}/month (${driver.percentage.toFixed(1)}%)\n`
    );
  }

  sections.push('\n### Key Findings\n');
  for (const finding of report.executiveSummary.keyFindings) {
    sections.push(`- ${finding}\n`);
  }

  sections.push('\n---\n');

  // Cost Overview
  sections.push('## Cost Overview\n');
  sections.push('| Organization | Platform | Category | Monthly Cost | Trend |\n');
  sections.push('|--------------|----------|----------|--------------|-------|\n');

  for (const row of report.costOverview.rows) {
    sections.push(
      `| ${row.organization} | ${row.platform} | ${row.category} | $${row.cost.toLocaleString()} | ${row.trend || '-'} |\n`
    );
  }

  sections.push(
    `| **Total** | **GitHub** | | **$${report.costOverview.totals.github.toLocaleString()}** | |\n`
  );
  sections.push(
    `| **Total** | **Azure DevOps** | | **$${report.costOverview.totals.azdo.toLocaleString()}** | |\n`
  );
  sections.push(
    `| **Grand Total** | **All Platforms** | | **$${report.costOverview.totals.overall.toLocaleString()}** | |\n`
  );

  sections.push('\n---\n');

  // GitHub Section
  if (report.githubSection) {
    sections.push('## GitHub Analysis\n');
    sections.push(
      `**Organizations:** ${report.githubSection.organizationCount} | **Total Cost:** $${report.githubSection.totalCost.toLocaleString()}/month\n`
    );

    sections.push('\n### Cost Breakdown\n');
    for (const item of report.githubSection.costBreakdown) {
      const trendIcon = item.trend === 'increasing' ? '📈' : item.trend === 'decreasing' ? '📉' : '➡️';
      sections.push(
        `- **${item.category}**: $${item.cost.toLocaleString()} (${item.percentage.toFixed(1)}%) ${trendIcon}\n`
      );
    }

    if (report.githubSection.findings.length > 0) {
      sections.push('\n### Key Findings\n');
      for (const finding of report.githubSection.findings) {
        sections.push(`- ${finding}\n`);
      }
    }

    if (report.githubSection.concerns.length > 0) {
      sections.push('\n### Concerns\n');
      for (const concern of report.githubSection.concerns) {
        sections.push(`- ⚠️ ${concern}\n`);
      }
    }

    sections.push('\n---\n');
  }

  // Azure DevOps Section
  if (report.azureDevOpsSection) {
    sections.push('## Azure DevOps Analysis\n');
    sections.push(
      `**Organizations:** ${report.azureDevOpsSection.organizationCount} | **Total Cost:** $${report.azureDevOpsSection.totalCost.toLocaleString()}/month\n`
    );

    sections.push('\n### Cost Breakdown\n');
    for (const item of report.azureDevOpsSection.costBreakdown) {
      const trendIcon = item.trend === 'increasing' ? '📈' : item.trend === 'decreasing' ? '📉' : '➡️';
      sections.push(
        `- **${item.category}**: $${item.cost.toLocaleString()} (${item.percentage.toFixed(1)}%) ${trendIcon}\n`
      );
    }

    if (report.azureDevOpsSection.findings.length > 0) {
      sections.push('\n### Key Findings\n');
      for (const finding of report.azureDevOpsSection.findings) {
        sections.push(`- ${finding}\n`);
      }
    }

    if (report.azureDevOpsSection.concerns.length > 0) {
      sections.push('\n### Concerns\n');
      for (const concern of report.azureDevOpsSection.concerns) {
        sections.push(`- ⚠️ ${concern}\n`);
      }
    }

    sections.push('\n---\n');
  }

  // Recommendations
  sections.push('## Recommendations\n');

  const prioritized = prioritizeRecommendations(report.recommendations);

  if (prioritized.quickWins.length > 0) {
    sections.push('### 🎯 Quick Wins (Low Effort, High Impact)\n');
    for (const rec of prioritized.quickWins) {
      sections.push(renderRecommendation(rec));
    }
  }

  if (prioritized.mediumEffort.length > 0) {
    sections.push('### 📊 Medium Effort Optimizations\n');
    for (const rec of prioritized.mediumEffort) {
      sections.push(renderRecommendation(rec));
    }
  }

  if (prioritized.strategic.length > 0) {
    sections.push('### 🎯 Strategic Initiatives\n');
    for (const rec of prioritized.strategic) {
      sections.push(renderRecommendation(rec));
    }
  }

  sections.push('\n---\n');

  // Appendix
  sections.push('## Appendix\n');
  sections.push(`**Methodology:** ${report.appendix.methodology}\n`);
  sections.push(`**Pricing Source:** ${report.appendix.pricingSource} (last updated: ${report.appendix.pricingLastUpdated})\n`);
  sections.push(`**Tool Version:** ${report.appendix.toolVersion}\n`);
  sections.push(
    `**Organizations Analyzed:** ${report.appendix.organizationsAnalyzed.github.length} GitHub, ${report.appendix.organizationsAnalyzed.azdo.length} Azure DevOps\n`
  );

  return sections.join('');
}

/**
 * Render a single recommendation
 */
function renderRecommendation(rec: RecommendationItem): string {
  const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
  const savingsText = rec.estimatedMonthlySavings > 0 
    ? ` **Savings: $${rec.estimatedMonthlySavings.toLocaleString()}/month**` 
    : '';

  let md = `#### ${priorityEmoji} ${rec.title}${savingsText}\n\n`;
  md += `${rec.description}\n\n`;
  md += `**How to implement:**\n`;

  for (let i = 0; i < rec.implementationSteps.length; i++) {
    md += `${i + 1}. ${rec.implementationSteps[i]}\n`;
  }

  md += '\n';
  return md;
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
      findings.push(`GitHub Actions consumed ${totalActions.toLocaleString()} minutes across ${githubOrgs.length} organizations`);
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

  return findings.slice(0, 5); // Max 5 key findings
}

/**
 * Build GitHub platform section
 */
function buildGitHubSection(state: FinOpsState): FinOpsReport['githubSection'] {
  const orgs = Object.keys(state.githubData);
  if (orgs.length === 0) return undefined;

  const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);
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

  const findings: string[] = [];
  const concerns: string[] = [];

  // Analyze Actions
  for (const [org, data] of Object.entries(state.githubData)) {
    if (data.actions) {
      const macosPercent = (data.actions.minutesByOS.macos / data.actions.totalMinutesUsed) * 100;
      if (macosPercent > 30) {
        concerns.push(`${org}: ${macosPercent.toFixed(1)}% of Actions minutes on macOS (10x cost)`);
      }

      if (data.actions.topWorkflows) {
        const highFailure = data.actions.topWorkflows.filter((w) => w.failureRate > 0.2);
        if (highFailure.length > 0) {
          concerns.push(`${org}: ${highFailure.length} workflows with >20% failure rate`);
        }
      }
    }

    if (data.codespaces) {
      if (data.codespaces.idleCodespaces && data.codespaces.idleCodespaces.length > 0) {
        concerns.push(`${org}: ${data.codespaces.idleCodespaces.length} idle Codespaces consuming resources`);
      }
    }
  }

  return {
    platform: 'github',
    organizationCount: orgs.length,
    totalCost,
    costBreakdown,
    findings,
    concerns,
  };
}

/**
 * Build Azure DevOps platform section
 */
function buildAzureDevOpsSection(state: FinOpsState): FinOpsReport['azureDevOpsSection'] {
  const orgs = Object.keys(state.azureDevOpsData);
  if (orgs.length === 0) return undefined;

  const costs = calculateTotalCosts(state.githubData, state.azureDevOpsData);
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

  const findings: string[] = [];
  const concerns: string[] = [];

  for (const [org, data] of Object.entries(state.azureDevOpsData)) {
    if (data.licenses && data.licenses.inactiveUsers > 0) {
      const inactivePercent = (data.licenses.inactiveUsers / data.licenses.totalUsers) * 100;
      concerns.push(
        `${org}: ${data.licenses.inactiveUsers} inactive users (${inactivePercent.toFixed(1)}%) consuming licenses`
      );
    }

    if (data.parallelJobs && data.parallelJobs.pools) {
      const underutilized = data.parallelJobs.pools.filter((p) => p.utilizationRate < 0.3);
      if (underutilized.length > 0) {
        concerns.push(`${org}: ${underutilized.length} agent pools with <30% utilization`);
      }
    }

    if (data.pipelines) {
      const allPipelines = data.pipelines.flatMap((p) => p.pipelines);
      const highFailure = allPipelines.filter((p) => p.failureRate > 0.2);
      if (highFailure.length > 0) {
        concerns.push(`${org}: ${highFailure.length} pipelines with >20% failure rate`);
      }
    }
  }

  return {
    platform: 'azdo',
    organizationCount: orgs.length,
    totalCost,
    costBreakdown,
    findings,
    concerns,
  };
}
