import { z } from 'zod';
import { UsageMetricSchema } from './usage-metric.js';
import { RecommendationSchema } from './recommendation.js';
import { CostBreakdownSchema } from './cost-breakdown.js';

export const AnalysisReportSchema = z.object({
  id: z.string(),
  metadata: z.object({
    generatedAt: z.date(),
    generatedBy: z.string(),
    duration: z.number().min(0),
  }),
  scope: z.object({
    platforms: z.array(z.enum(['github', 'azure-devops'])),
    organizations: z.array(z.string()),
    dateRange: z.object({
      start: z.date(),
      end: z.date(),
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
    totalMonthlyCost: z.number().min(0),
    topCostDrivers: z.array(
      z.object({
        description: z.string(),
        monthlyCost: z.number(),
        percentage: z.number(),
      })
    ),
    topRecommendations: z.array(
      z.object({
        title: z.string(),
        monthlySavings: z.number(),
        priority: z.number(),
      })
    ),
    totalPotentialSavings: z.object({
      monthly: z.number().min(0),
      annual: z.number().min(0),
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
      level: z.enum(['info', 'warning', 'error']),
      code: z.string(),
      message: z.string(),
      context: z.record(z.string(), z.unknown()).optional(),
    })
  ),
});

export type AnalysisReport = z.infer<typeof AnalysisReportSchema>;

export function createAnalysisReport(
  data: Omit<AnalysisReport, 'id' | 'metadata'>
): AnalysisReport {
  const id = `report-${Date.now()}`;
  return AnalysisReportSchema.parse({
    ...data,
    id,
    metadata: {
      generatedAt: new Date(),
      generatedBy: 'finops-agent@1.0.0',
      duration: 0,
    },
  });
}
