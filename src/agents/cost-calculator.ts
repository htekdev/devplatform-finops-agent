import type { UsageMetric } from '../models/usage-metric.js';
import type { CostBreakdown } from '../models/cost-breakdown.js';
import { createCostBreakdown } from '../models/cost-breakdown.js';

export class CostCalculator {
  calculateCostBreakdowns(metrics: UsageMetric[]): {
    byPlatform: CostBreakdown[];
    byCategory: CostBreakdown[];
    byOrgUnit: CostBreakdown[];
  } {
    const byPlatform = this.aggregateByPlatform(metrics);
    const byCategory = this.aggregateByCategory(metrics);
    const byOrgUnit = this.aggregateByOrgUnit(metrics);

    return { byPlatform, byCategory, byOrgUnit };
  }

  private aggregateByPlatform(metrics: UsageMetric[]): CostBreakdown[] {
    const platformGroups = this.groupBy(metrics, (m) => m.platform);
    const breakdowns: CostBreakdown[] = [];

    for (const [platform, platformMetrics] of Object.entries(platformGroups)) {
      const totalCost = platformMetrics.reduce((sum, m) => sum + m.cost.amount, 0);
      const details = this.createDetails(platformMetrics);

      breakdowns.push(
        createCostBreakdown({
          platform: platform as 'github' | 'azure-devops',
          orgUnit: {
            organization: platformMetrics[0]?.orgUnit.organization || 'unknown',
          },
          category: 'compute',
          period: {
            start: new Date(Math.min(...platformMetrics.map((m) => m.period.start.getTime()))),
            end: new Date(Math.max(...platformMetrics.map((m) => m.period.end.getTime()))),
          },
          amounts: {
            actual: totalCost,
            projected: totalCost,
            currency: 'USD',
          },
          trend: {
            direction: 'stable',
            percentChange: 0,
            projection30Days: totalCost,
            projection60Days: totalCost * 2,
            projection90Days: totalCost * 3,
          },
          details,
        })
      );
    }

    return breakdowns;
  }

  private aggregateByCategory(metrics: UsageMetric[]): CostBreakdown[] {
    const categoryMap: Record<string, 'compute' | 'storage' | 'bandwidth' | 'licensing'> = {
      'actions-minutes': 'compute',
      'codespaces-hours': 'compute',
      'parallel-jobs': 'compute',
      'lfs-storage': 'storage',
      'lfs-bandwidth': 'bandwidth',
      'user-license': 'licensing',
      'agent-pool': 'compute',
    };

    const categoryGroups = this.groupBy(metrics, (m) => categoryMap[m.resourceType] || 'compute');
    const breakdowns: CostBreakdown[] = [];

    for (const [category, categoryMetrics] of Object.entries(categoryGroups)) {
      const totalCost = categoryMetrics.reduce((sum, m) => sum + m.cost.amount, 0);
      const details = this.createDetails(categoryMetrics);

      breakdowns.push(
        createCostBreakdown({
          platform: 'combined',
          orgUnit: {
            organization: 'all',
          },
          category: category as 'compute' | 'storage' | 'bandwidth' | 'licensing',
          period: {
            start: new Date(Math.min(...categoryMetrics.map((m) => m.period.start.getTime()))),
            end: new Date(Math.max(...categoryMetrics.map((m) => m.period.end.getTime()))),
          },
          amounts: {
            actual: totalCost,
            projected: totalCost,
            currency: 'USD',
          },
          trend: {
            direction: 'stable',
            percentChange: 0,
            projection30Days: totalCost,
            projection60Days: totalCost * 2,
            projection90Days: totalCost * 3,
          },
          details,
        })
      );
    }

    return breakdowns;
  }

  private aggregateByOrgUnit(metrics: UsageMetric[]): CostBreakdown[] {
    const orgGroups = this.groupBy(metrics, (m) => m.orgUnit.organization);
    const breakdowns: CostBreakdown[] = [];

    for (const [org, orgMetrics] of Object.entries(orgGroups)) {
      const totalCost = orgMetrics.reduce((sum, m) => sum + m.cost.amount, 0);
      const details = this.createDetails(orgMetrics);

      breakdowns.push(
        createCostBreakdown({
          platform: 'combined',
          orgUnit: { organization: org },
          category: 'compute',
          period: {
            start: new Date(Math.min(...orgMetrics.map((m) => m.period.start.getTime()))),
            end: new Date(Math.max(...orgMetrics.map((m) => m.period.end.getTime()))),
          },
          amounts: {
            actual: totalCost,
            projected: totalCost,
            currency: 'USD',
          },
          trend: {
            direction: 'stable',
            percentChange: 0,
            projection30Days: totalCost,
            projection60Days: totalCost * 2,
            projection90Days: totalCost * 3,
          },
          details,
        })
      );
    }

    return breakdowns;
  }

  private groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return items.reduce(
      (groups, item) => {
        const key = keyFn(item);
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  }

  private createDetails(metrics: UsageMetric[]): Array<{
    label: string;
    amount: number;
    percentage: number;
  }> {
    const totalCost = metrics.reduce((sum, m) => sum + m.cost.amount, 0);
    return metrics.map((m) => ({
      label: m.resourceName,
      amount: m.cost.amount,
      percentage: totalCost > 0 ? (m.cost.amount / totalCost) * 100 : 0,
    }));
  }
}
