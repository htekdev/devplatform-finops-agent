import { Command } from "commander";
import { getGitHubClient } from "../../services/auth/github-auth.js";
import { getAzureDevOpsClient } from "../../services/auth/azdo-auth.js";
import { analyzeGitHubOrganization } from "../../services/analysis/github-analyzer.js";
import { analyzeAzureDevOpsOrganization } from "../../services/analysis/azdo-analyzer.js";
import { generateRecommendations } from "../../tools/shared/generate-recommendations.js";
import { calculateTotalCost } from "../../services/analysis/combined-analyzer.js";
import { formatJSON } from "../../services/report/json-formatter.js";
import { formatText } from "../../services/report/text-formatter.js";
import { get90DayPeriod } from "../../lib/date-utils.js";
import type { AnalysisReport } from "../../models/analysis-report.js";
import * as fs from "fs";

export function createAnalyzeCommand(): Command {
  const command = new Command("analyze");

  command
    .description("Analyze GitHub and/or Azure DevOps platform costs")
    .option("--github-org <org>", "GitHub organization name")
    .option("--azdo-org <org>", "Azure DevOps organization name")
    .option("--format <format>", "Output format (json, text, both)", "text")
    .option("--output <file>", "Output file path")
    .action(async (options) => {
      const startTime = Date.now();

      try {
        const metrics = [];
        const warnings = [];
        const platforms = [];

        if (options.githubOrg) {
          console.log(`Analyzing GitHub organization: ${options.githubOrg}...`);
          const octokit = await getGitHubClient();
          const result = await analyzeGitHubOrganization(octokit, options.githubOrg);
          metrics.push(...result.metrics);
          warnings.push(...result.warnings);
          platforms.push("github" as const);
        }

        if (options.azdoOrg) {
          console.log(`Analyzing Azure DevOps organization: ${options.azdoOrg}...`);
          const { connection } = await getAzureDevOpsClient(options.azdoOrg);
          const result = await analyzeAzureDevOpsOrganization(connection, options.azdoOrg);
          metrics.push(...result.metrics);
          warnings.push(...result.warnings);
          platforms.push("azure-devops" as const);
        }

        if (metrics.length === 0) {
          console.error("No metrics collected. Please specify --github-org and/or --azdo-org");
          process.exit(1);
        }

        console.log("Generating recommendations...");
        const recommendationsResult = await generateRecommendations(metrics);
        const recommendations = recommendationsResult.success ? recommendationsResult.data || [] : [];

        const totalCost = calculateTotalCost(metrics);
        const totalSavings = recommendations.reduce((sum, rec) => sum + rec.savings.monthly, 0);

        const report: AnalysisReport = {
          id: `report-${Date.now()}`,
          metadata: {
            generatedAt: new Date(),
            generatedBy: "finops-analyzer v0.1.0",
            duration: (Date.now() - startTime) / 1000,
          },
          scope: {
            platforms: platforms as ("github" | "azure-devops")[],
            organizations: [options.githubOrg, options.azdoOrg].filter(Boolean),
            dateRange: get90DayPeriod(),
          },
          summary: {
            totalMonthlyCost: totalCost,
            topCostDrivers: metrics
              .sort((a, b) => b.cost.amount - a.cost.amount)
              .slice(0, 3)
              .map((m) => ({
                description: `${m.resourceName} (${m.resourceType})`,
                monthlyCost: m.cost.amount,
                percentage: (m.cost.amount / totalCost) * 100,
              })),
            topRecommendations: recommendations.slice(0, 3).map((r) => ({
              title: r.title,
              monthlySavings: r.savings.monthly,
              priority: r.priority,
            })),
            totalPotentialSavings: {
              monthly: totalSavings,
              annual: totalSavings * 12,
            },
          },
          metrics,
          costBreakdowns: {
            byPlatform: [],
            byCategory: [],
            byOrgUnit: [],
          },
          recommendations,
          diagnostics: warnings.map((w) => ({
            level: "warning" as const,
            code: "PARTIAL_DATA",
            message: w,
          })),
        };

        if (options.format === "json" || options.format === "both") {
          const json = formatJSON(report);
          if (options.output) {
            fs.writeFileSync(options.output, json);
            console.log(`JSON report saved to: ${options.output}`);
          } else {
            console.log(json);
          }
        }

        if (options.format === "text" || options.format === "both") {
          const text = formatText(report);
          if (options.output && options.format === "text") {
            fs.writeFileSync(options.output, text);
            console.log(`Text report saved to: ${options.output}`);
          } else {
            console.log(text);
          }
        }
      } catch (error) {
        console.error("Analysis failed:", error);
        process.exit(1);
      }
    });

  return command;
}
