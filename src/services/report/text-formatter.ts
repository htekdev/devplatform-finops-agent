import type { AnalysisReport } from "../../models/analysis-report.js";

export function formatText(report: AnalysisReport): string {
  const lines: string[] = [];

  lines.push("# FinOps Analysis Report");
  lines.push("");
  lines.push(`**Generated**: ${report.metadata.generatedAt.toISOString()}`);
  lines.push(`**Organizations**: ${report.scope.organizations.join(", ")}`);
  lines.push(`**Platforms**: ${report.scope.platforms.join(", ")}`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push("");
  lines.push(`- **Total Monthly Spend**: $${report.summary.totalMonthlyCost.toFixed(2)}`);
  lines.push(`- **Potential Monthly Savings**: $${report.summary.totalPotentialSavings.monthly.toFixed(2)} (${((report.summary.totalPotentialSavings.monthly / report.summary.totalMonthlyCost) * 100).toFixed(1)}%)`);
  lines.push(`- **Potential Annual Savings**: $${report.summary.totalPotentialSavings.annual.toFixed(2)}`);
  lines.push("");

  lines.push("### Top Cost Drivers");
  for (let i = 0; i < report.summary.topCostDrivers.length && i < 3; i++) {
    const driver = report.summary.topCostDrivers[i];
    lines.push(`${i + 1}. ${driver.description} - $${driver.monthlyCost.toFixed(2)}/mo (${driver.percentage.toFixed(1)}%)`);
  }
  lines.push("");

  lines.push("### Priority Recommendations");
  lines.push("");
  lines.push("| # | Action | Monthly Savings | Effort | Approval |");
  lines.push("|---|--------|----------------|--------|----------|");
  for (let i = 0; i < report.summary.topRecommendations.length && i < 10; i++) {
    const rec = report.recommendations[i];
    if (rec) {
      lines.push(`| ${i + 1} | ${rec.title} | $${rec.savings.monthly.toFixed(2)} | ${rec.executionParams.effort} | ${rec.approval.required ? "Required" : "Not Required"} |`);
    }
  }
  lines.push("");

  if (report.diagnostics.length > 0) {
    lines.push("## Warnings");
    lines.push("");
    for (const diagnostic of report.diagnostics) {
      if (diagnostic.level === "warning" || diagnostic.level === "error") {
        lines.push(`- **${diagnostic.level.toUpperCase()}**: ${diagnostic.message}`);
      }
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`Analysis completed in ${report.metadata.duration.toFixed(2)}s`);
  lines.push("");

  return lines.join("\n");
}
