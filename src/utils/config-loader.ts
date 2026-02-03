/**
 * Configuration loader - loads config from file, env vars, and CLI flags
 */

import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { FinOpsConfig, FinOpsConfigSchema, DEFAULT_CONFIG } from '../types/config';
import { getLogger } from './logger';

/**
 * Load configuration from a JSON file
 */
function loadConfigFromFile(filePath: string): Partial<FinOpsConfig> {
  const logger = getLogger();

  try {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      logger.warn(`Config file not found: ${absolutePath}`);
      return {};
    }

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const parsed = JSON.parse(content) as unknown;
    logger.debug(`Loaded config from file: ${absolutePath}`);
    return parsed as Partial<FinOpsConfig>;
  } catch (error) {
    logger.error(`Failed to load config file: ${filePath}`, error);
    throw new Error(`Invalid config file: ${filePath}`);
  }
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): Partial<FinOpsConfig> {
  const config: Partial<FinOpsConfig> = {};

  // GitHub configuration
  if (process.env.GITHUB_TOKEN) {
    config.github = {
      token: process.env.GITHUB_TOKEN,
      organizations: process.env.GITHUB_ORGS
        ? process.env.GITHUB_ORGS.split(',').map((org) => org.trim())
        : [],
    };
  }

  // Azure DevOps configuration
  if (process.env.AZDO_PAT) {
    config.azureDevOps = {
      pat: process.env.AZDO_PAT,
      organizations: process.env.AZDO_ORGS
        ? process.env.AZDO_ORGS.split(',').map((org) => org.trim())
        : [],
    };
  }

  // Cache configuration
  if (process.env.CACHE_TTL || process.env.CACHE_DIR) {
    config.cache = {
      enabled: true,
      ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 3600,
      directory: process.env.CACHE_DIR || './.cache',
    };
  }

  // Reporting configuration
  if (process.env.REPORT_OUTPUT_DIR) {
    config.reporting = {
      format: 'markdown',
      outputDir: process.env.REPORT_OUTPUT_DIR,
      includeRecommendations: true,
      includeRawData: false,
      maxRecommendations: 10,
    };
  }

  return config;
}

/**
 * Merge multiple config sources with priority: CLI > Env > File > Default
 */
function mergeConfigs(...configs: Partial<FinOpsConfig>[]): Partial<FinOpsConfig> {
  const merged: Partial<FinOpsConfig> = {};

  for (const config of configs) {
    // Merge top-level properties
    if (config.github) {
      merged.github = { ...merged.github, ...config.github };
    }
    if (config.azureDevOps) {
      merged.azureDevOps = { ...merged.azureDevOps, ...config.azureDevOps };
    }
    if (config.reporting) {
      merged.reporting = { ...merged.reporting, ...config.reporting };
    }
    if (config.cache) {
      merged.cache = { ...merged.cache, ...config.cache };
    }
  }

  return merged;
}

/**
 * Load and validate configuration
 */
export function loadConfig(options: {
  configFile?: string;
  cliOverrides?: Partial<FinOpsConfig>;
}): FinOpsConfig {
  const logger = getLogger();
  logger.debug('Loading configuration...');

  // Load from different sources
  const fileConfig = options.configFile ? loadConfigFromFile(options.configFile) : {};
  const envConfig = loadConfigFromEnv();
  const cliConfig = options.cliOverrides || {};

  // Merge with priority: CLI > Env > File > Default
  const mergedConfig = mergeConfigs(DEFAULT_CONFIG, fileConfig, envConfig, cliConfig);

  // Validate with Zod
  try {
    const validatedConfig = FinOpsConfigSchema.parse(mergedConfig);
    logger.debug('Configuration validated successfully');
    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed:');
      for (const issue of error.issues) {
        logger.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      throw new Error('Invalid configuration. Please check your config file and environment variables.');
    }
    throw error;
  }
}

/**
 * Load configuration from environment only (for quick setup)
 */
export function loadConfigFromEnvOnly(): FinOpsConfig {
  return loadConfig({ cliOverrides: loadConfigFromEnv() });
}
