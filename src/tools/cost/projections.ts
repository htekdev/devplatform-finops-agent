/**
 * Trend analysis and cost projections
 */

import type { CostBreakdown } from '../../types/state';
import { getLogger } from '../../utils/logger';

/**
 * Historical cost data point
 */
export interface HistoricalCostData {
  month: string; // YYYY-MM format
  cost: number;
}

/**
 * Cost projection for future months
 */
export interface CostProjection {
  month: number; // Months ahead (1, 3, 6)
  projectedCost: number;
  confidenceLow: number;
  confidenceHigh: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Calculate month-over-month growth rate
 */
export function calculateGrowthRate(historicalData: HistoricalCostData[]): {
  averageGrowthRate: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  isAccelerating: boolean;
} {
  if (historicalData.length < 2) {
    return {
      averageGrowthRate: 0,
      trend: 'stable',
      isAccelerating: false,
    };
  }

  // Sort by month
  const sorted = [...historicalData].sort((a, b) => a.month.localeCompare(b.month));

  // Calculate growth rates between consecutive months
  const growthRates: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const previousCost = sorted[i - 1]!.cost;
    const currentCost = sorted[i]!.cost;

    if (previousCost > 0) {
      const growth = (currentCost - previousCost) / previousCost;
      growthRates.push(growth);
    }
  }

  if (growthRates.length === 0) {
    return {
      averageGrowthRate: 0,
      trend: 'stable',
      isAccelerating: false,
    };
  }

  // Calculate average growth rate
  const averageGrowthRate = growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length;

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable';
  if (averageGrowthRate > 0.05) {
    trend = 'increasing';
  } else if (averageGrowthRate < -0.05) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  // Check if accelerating (growth rate increasing over time)
  let isAccelerating = false;
  if (growthRates.length >= 3) {
    const recentRate = growthRates[growthRates.length - 1]!;
    const previousRate = growthRates[growthRates.length - 2]!;
    isAccelerating = recentRate > previousRate && recentRate > 0.05;
  }

  return {
    averageGrowthRate,
    trend,
    isAccelerating,
  };
}

/**
 * Project future costs based on historical data
 */
export function projectFutureCosts(
  currentCost: number,
  historicalData: HistoricalCostData[],
  months: number[] = [1, 3, 6]
): CostProjection[] {
  const logger = getLogger();

  if (currentCost === 0) {
    logger.debug('No current cost to project');
    return months.map((m) => ({
      month: m,
      projectedCost: 0,
      confidenceLow: 0,
      confidenceHigh: 0,
      trend: 'stable' as const,
    }));
  }

  // Calculate growth rate from historical data
  const { averageGrowthRate, trend } = calculateGrowthRate(historicalData);

  // If no historical data, use conservative estimate
  const monthlyGrowthRate = historicalData.length >= 2 ? averageGrowthRate : 0.05; // 5% default

  const projections: CostProjection[] = [];

  for (const monthsAhead of months) {
    // Simple compound growth projection
    const projectedCost = currentCost * Math.pow(1 + monthlyGrowthRate, monthsAhead);

    // Confidence interval (±20% for uncertainty)
    const confidenceLow = projectedCost * 0.8;
    const confidenceHigh = projectedCost * 1.2;

    projections.push({
      month: monthsAhead,
      projectedCost: Math.round(projectedCost * 100) / 100,
      confidenceLow: Math.round(confidenceLow * 100) / 100,
      confidenceHigh: Math.round(confidenceHigh * 100) / 100,
      trend,
    });
  }

  logger.debug(
    `Projected costs: 1-month: $${projections[0]?.projectedCost.toFixed(2)}, 3-month: $${projections[1]?.projectedCost.toFixed(2)}, 6-month: $${projections[2]?.projectedCost.toFixed(2)}`
  );

  return projections;
}

/**
 * Check if projected costs will breach thresholds
 */
