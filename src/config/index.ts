import { existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { z } from 'zod';

const GitHubConfigSchema = z.object({
  token: z.string().min(1),
  organizations: z.array(z.string()).optional(),
});

const AzureDevOpsConfigSchema = z.object({
  pat: z.string().min(1),
  organizations: z.array(z.string()).optional(),
});

const PricingConfigSchema = z
  .object({
    github: z.record(z.string(), z.unknown()).optional(),
    azureDevOps: z.record(z.string(), z.unknown()).optional(),
  })
  .optional();

const ThresholdsConfigSchema = z
  .object({
    inactiveDays: z.number().int().positive().default(90),
    minSavingsToReport: z.number().positive().default(10),
  })
  .optional();

const ConfigSchema = z.object({
  github: GitHubConfigSchema.optional(),
  azureDevOps: AzureDevOpsConfigSchema.optional(),
  pricing: PricingConfigSchema,
  thresholds: ThresholdsConfigSchema,
});

export type FinOpsConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): FinOpsConfig {
  const config: Partial<FinOpsConfig> = {};

  // Load from environment variables
  if (process.env.GITHUB_TOKEN) {
    config.github = {
      token: process.env.GITHUB_TOKEN,
      organizations: process.env.GITHUB_ORGS?.split(',').map((s) => s.trim()),
    };
  }

  if (process.env.AZURE_DEVOPS_PAT) {
    config.azureDevOps = {
      pat: process.env.AZURE_DEVOPS_PAT,
      organizations: process.env.AZURE_DEVOPS_ORGS?.split(',').map((s) => s.trim()),
    };
  }

  // Load from config file if it exists
  const configPath = join(homedir(), '.finops-agent', 'config.json');
  if (existsSync(configPath)) {
    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);

      // Merge file config with env config (env takes precedence)
      if (fileConfig.github && !config.github) {
        config.github = fileConfig.github;
      }
      if (fileConfig.azureDevOps && !config.azureDevOps) {
        config.azureDevOps = fileConfig.azureDevOps;
      }
      if (fileConfig.pricing) {
        config.pricing = fileConfig.pricing;
      }
      if (fileConfig.thresholds) {
        config.thresholds = fileConfig.thresholds;
      }
    } catch (error) {
      console.error(`Failed to load config from ${configPath}:`, error);
    }
  }

  // Apply defaults for thresholds
  config.thresholds = {
    inactiveDays: config.thresholds?.inactiveDays ?? 90,
    minSavingsToReport: config.thresholds?.minSavingsToReport ?? 10,
  };

  // Validate the merged config
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    throw new Error('Invalid configuration. Please check your environment variables or config file.');
  }
}

export function validateCredentials(config: FinOpsConfig, platform: 'github' | 'azdo' | 'all') {
  if (platform === 'github' || platform === 'all') {
    if (!config.github?.token) {
      throw new Error(
        'GitHub credentials missing. Set GITHUB_TOKEN environment variable or add to ~/.finops-agent/config.json'
      );
    }
  }

  if (platform === 'azdo' || platform === 'all') {
    if (!config.azureDevOps?.pat) {
      throw new Error(
        'Azure DevOps credentials missing. Set AZURE_DEVOPS_PAT environment variable or add to ~/.finops-agent/config.json'
      );
    }
  }
}
