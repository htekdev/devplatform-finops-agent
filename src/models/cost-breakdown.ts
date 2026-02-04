import { z } from "zod";

export const CostBreakdownSchema = z.object({
  id: z.string(),
  platform: z.enum(["github", "azure-devops", "combined"]),
  orgUnit: z.object({
    organization: z.string(),
    project: z.string().optional(),
    repository: z.string().optional(),
    team: z.string().optional(),
    user: z.string().optional(),
  }),
  category: z.enum(["compute", "storage", "bandwidth", "licensing", "other"]),
  period: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }),
  amounts: z.object({
    actual: z.number().nonnegative(),
    projected: z.number().nonnegative(),
    currency: z.literal("USD"),
  }),
  trend: z.object({
    direction: z.enum(["increasing", "stable", "decreasing"]),
    percentChange: z.number(),
    projection30Days: z.number().nonnegative(),
    projection60Days: z.number().nonnegative(),
    projection90Days: z.number().nonnegative(),
  }),
  details: z.array(
    z.object({
      label: z.string(),
      amount: z.number().nonnegative(),
      percentage: z.number(),
    })
  ),
});

export type CostBreakdown = z.infer<typeof CostBreakdownSchema>;
