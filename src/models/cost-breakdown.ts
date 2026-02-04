import { z } from 'zod';

export const CostBreakdownSchema = z.object({
  id: z.string(),
  platform: z.enum(['github', 'azure-devops', 'combined']),
  orgUnit: z.object({
    organization: z.string(),
    project: z.string().optional(),
    repository: z.string().optional(),
    team: z.string().optional(),
    user: z.string().optional(),
  }),
  category: z.enum(['compute', 'storage', 'bandwidth', 'licensing', 'other']),
  period: z.object({
    start: z.date(),
    end: z.date(),
  }),
  amounts: z.object({
    actual: z.number().min(0),
    projected: z.number().min(0),
    currency: z.literal('USD'),
  }),
  trend: z.object({
    direction: z.enum(['increasing', 'stable', 'decreasing']),
    percentChange: z.number(),
    projection30Days: z.number(),
    projection60Days: z.number(),
    projection90Days: z.number(),
  }),
  details: z.array(
    z.object({
      label: z.string(),
      amount: z.number(),
      percentage: z.number(),
    })
  ),
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;

export function createCostBreakdown(data: Omit<CostBreakdown, 'id'>): CostBreakdown {
  const id = `cost-${data.platform}-${data.category}-${Date.now()}`;
  return CostBreakdownSchema.parse({ ...data, id });
}
