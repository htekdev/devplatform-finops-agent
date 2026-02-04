import { z } from "zod";
import { UsageMetricSchema } from "../models/usage-metric.js";
import { RecommendationSchema } from "../models/recommendation.js";
import { CostBreakdownSchema } from "../models/cost-breakdown.js";
import { AnalysisReportSchema } from "../models/analysis-report.js";
import { PricingDataSchema } from "../models/pricing-data.js";

export function validateUsageMetric(data: unknown) {
  return UsageMetricSchema.parse(data);
}

export function validateRecommendation(data: unknown) {
  return RecommendationSchema.parse(data);
}

export function validateCostBreakdown(data: unknown) {
  return CostBreakdownSchema.parse(data);
}

export function validateAnalysisReport(data: unknown) {
  return AnalysisReportSchema.parse(data);
}

export function validatePricingData(data: unknown) {
  return PricingDataSchema.parse(data);
}

export function calculatePriority(
  monthlySavings: number,
  effort: "trivial" | "low" | "medium" | "high"
): number {
  const effortMultipliers = {
    trivial: 1,
    low: 0.8,
    medium: 0.5,
    high: 0.3,
  };

  const roi = monthlySavings * 12 * effortMultipliers[effort];
  return Math.max(1, Math.floor(roi));
}
