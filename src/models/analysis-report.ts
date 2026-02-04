import { z } from "zod";
import { UsageMetricSchema } from "./usage-metric.js";
import { CostBreakdownSchema } from "./cost-breakdown.js";
import { RecommendationSchema } from "./recommendation.js";

export const AnalysisReportSchema = z.object({
  id: z.string(),
  metadata: z.object({
    generatedAt: z.coerce.date(),
    generatedBy: z.string(),
    duration: z.number().nonnegative(),
  }),
  scope: z.object({
    platforms: z.array(z.enum(["github", "azure-devops"])),
    organizations: z.array(z.string()),
    dateRange: z.object({
      start: z.coerce.date(),
      end: z.coerce.date(),
    }),
    filters: z
      .object({
        repositories: z.array(z.string()).optional(),
        projects: z.array(z.string()).optional(),
        users: z.array(z.string()).optional(),
      })
      .optional(),
  }),
  summary: z.object({
    totalMonthlyCost: z.number().nonnegative(),
    topCostDrivers: z.array(
      z.object({
        description: z.string(),
        monthlyCost: z.number().nonnegative(),
        percentage: z.number(),
      })
    ),
    topRecommendations: z.array(
      z.object({
        title: z.string(),
        monthlySavings: z.number().nonnegative(),
        priority: z.number().int().positive(),
      })
    ),
    totalPotentialSavings: z.object({
      monthly: z.number().nonnegative(),
      annual: z.number().nonnegative(),
    }),
  }),
  metrics: z.array(UsageMetricSchema),
  costBreakdowns: z.object({
    byPlatform: z.array(CostBreakdownSchema),
    byCategory: z.array(CostBreakdownSchema),
    byOrgUnit: z.array(CostBreakdownSchema),
  }),
  recommendations: z.array(RecommendationSchema),
  diagnostics: z.array(
    z.object({
      level: z.enum(["info", "warning", "error"]),
      code: z.string(),
      message: z.string(),
      context: z.record(z.unknown()).optional(),
    })
  ),
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;
