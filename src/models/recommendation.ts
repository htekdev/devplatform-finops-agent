import { z } from 'zod';

export const RecommendationSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['cleanup', 'optimization', 'migration', 'policy-change']),
  actionType: z.enum([
    'delete-workflow',
    'optimize-workflow',
    'reduce-runners',
    'downgrade-machine',
    'remove-user-license',
    'reduce-parallel-jobs',
    'switch-to-self-hosted',
    'consolidate-repos',
    'archive-repo',
    'other',
  ]),
  target: z.object({
    platform: z.enum(['github', 'azure-devops']),
    resourceType: z.string(),
    resourceId: z.string(),
    resourceName: z.string(),
    orgUnit: z.object({
      organization: z.string(),
      project: z.string().optional(),
      repository: z.string().optional(),
    }),
  }),
  executionParams: z.object({
    method: z.string(),
    params: z.record(z.string(), z.unknown()),
    effort: z.enum(['trivial', 'low', 'medium', 'high']),
    risk: z.enum(['low', 'medium', 'high']),
  }),
  savings: z.object({
    monthly: z.number().min(0),
    annual: z.number().min(0),
    currency: z.literal('USD'),
    confidence: z.enum(['high', 'medium', 'low']),
  }),
  priority: z.number().int().min(1),
  approval: z.object({
    required: z.boolean(),
    reason: z.string().optional(),
    approvers: z.array(z.string()).optional(),
  }),
  sourceMetrics: z.array(z.string()),
  generatedAt: z.date(),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

export function createRecommendation(
  data: Omit<Recommendation, 'id' | 'generatedAt'>
): Recommendation {
  const id = `rec-${data.target.platform}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return RecommendationSchema.parse({
    ...data,
    id,
    generatedAt: new Date(),
  });
}
