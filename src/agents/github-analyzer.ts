import { Octokit } from '@octokit/rest';
import { defineTool } from '@github/copilot-sdk';
import type { UsageMetric } from '../models/usage-metric.js';
import type { Recommendation } from '../models/recommendation.js';
import { createUsageMetric } from '../models/usage-metric.js';
import { createRecommendation } from '../models/recommendation.js';
import {
  getGitHubActionsBilling,
  GetGitHubActionsBillingSchema,
} from '../tools/github/actions-billing.js';
import { getLFSStorage, GetLFSStorageSchema } from '../tools/github/lfs-storage.js';
import { getCodespacesUsage, GetCodespacesUsageSchema } from '../tools/github/codespaces-usage.js';
import { getGitHubActionsCost, getGitHubLFSStorageCost } from '../tools/shared/pricing.js';

export interface GitHubAnalysisResult {
  metrics: UsageMetric[];
  recommendations: Recommendation[];
}

export class GitHubAnalyzer {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  getTools() {
    return [
      defineTool('get_github_actions_billing', {
        description: 'Get GitHub Actions billing information for an organization',
        parameters: GetGitHubActionsBillingSchema,
        handler: async ({ org }) => {
          return await getGitHubActionsBilling(this.octokit, org);
        },
      }),
      defineTool('get_lfs_storage', {
        description: 'Get GitHub LFS storage billing information for an organization',
        parameters: GetLFSStorageSchema,
        handler: async ({ org }) => {
          return await getLFSStorage(this.octokit, org);
        },
      }),
      defineTool('get_codespaces_usage', {
        description: 'Get GitHub Codespaces usage information for an organization',
        parameters: GetCodespacesUsageSchema,
        handler: async ({ org }) => {
          return await getCodespacesUsage(this.octokit, org);
        },
      }),
    ];
  }

  async analyze(org: string, days: number = 30): Promise<GitHubAnalysisResult> {
    const metrics: UsageMetric[] = [];
    const recommendations: Recommendation[] = [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get Actions billing data
    const actionsBilling = await getGitHubActionsBilling(this.octokit, org);

    // Create metrics for Actions usage by OS
    if (actionsBilling.minutesUsedBreakdown.UBUNTU) {
      const ubuntuCost = getGitHubActionsCost('UBUNTU', actionsBilling.minutesUsedBreakdown.UBUNTU);
      metrics.push(
        createUsageMetric({
          platform: 'github',
          resourceType: 'actions-minutes',
          resourceId: `${org}-ubuntu`,
          resourceName: 'Ubuntu Actions Minutes',
          orgUnit: { organization: org },
          quantity: actionsBilling.minutesUsedBreakdown.UBUNTU,
          unit: 'minutes',
          period: { start: startDate, end: endDate },
          cost: { amount: ubuntuCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    if (actionsBilling.minutesUsedBreakdown.MACOS) {
      const macosCost = getGitHubActionsCost('MACOS', actionsBilling.minutesUsedBreakdown.MACOS);
      metrics.push(
        createUsageMetric({
          platform: 'github',
          resourceType: 'actions-minutes',
          resourceId: `${org}-macos`,
          resourceName: 'macOS Actions Minutes',
          orgUnit: { organization: org },
          quantity: actionsBilling.minutesUsedBreakdown.MACOS,
          unit: 'minutes',
          period: { start: startDate, end: endDate },
          cost: { amount: macosCost, currency: 'USD', isEstimated: true },
        })
      );

      // Recommendation: Switch from macOS to Linux if using significant macOS minutes
      if (actionsBilling.minutesUsedBreakdown.MACOS > 1000) {
        const potentialSavings = macosCost * 0.9; // 90% savings by switching to Linux
        recommendations.push(
          createRecommendation({
            title: 'Switch macOS Actions to Linux',
            description: `Your organization is using ${actionsBilling.minutesUsedBreakdown.MACOS} macOS minutes. Consider migrating workflows to Linux runners where possible, as macOS runners cost 10x more.`,
            category: 'optimization',
            actionType: 'optimize-workflow',
            target: {
              platform: 'github',
              resourceType: 'actions-minutes',
              resourceId: `${org}-macos`,
              resourceName: 'macOS Actions Minutes',
              orgUnit: { organization: org },
            },
            executionParams: {
              method: 'workflow_optimization',
              params: {
                currentOS: 'macos',
                targetOS: 'ubuntu',
                affectedMinutes: actionsBilling.minutesUsedBreakdown.MACOS,
              },
              effort: 'medium',
              risk: 'low',
            },
            savings: {
              monthly: potentialSavings,
              annual: potentialSavings * 12,
              currency: 'USD',
              confidence: 'high',
            },
            priority: 1,
            approval: {
              required: false,
            },
            sourceMetrics: [metrics[metrics.length - 1].id],
          })
        );
      }
    }

    if (actionsBilling.minutesUsedBreakdown.WINDOWS) {
      const windowsCost = getGitHubActionsCost(
        'WINDOWS',
        actionsBilling.minutesUsedBreakdown.WINDOWS
      );
      metrics.push(
        createUsageMetric({
          platform: 'github',
          resourceType: 'actions-minutes',
          resourceId: `${org}-windows`,
          resourceName: 'Windows Actions Minutes',
          orgUnit: { organization: org },
          quantity: actionsBilling.minutesUsedBreakdown.WINDOWS,
          unit: 'minutes',
          period: { start: startDate, end: endDate },
          cost: { amount: windowsCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    // Get LFS storage data
    const lfsStorage = await getLFSStorage(this.octokit, org);

    if (lfsStorage.estimatedPaidStorageForMonth > 0) {
      const lfsCost = getGitHubLFSStorageCost(lfsStorage.estimatedPaidStorageForMonth);
      metrics.push(
        createUsageMetric({
          platform: 'github',
          resourceType: 'lfs-storage',
          resourceId: `${org}-lfs`,
          resourceName: 'LFS Storage',
          orgUnit: { organization: org },
          quantity: lfsStorage.estimatedPaidStorageForMonth,
          unit: 'gb',
          period: { start: startDate, end: endDate },
          cost: { amount: lfsCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    // Get Codespaces usage
    const codespacesUsage = await getCodespacesUsage(this.octokit, org);

    if (codespacesUsage.paidHours > 0) {
      metrics.push(
        createUsageMetric({
          platform: 'github',
          resourceType: 'codespaces-hours',
          resourceId: `${org}-codespaces`,
          resourceName: 'Codespaces Hours',
          orgUnit: { organization: org },
          quantity: codespacesUsage.paidHours,
          unit: 'hours',
          period: { start: startDate, end: endDate },
          cost: {
            amount: codespacesUsage.paidHours * 0.18,
            currency: 'USD',
            isEstimated: true,
          },
        })
      );
    }

    return { metrics, recommendations };
  }
}
