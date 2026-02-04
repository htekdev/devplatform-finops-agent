import { z } from "zod";

export const UsageMetricSchema = z.object({
  id: z.string(),
  platform: z.enum(["github", "azure-devops"]),
  resourceType: z.enum([
    "actions-minutes",
    "lfs-storage",
    "lfs-bandwidth",
    "codespaces-hours",
    "parallel-jobs",
    "user-license",
    "agent-pool",
  ]),
  resourceId: z.string(),
  resourceName: z.string(),
  orgUnit: z.object({
    organization: z.string(),
    project: z.string().optional(),
    repository: z.string().optional(),
    team: z.string().optional(),
  }),
  quantity: z.number().nonnegative(),
  unit: z.enum(["minutes", "hours", "gb", "users", "jobs"]),
  period: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }),
  cost: z.object({
    amount: z.number().nonnegative(),
    currency: z.literal("USD"),
    isEstimated: z.boolean(),
  }),
  metadata: z.record(z.unknown()).optional(),
});

export type UsageMetric = z.infer<typeof UsageMetricSchema>;
