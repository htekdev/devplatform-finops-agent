/**
 * DevPlatform FinOps Agent
 * 
 * Multi-agent system for analyzing GitHub and Azure DevOps platform costs.
 */

export { GitHubAnalyzerAgent } from "./agents/github-analyzer.js";
export type { GitHubAnalysisContext } from "./agents/github-analyzer.js";

export { loadConfig, validateConfig } from "./lib/config.js";
export type { FinOpsConfig } from "./lib/config.js";

export { wrapToolHandler } from "./lib/error-handling.js";
export type { ToolResult } from "./lib/error-handling.js";

export { createFinOpsOctokit, createThrottledOctokit, createUnthrottledOctokit } from "./tools/github/octokit-factory.js";
export { getGitHubActionsBilling } from "./tools/github/actions-billing.js";
export { getLFSStorage } from "./tools/github/lfs-storage.js";
export { getCodespacesUsage } from "./tools/github/codespaces-usage.js";

export type { ActionsBillingData } from "./tools/github/actions-billing.js";
export type { LFSStorageData } from "./tools/github/lfs-storage.js";
export type { CodespacesUsageData } from "./tools/github/codespaces-usage.js";
