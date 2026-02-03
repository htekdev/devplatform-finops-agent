/**
 * Configuration schema definitions using Zod for validation
 */

import { z } from 'zod';

/**
 * GitHub configuration schema
 */
export const GitHubConfigSchema = z.object({
  organizations: z.array(z.string()).min(1, 'At least one GitHub organization is required'),
  token: z.string().min(1, 'GitHub token is required'),
  thresholds: z
    .object({
      actionsMinutesWarning: z.number().positive().optional(),
      actionsMinutesCritical: z.number().positive().optional(),
      lfsStorageWarning: z.number().positive().optional(),
      codespacesHoursWarning: z.number().positive().optional(),
      workflowFailureRate: z.number().min(0).max(100).optional(),
    })
    .optional(),
  include: z
    .object({
      actions: z.boolean().default(true),
      lfs: z.boolean().default(true),
      codespaces: z.boolean().default(true),
      cache: z.boolean().default(true),
    })
    .optional(),
});

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>;

/**
 * Azure DevOps configuration schema
 */
export const AzureDevOpsConfigSchema = z.object({
  organizations: z
    .array(z.string())
    .min(1, 'At least one Azure DevOps organization is required'),
  pat: z.string().min(1, 'Azure DevOps PAT is required'),
  thresholds: z
    .object({
      parallelJobUtilization: z.number().min(0).max(100).optional(),
      inactiveUserDays: z.number().positive().optional(),
      pipelineFailureRate: z.number().min(0).max(100).optional(),
      queueTimeWarning: z.number().positive().optional(),
    })
    .optional(),
  include: z
    .object({
      parallelJobs: z.boolean().default(true),
      pipelines: z.boolean().default(true),
      licenses: z.boolean().default(true),
      agents: z.boolean().default(true),
    })
    .optional(),
});

export type AzureDevOpsConfig = z.infer<typeof AzureDevOpsConfigSchema>;

/**
 * Reporting configuration schema
 */
export const ReportingConfigSchema = z.object({
  format: z.enum(['markdown', 'json', 'both']).default('markdown'),
  outputDir: z.string().default('./reports'),
  includeRecommendations: z.boolean().default(true),
  includeRawData: z.boolean().default(false),
  maxRecommendations: z.number().positive().default(10),
});

export type ReportingConfig = z.infer<typeof ReportingConfigSchema>;

/**
 * Caching configuration schema
 */
export const CacheConfigSchema = z.object({
  enabled: z.boolean().default(true),
  ttl: z.number().positive().default(3600), // 1 hour in seconds
  directory: z.string().default('./.cache'),
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

/**
 * Root configuration schema
 * At least one platform (GitHub or Azure DevOps) must be configured
 */
export const FinOpsConfigSchema = z
  .object({
    github: GitHubConfigSchema.optional(),
    azureDevOps: AzureDevOpsConfigSchema.optional(),
    reporting: ReportingConfigSchema.default({}),
    cache: CacheConfigSchema.default({}),
  })
  .refine((data) => data.github || data.azureDevOps, {
    message: 'At least one platform (github or azureDevOps) must be configured',
  });

export type FinOpsConfig = z.infer<typeof FinOpsConfigSchema>;

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<FinOpsConfig> = {
  reporting: {
    format: 'markdown',
    outputDir: './reports',
    includeRecommendations: true,
    includeRawData: false,
    maxRecommendations: 10,
  },
  cache: {
    enabled: true,
    ttl: 3600,
    directory: './.cache',
  },
};
