import * as azdev from 'azure-devops-node-api';
import { defineTool } from '@github/copilot-sdk';
import type { UsageMetric } from '../models/usage-metric.js';
import type { Recommendation } from '../models/recommendation.js';
import { createUsageMetric } from '../models/usage-metric.js';
import { createRecommendation } from '../models/recommendation.js';
import { getParallelJobs, GetParallelJobsSchema } from '../tools/azdo/parallel-jobs.js';
import { getUserLicenses, GetUserLicensesSchema } from '../tools/azdo/user-licenses.js';
import { getAgentPools, GetAgentPoolsSchema } from '../tools/azdo/agent-pools.js';
import { getAzDOParallelJobCost, getAzDOLicenseCost } from '../tools/shared/pricing.js';

export interface AzDOAnalysisResult {
  metrics: UsageMetric[];
  recommendations: Recommendation[];
}

export class AzDOAnalyzer {
  private connection: azdev.WebApi;
  private inactiveDaysThreshold: number;

  constructor(orgUrl: string, pat: string, inactiveDaysThreshold: number = 90) {
    const authHandler = azdev.getPersonalAccessTokenHandler(pat);
    this.connection = new azdev.WebApi(orgUrl, authHandler);
    this.inactiveDaysThreshold = inactiveDaysThreshold;
  }

  getTools() {
    return [
      defineTool('get_parallel_jobs', {
        description: 'Get Azure DevOps parallel job information',
        parameters: GetParallelJobsSchema,
        handler: async ({ org }) => {
          return await getParallelJobs(this.connection, org);
        },
      }),
      defineTool('get_user_licenses', {
        description: 'Get Azure DevOps user license information',
        parameters: GetUserLicensesSchema,
        handler: async ({ org }) => {
          return await getUserLicenses(this.connection, org, this.inactiveDaysThreshold);
        },
      }),
      defineTool('get_agent_pools', {
        description: 'Get Azure DevOps agent pool information',
        parameters: GetAgentPoolsSchema,
        handler: async ({ org }) => {
          return await getAgentPools(this.connection, org);
        },
      }),
    ];
  }

  async analyze(org: string, days: number = 30): Promise<AzDOAnalysisResult> {
    const metrics: UsageMetric[] = [];
    const recommendations: Recommendation[] = [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get parallel jobs data
    const parallelJobs = await getParallelJobs(this.connection, org);

    // Create metrics for parallel jobs
    if (parallelJobs.hostedJobs > 0) {
      const hostedCost = getAzDOParallelJobCost('hosted', parallelJobs.hostedJobs);
      metrics.push(
        createUsageMetric({
          platform: 'azure-devops',
          resourceType: 'parallel-jobs',
          resourceId: `${org}-hosted-jobs`,
          resourceName: 'Microsoft-hosted Parallel Jobs',
          orgUnit: { organization: org },
          quantity: parallelJobs.hostedJobs,
          unit: 'jobs',
          period: { start: startDate, end: endDate },
          cost: { amount: hostedCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    if (parallelJobs.selfHostedJobs > 0) {
      const selfHostedCost = getAzDOParallelJobCost('selfHosted', parallelJobs.selfHostedJobs);
      metrics.push(
        createUsageMetric({
          platform: 'azure-devops',
          resourceType: 'parallel-jobs',
          resourceId: `${org}-self-hosted-jobs`,
          resourceName: 'Self-hosted Parallel Jobs',
          orgUnit: { organization: org },
          quantity: parallelJobs.selfHostedJobs,
          unit: 'jobs',
          period: { start: startDate, end: endDate },
          cost: { amount: selfHostedCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    // Get user licenses data
    const licenses = await getUserLicenses(this.connection, org, this.inactiveDaysThreshold);

    // Create metrics for active users
    if (licenses.basicUsers > 0) {
      const basicCost = getAzDOLicenseCost('basic', licenses.basicUsers);
      metrics.push(
        createUsageMetric({
          platform: 'azure-devops',
          resourceType: 'user-license',
          resourceId: `${org}-basic-licenses`,
          resourceName: 'Basic User Licenses',
          orgUnit: { organization: org },
          quantity: licenses.basicUsers,
          unit: 'users',
          period: { start: startDate, end: endDate },
          cost: { amount: basicCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    if (licenses.basicTestPlansUsers > 0) {
      const testPlansCost = getAzDOLicenseCost('basicTestPlans', licenses.basicTestPlansUsers);
      metrics.push(
        createUsageMetric({
          platform: 'azure-devops',
          resourceType: 'user-license',
          resourceId: `${org}-test-plans-licenses`,
          resourceName: 'Basic + Test Plans User Licenses',
          orgUnit: { organization: org },
          quantity: licenses.basicTestPlansUsers,
          unit: 'users',
          period: { start: startDate, end: endDate },
          cost: { amount: testPlansCost, currency: 'USD', isEstimated: true },
        })
      );
    }

    // Recommendation: Remove inactive users
    if (licenses.inactiveUsers.length > 0) {
      const inactiveCost = licenses.inactiveUsers.length * 6; // Assume $6/user Basic license
      recommendations.push(
        createRecommendation({
          title: `Remove ${licenses.inactiveUsers.length} inactive users`,
          description: `Found ${licenses.inactiveUsers.length} users who haven't accessed Azure DevOps in ${this.inactiveDaysThreshold}+ days. Removing these licenses could save money.`,
          category: 'cleanup',
          actionType: 'remove-user-license',
          target: {
            platform: 'azure-devops',
            resourceType: 'user-license',
            resourceId: `${org}-inactive-users`,
            resourceName: 'Inactive User Licenses',
            orgUnit: { organization: org },
          },
          executionParams: {
            method: 'remove_user_entitlements',
            params: {
              userIds: licenses.inactiveUsers.map((u) => u.userId),
              userNames: licenses.inactiveUsers.map((u) => u.userName),
              inactiveDays: this.inactiveDaysThreshold,
            },
            effort: 'low',
            risk: 'medium',
          },
          savings: {
            monthly: inactiveCost,
            annual: inactiveCost * 12,
            currency: 'USD',
            confidence: 'high',
          },
          priority: 1,
          approval: {
            required: true,
            reason: 'User removal requires stakeholder approval to avoid access issues',
          },
          sourceMetrics: [metrics[metrics.length - 1]?.id || ''],
        })
      );
    }

    // Get agent pools data
    await getAgentPools(this.connection, org);

    return { metrics, recommendations };
  }
}
