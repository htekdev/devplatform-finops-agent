import type { AnalysisReport } from '../../models/analysis-report.js';

export function formatAsMarkdown(report: AnalysisReport): string {
  const lines: string[] = [];

  // Header
  lines.push('# FinOps Analysis Report');
  lines.push('');
  lines.push(
    `**Generated**: ${report.metadata.generatedAt.toISOString()} | **Organizations**: ${report.scope.organizations.join(', ')}`
  );
  lines.push('');

  // Executive Summary
  lines.push('## Executive Summary');
  lines.push('');
  lines.push(`- **Total Monthly Spend**: $${report.summary.totalMonthlyCost.toFixed(2)}`);
  lines.push(
    `- **Potential Monthly Savings**: $${report.summary.totalPotentialSavings.monthly.toFixed(2)} (${((report.summary.totalPotentialSavings.monthly / report.summary.totalMonthlyCost) * 100).toFixed(1)}%)`
  );
  lines.push('');

  // Top Cost Drivers
  if (report.summary.topCostDrivers.length > 0) {
    lines.push('### Top Cost Drivers');
    lines.push('');
    report.summary.topCostDrivers.forEach((driver, index) => {
      lines.push(
        `${index + 1}. ${driver.description} - $${driver.monthlyCost.toFixed(2)}/mo (${driver.percentage.toFixed(1)}%)`
      );
    });
    lines.push('');
  }

  // Priority Recommendations
  if (report.summary.topRecommendations.length > 0) {
    lines.push('### Priority Recommendations');
    lines.push('');
    lines.push('| # | Action | Monthly Savings | Effort |');
    lines.push('|---|--------|----------------|--------|');

    report.recommendations.slice(0, 10).forEach((rec, index) => {
      lines.push(
        `| ${index + 1} | ${rec.title} | $${rec.savings.monthly.toFixed(2)}/mo | ${rec.executionParams.effort} |`
      );
    });
    lines.push('');
  }

  // Detailed Recommendations
  if (report.recommendations.length > 0) {
    lines.push('## Detailed Recommendations');
    lines.push('');

    report.recommendations.forEach((rec, index) => {
      lines.push(`### ${index + 1}. ${rec.title}`);
      lines.push('');
      lines.push(`**Description**: ${rec.description}`);
      lines.push(`**Savings**: $${rec.savings.monthly.toFixed(2)}/month ($${rec.savings.annual.toFixed(2)}/year)`);
      lines.push(`**Effort**: ${rec.executionParams.effort} | **Risk**: ${rec.executionParams.risk}`);
      lines.push(`**Platform**: ${rec.target.platform} | **Resource**: ${rec.target.resourceName}`);
      lines.push('');
    });
  }

  // Diagnostics
  if (report.diagnostics.length > 0) {
    lines.push('## Diagnostics');
    lines.push('');
    report.diagnostics.forEach((diag) => {
      const icon = diag.level === 'error' ? '❌' : diag.level === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`${icon} **${diag.level.toUpperCase()}**: ${diag.message} (${diag.code})`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export function formatAsJson(report: AnalysisReport): string {
  return JSON.stringify(
    report,
    (_key, value) => {
      // Convert Date objects to ISO strings
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    },
    2
  );
}
