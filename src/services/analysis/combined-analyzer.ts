import type { UsageMetric } from "../../models/usage-metric.js";
import type { Recommendation } from "../../models/recommendation.js";

export interface CombinedAnalysisResult {
  metrics: UsageMetric[];
  recommendations: Recommendation[];
  totalCost: number;
  warnings: string[];
}

export function aggregateMetrics(
  githubMetrics: UsageMetric[],
  azdoMetrics: UsageMetric[]
): UsageMetric[] {
  return [...githubMetrics, ...azdoMetrics];
}

export function calculateTotalCost(metrics: UsageMetric[]): number {
  return metrics.reduce((sum, metric) => sum + metric.cost.amount, 0);
}

export function combineWarnings(
  githubWarnings: string[],
  azdoWarnings: string[]
): string[] {
  return [...githubWarnings, ...azdoWarnings];
}
