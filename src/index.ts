/**
 * DevPlatform FinOps Agent
 * 
 * Multi-agent system for analyzing GitHub and Azure DevOps platform costs.
 */

// Agents
export { GitHubAnalyzerAgent } from "./agents/github-analyzer.js";
export type { GitHubAnalysisContext } from "./agents/github-analyzer.js";

export { AzDOAnalyzerAgent } from "./agents/azdo-analyzer.js";
export type { AzDOAnalysisContext } from "./agents/azdo-analyzer.js";

export { OrchestratorAgent } from "./agents/orchestrator.js";
export type { OrchestratorContext, PlatformResults } from "./agents/orchestrator.js";

// Configuration
export { loadConfig, validateConfig } from "./lib/config.js";
export type { FinOpsConfig } from "./lib/config.js";

// Error handling
export { wrapToolHandler } from "./lib/error-handling.js";
export type { ToolResult } from "./lib/error-handling.js";

// GitHub tools
export { createFinOpsOctokit, createThrottledOctokit, createUnthrottledOctokit } from "./tools/github/octokit-factory.js";
export { getGitHubActionsBilling } from "./tools/github/actions-billing.js";
export { getLFSStorage } from "./tools/github/lfs-storage.js";
export { getCodespacesUsage } from "./tools/github/codespaces-usage.js";

export type { ActionsBillingData } from "./tools/github/actions-billing.js";
export type { LFSStorageData } from "./tools/github/lfs-storage.js";
export type { CodespacesUsageData } from "./tools/github/codespaces-usage.js";

// Azure DevOps tools
export { createAzDOConnection, getOrgUrl, getVSAEXUrl } from "./tools/azdo/azdo-connection.js";
export { getUserEntitlements } from "./tools/azdo/user-entitlements.js";
export { getAgentPools, getAgentsInPool } from "./tools/azdo/agent-pools.js";
export { getPipelineRuns, getBuilds } from "./tools/azdo/pipeline-runs.js";

export type { UserEntitlementsData, UserEntitlement } from "./tools/azdo/user-entitlements.js";
export type { AgentPoolsData, AgentPoolInfo, AgentsInPoolData, AgentInfo } from "./tools/azdo/agent-pools.js";
export type { PipelineRunsData, PipelineRunInfo, BuildsData, BuildInfo } from "./tools/azdo/pipeline-runs.js";
