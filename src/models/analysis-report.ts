/**
 * AnalysisReport Interface
 * 
 * Complete output of an analysis run.
 * Reference: specs/001-finops-analyzer/data-model.md
 */

import type { UsageMetric } from "./usage-metric.js";
import type { Recommendation } from "./recommendation.js";
import type { CostBreakdown } from "./cost-breakdown.js";

export interface AnalysisReport {
  /** Unique identifier */
  id: string;
  
  /** Report metadata */
  metadata: {
    generatedAt: Date;
    generatedBy: string;
    duration: number;
  };
  
  /** Analysis scope */
  scope: {
    platforms: Array<"github" | "azure-devops">;
    organizations: string[];
    dateRange: {
      start: Date;
      end: Date;
    };
    filters?: {
      repositories?: string[];
      projects?: string[];
      users?: string[];
    };
  };
  
  /** Executive summary */
  summary: {
    totalMonthlyCost: number;
    topCostDrivers: Array<{
      description: string;
      monthlyCost: number;
      percentage: number;
    }>;
    topRecommendations: Array<{
      title: string;
      monthlySavings: number;
      priority: number;
    }>;
    totalPotentialSavings: {
      monthly: number;
      annual: number;
    };
  };
  
  /** All collected metrics */
  metrics: UsageMetric[];
  
  /** Cost breakdowns by various dimensions */
  costBreakdowns: {
    byPlatform: CostBreakdown[];
    byCategory: CostBreakdown[];
    byOrgUnit: CostBreakdown[];
  };
  
  /** All generated recommendations */
  recommendations: Recommendation[];
  
  /** Any warnings or errors encountered */
  diagnostics: Array<{
    level: "info" | "warning" | "error";
    code: string;
    message: string;
    context?: Record<string, unknown>;
  }>;
}
