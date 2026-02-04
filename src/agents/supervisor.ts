import type { FinOpsConfig } from '../config/index.js';
import type { AnalysisReport } from '../models/analysis-report.js';
import type { UsageMetric } from '../models/usage-metric.js';
import type { Recommendation } from '../models/recommendation.js';
import { GitHubAnalyzer } from './github-analyzer.js';
import { AzDOAnalyzer } from './azdo-analyzer.js';
import { CostCalculator } from './cost-calculator.js';
import { createAnalysisReport } from '../models/analysis-report.js';

export class Supervisor {
  private config: FinOpsConfig;

  constructor(config: FinOpsConfig) {
    this.config = config;
  }

  async analyzeAll(
    githubOrg: string,
    azdoOrg: string,
    days: number = 30
  ): Promise<AnalysisReport> {
    const startTime = Date.now();
    const metrics: UsageMetric[] = [];
    const recommendations: Recommendation[] = [];
    const platforms: Array<'github' | 'azure-devops'> = [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Analyze GitHub if credentials available
    if (this.config.github?.token) {
      try {
        const githubAnalyzer = new GitHubAnalyzer(this.config.github.token);
        const githubResult = await githubAnalyzer.analyze(githubOrg, days);
        metrics.push(...githubResult.metrics);
        recommendations.push(...githubResult.recommendations);
        platforms.push('github');
      } catch (error) {
        console.error('GitHub analysis failed:', error);
      }
    }

    // Analyze Azure DevOps if credentials available
    if (this.config.azureDevOps?.pat) {
      try {
        const orgUrl = azdoOrg.startsWith('https://') ? azdoOrg : `https://dev.azure.com/${azdoOrg}`;
        const azdoAnalyzer = new AzDOAnalyzer(
          orgUrl,
          this.config.azureDevOps.pat,
          this.config.thresholds?.inactiveDays
        );
        const azdoResult = await azdoAnalyzer.analyze(azdoOrg, days);
        metrics.push(...azdoResult.metrics);
        recommendations.push(...azdoResult.recommendations);
        platforms.push('azure-devops');
      } catch (error) {
        console.error('Azure DevOps analysis failed:', error);
      }
    }

    // Calculate cost breakdowns
    const costCalculator = new CostCalculator();
    const costBreakdowns = costCalculator.calculateCostBreakdowns(metrics);

    // Calculate totals and top items
    const totalCost = metrics.reduce((sum, m) => sum + m.cost.amount, 0);
    const totalSavings = recommendations.reduce((sum, r) => sum + r.savings.monthly, 0);

    const topDrivers = metrics
      .sort((a, b) => b.cost.amount - a.cost.amount)
      .slice(0, 3)
      .map((m) => ({
        description: m.resourceName,
        monthlyCost: m.cost.amount,
        percentage: totalCost > 0 ? (m.cost.amount / totalCost) * 100 : 0,
      }));

    const topRecs = recommendations
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3)
      .map((r) => ({
        title: r.title,
        monthlySavings: r.savings.monthly,
        priority: r.priority,
      }));

    // Create combined report
    const report = createAnalysisReport({
      scope: {
        platforms,
        organizations: [githubOrg, azdoOrg].filter(Boolean),
        dateRange: { start: startDate, end: endDate },
      },
      summary: {
        totalMonthlyCost: totalCost,
        topCostDrivers: topDrivers,
        topRecommendations: topRecs,
        totalPotentialSavings: {
          monthly: totalSavings,
          annual: totalSavings * 12,
        },
      },
      metrics,
      costBreakdowns,
      recommendations: recommendations.sort((a, b) => a.priority - b.priority),
      diagnostics: [],
    });

    // Update metadata
    report.metadata.duration = (Date.now() - startTime) / 1000;

    return report;
  }
}
