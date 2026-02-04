import type { UsageMetric } from "../../models/usage-metric.js";
import { getGitHubActionsBilling } from "../../tools/github/get-actions-billing.js";
import { getGitHubLFSUsage } from "../../tools/github/get-lfs-usage.js";
import { getGitHubCodespacesUsage } from "../../tools/github/get-codespaces-usage.js";
import { calculateGitHubActionsCost } from "../pricing/github-pricing.js";
import { get90DayPeriod } from "../../lib/date-utils.js";

export interface GitHubAnalysisResult {
  metrics: UsageMetric[];
  warnings: string[];
}

export async function analyzeGitHubOrganization(
  octokit: any,
  organization: string
): Promise<GitHubAnalysisResult> {
  const metrics: UsageMetric[] = [];
  const warnings: string[] = [];
  const period = get90DayPeriod();

  const actionsResult = await getGitHubActionsBilling(octokit, organization);
  if (actionsResult.success && actionsResult.data) {
    const cost = calculateGitHubActionsCost(actionsResult.data);
    
    metrics.push({
      id: `github-actions-${organization}`,
      platform: "github",
      resourceType: "actions-minutes",
      resourceId: organization,
      resourceName: organization,
      orgUnit: { organization },
      quantity: actionsResult.data.totalMinutesUsed,
      unit: "minutes",
      period,
      cost: { amount: cost, currency: "USD", isEstimated: false },
    });
  } else {
    warnings.push(`Failed to get GitHub Actions billing: ${actionsResult.error?.message}`);
  }

  const lfsResult = await getGitHubLFSUsage(octokit, organization);
  if (lfsResult.success && lfsResult.data) {
    metrics.push({
      id: `github-lfs-${organization}`,
      platform: "github",
      resourceType: "lfs-storage",
      resourceId: organization,
      resourceName: organization,
      orgUnit: { organization },
      quantity: lfsResult.data.gitLfsSize,
      unit: "gb",
      period,
      cost: { amount: lfsResult.data.gitLfsSize * 0.07, currency: "USD", isEstimated: true },
    });
  } else {
    warnings.push(`Failed to get GitHub LFS usage: ${lfsResult.error?.message}`);
  }

  const codespacesResult = await getGitHubCodespacesUsage(octokit, organization);
  if (codespacesResult.success && codespacesResult.data) {
    metrics.push({
      id: `github-codespaces-${organization}`,
      platform: "github",
      resourceType: "codespaces-hours",
      resourceId: organization,
      resourceName: organization,
      orgUnit: { organization },
      quantity: codespacesResult.data.totalCoreHours,
      unit: "hours",
      period,
      cost: { amount: codespacesResult.data.totalCoreHours * 0.18, currency: "USD", isEstimated: true },
    });
  } else {
    warnings.push(`Failed to get GitHub Codespaces usage: ${codespacesResult.error?.message}`);
  }

  return { metrics, warnings };
}
