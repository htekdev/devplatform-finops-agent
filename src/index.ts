/**
 * Main entry point for DevPlatform FinOps Agent
 * Exports public API for programmatic use
 */

// Types
export type {
  FinOpsState,
  GitHubUsageData,
  GitHubActionsData,
  GitHubLFSData,
  GitHubCodespacesData,
  AzureDevOpsUsageData,
  AzureDevOpsParallelJobData,
  AzureDevOpsPipelineData,
  AzureDevOpsLicenseData,
  CalculatedCosts,
  CostBreakdown,
  Recommendation,
} from './types/state';

export type {
  FinOpsConfig,
  GitHubConfig,
  AzureDevOpsConfig,
  ReportingConfig,
  CacheConfig,
} from './types/config';

// Utilities
export { loadConfig, loadConfigFromEnvOnly } from './utils/config-loader';
export { initLogger, getLogger } from './utils/logger';
export { initCache, getCache, Cache } from './utils/cache';
export { createEmptyState } from './types/state';
export { StateManager, createStateManager } from './utils/state-manager';

// Configuration schemas
export {
  FinOpsConfigSchema,
  GitHubConfigSchema,
  AzureDevOpsConfigSchema,
  ReportingConfigSchema,
  CacheConfigSchema,
  DEFAULT_CONFIG,
} from './types/config';