export function checkThresholdBreaches(
  projections: CostProjection[],
  thresholds: {
    warningThreshold?: number;
    criticalThreshold?: number;
  }
): {
  warnings: Array<{ month: number; projectedCost: number; threshold: number }>;
  critical: Array<{ month: number; projectedCost: number; threshold: number }>;
} {
  const warnings: Array<{ month: number; projectedCost: number; threshold: number }> = [];
  const critical: Array<{ month: number; projectedCost: number; threshold: number }> = [];

  for (const projection of projections) {
    if (thresholds.criticalThreshold && projection.projectedCost > thresholds.criticalThreshold) {
      critical.push({
        month: projection.month,
        projectedCost: projection.projectedCost,
        threshold: thresholds.criticalThreshold,
      });
    } else if (thresholds.warningThreshold && projection.projectedCost > thresholds.warningThreshold) {
      warnings.push({
        month: projection.month,
        projectedCost: projection.projectedCost,
        threshold: thresholds.warningThreshold,
      });
    }
  }

  return { warnings, critical };
}

/**
 * Update cost breakdown with trend data
 */
export function updateCostBreakdownWithTrends(
  breakdown: Omit<CostBreakdown, 'projectedMonthCost' | 'trend' | 'percentChange'>,
  historicalData: HistoricalCostData[]
): CostBreakdown {
  const { averageGrowthRate, trend } = calculateGrowthRate(historicalData);
  const projections = projectFutureCosts(breakdown.currentMonthCost, historicalData, [1]);

  return {
    ...breakdown,
    projectedMonthCost: projections[0]?.projectedCost || breakdown.currentMonthCost,
    trend,
    percentChange: Math.round(averageGrowthRate * 100 * 100) / 100,
  };
}

/**
 * Identify cost anomalies and accelerating trends
 */
export function identifyCostAnomalies(historicalData: HistoricalCostData[]): {
  anomalies: Array<{ month: string; cost: number; reason: string }>;
  acceleratingTrends: boolean;
  recommendations: string[];
} {
  const anomalies: Array<{ month: string; cost: number; reason: string }> = [];
  const recommendations: string[] = [];

  if (historicalData.length < 3) {
    return {
      anomalies,
      acceleratingTrends: false,
      recommendations: ['Need at least 3 months of historical data for trend analysis.'],
    };
  }

  // Calculate average and standard deviation
  const costs = historicalData.map((d) => d.cost);
  const average = costs.reduce((sum, c) => sum + c, 0) / costs.length;
  const variance = costs.reduce((sum, c) => sum + Math.pow(c - average, 2), 0) / costs.length;
  const stdDev = Math.sqrt(variance);

  // Identify anomalies (>2 standard deviations from mean)
  for (const dataPoint of historicalData) {
    if (Math.abs(dataPoint.cost - average) > 2 * stdDev) {
      anomalies.push({
        month: dataPoint.month,
        cost: dataPoint.cost,
        reason: `Cost is ${((Math.abs(dataPoint.cost - average) / average) * 100).toFixed(1)}% different from average ($${average.toFixed(2)})`,
      });
    }
  }

  // Check for accelerating growth
  const { isAccelerating, averageGrowthRate } = calculateGrowthRate(historicalData);

  if (isAccelerating) {
    recommendations.push(
      `Cost growth is accelerating (${(averageGrowthRate * 100).toFixed(1)}% month-over-month). Investigate recent changes and implement cost controls.`
    );
  }

  // Check for sustained high growth
  if (averageGrowthRate > 0.1) {
    recommendations.push(
      `Sustained high cost growth (${(averageGrowthRate * 100).toFixed(1)}% per month). At this rate, costs will double in ${Math.ceil(Math.log(2) / Math.log(1 + averageGrowthRate))} months.`
    );
  }

  return {
    anomalies,
    acceleratingTrends: isAccelerating,
    recommendations,
  };
}
