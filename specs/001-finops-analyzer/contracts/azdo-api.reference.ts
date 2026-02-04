/**
 * REFERENCE IMPLEMENTATION - Azure DevOps API Patterns
 * 
 * This file documents the REQUIRED APIs and patterns for Azure DevOps integration.
 * Generated from Microsoft Learn REST API documentation.
 * 
 * Sources:
 * - https://learn.microsoft.com/en-us/rest/api/azure/devops/memberentitlementmanagement/user-entitlements
 * - https://learn.microsoft.com/en-us/rest/api/azure/devops/distributedtask/pools
 * - https://learn.microsoft.com/en-us/rest/api/azure/devops/pipelines/runs
 */

import * as azdev from "azure-devops-node-api";
import type { WebApi } from "azure-devops-node-api";
import type { ITaskAgentApi } from "azure-devops-node-api/TaskAgentApi";

// ============================================================================
// API ENDPOINTS REFERENCE
// ============================================================================

/**
 * Azure DevOps has TWO different base URLs:
 * 
 * 1. Standard APIs: https://dev.azure.com/{organization}
 *    - Pipelines, Builds, Repos, Work Items, etc.
 * 
 * 2. VSAEX APIs: https://vsaex.dev.azure.com/{organization}
 *    - User Entitlements (Member Entitlement Management)
 *    - This is a DIFFERENT service!
 */

export const API_ENDPOINTS = {
  // Standard Azure DevOps APIs
  standard: {
    baseUrl: (org: string) => `https://dev.azure.com/${org}`,
    
    // Agent Pools - GET /_apis/distributedtask/pools
    agentPools: "/_apis/distributedtask/pools",
    
    // Agents in Pool - GET /_apis/distributedtask/pools/{poolId}/agents
    agentsInPool: (poolId: number) => `/_apis/distributedtask/pools/${poolId}/agents`,
    
    // Pipeline Runs - GET /{project}/_apis/pipelines/{pipelineId}/runs
    pipelineRuns: (project: string, pipelineId: number) => 
      `/${project}/_apis/pipelines/${pipelineId}/runs`,
    
    // Pipelines List - GET /{project}/_apis/pipelines
    pipelines: (project: string) => `/${project}/_apis/pipelines`,
  },
  
  // Member Entitlement Management APIs (different base URL!)
  vsaex: {
    baseUrl: (org: string) => `https://vsaex.dev.azure.com/${org}`,
    
    // User Entitlements - GET /_apis/userentitlements
    userEntitlements: "/_apis/userentitlements",
  },
  
  apiVersion: "7.1",
};

// ============================================================================
// PATTERN 1: Connection Setup
// ============================================================================

export interface AzDOConnectionConfig {
  /** Organization URL: https://dev.azure.com/{org} */
  orgUrl: string;
  /** Personal Access Token with required scopes */
  pat: string;
}

/**
 * Create Azure DevOps API connection
 * 
 * Required PAT Scopes:
 * - vso.memberentitlementmanagement - Read user entitlements
 * - vso.agentpools - Read agent pools
 * - vso.build - Read pipeline runs
 */
export async function createAzDOConnection(config: AzDOConnectionConfig): Promise<WebApi> {
  const authHandler = azdev.getPersonalAccessTokenHandler(config.pat);
  const connection = new azdev.WebApi(config.orgUrl, authHandler);
  
  // Verify connection works
  await connection.connect();
  
  return connection;
}

// ============================================================================
// PATTERN 2: User Entitlements (License Usage)
// ============================================================================

/**
 * User Entitlement from Azure DevOps API
 * Used to identify inactive users for license optimization
 */
export interface UserEntitlement {
  id: string;
  user: {
    displayName: string;
    mailAddress: string;
    principalName: string;
  };
  accessLevel: {
    accountLicenseType: "none" | "earlyAdopter" | "express" | "professional" | "advanced" | "stakeholder";
    licensingSource: "none" | "account" | "msdn" | "profile" | "auto" | "trial";
    status: "none" | "active" | "disabled" | "deleted" | "pending" | "expired" | "pendingDisabled";
  };
  dateCreated: string;      // ISO 8601
  lastAccessedDate: string; // ISO 8601 - KEY FIELD for inactive detection
}

/**
 * Fetch user entitlements with pagination
 * 
 * NOTE: Uses vsaex.dev.azure.com, NOT dev.azure.com!
 * The azure-devops-node-api doesn't have a built-in client for this.
 * Use fetch/axios directly.
 */
export async function getUserEntitlements(
  org: string,
  pat: string,
  options: {
    filter?: string;  // e.g., "licenseId eq 'Account-Express'"
    orderBy?: string; // e.g., "lastAccessed desc"
  } = {}
): Promise<{ items: UserEntitlement[]; totalCount: number; continuationToken?: string }> {
  const baseUrl = API_ENDPOINTS.vsaex.baseUrl(org);
  const url = new URL(`${baseUrl}${API_ENDPOINTS.vsaex.userEntitlements}`);
  
  url.searchParams.set("api-version", API_ENDPOINTS.apiVersion);
  if (options.filter) url.searchParams.set("$filter", options.filter);
  if (options.orderBy) url.searchParams.set("$orderBy", options.orderBy);
  
  const response = await fetch(url.toString(), {
    headers: {
      "Authorization": `Basic ${Buffer.from(`:${pat}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
  });
  
  if (!response.ok) {
    // Return error object for LLM to interpret
    return {
      items: [],
      totalCount: 0,
      error: `API returned ${response.status}: ${response.statusText}`,
    } as any;
  }
  
  return response.json();
}

/**
 * Find inactive users (no access in X days)
 * 
 * Use Case: Identify licenses that can be reclaimed
 */
export async function findInactiveUsers(
  org: string,
  pat: string,
  inactiveDays: number = 90
): Promise<UserEntitlement[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
  
  const result = await getUserEntitlements(org, pat, {
    orderBy: "lastAccessed asc", // Oldest first
  });
  
  return result.items.filter(user => {
    const lastAccess = new Date(user.lastAccessedDate);
    return lastAccess < cutoffDate && user.accessLevel.status === "active";
  });
}

// ============================================================================
// PATTERN 3: Agent Pools (Pipeline Infrastructure)
// ============================================================================

/**
 * Agent Pool from Azure DevOps API
 */
export interface AgentPool {
  id: number;
  name: string;
  isHosted: boolean;          // Microsoft-hosted vs self-hosted
  poolType: "automation" | "deployment";
  size: number;               // Current number of agents
  targetSize?: number;        // For elastic pools
  options?: {
    elasticPool?: boolean;
    singleUseAgents?: boolean;
  };
}

/**
 * Agent details within a pool
 */
export interface Agent {
  id: number;
  name: string;
  status: "online" | "offline";
  enabled: boolean;
  lastCompletedRequest?: {
    requestId: number;
    finishTime: string;
    result: "succeeded" | "failed" | "canceled";
  };
}

/**
 * Get all agent pools using azure-devops-node-api
 */
export async function getAgentPools(connection: WebApi): Promise<AgentPool[]> {
  const taskAgentApi: ITaskAgentApi = await connection.getTaskAgentApi();
  const pools = await taskAgentApi.getAgentPools();
  
  return pools.map(pool => ({
    id: pool.id!,
    name: pool.name!,
    isHosted: pool.isHosted ?? false,
    poolType: pool.poolType === 1 ? "deployment" : "automation",
    size: pool.size ?? 0,
    targetSize: pool.targetSize,
    options: {
      elasticPool: (pool.options ?? 0) & 1 ? true : false,
      singleUseAgents: (pool.options ?? 0) & 2 ? true : false,
    },
  }));
}

/**
 * Get agents in a pool with utilization data
 */
export async function getAgentsInPool(
  connection: WebApi,
  poolId: number,
  includeLastRequest: boolean = true
): Promise<Agent[]> {
  const taskAgentApi = await connection.getTaskAgentApi();
  const agents = await taskAgentApi.getAgents(poolId, undefined, includeLastRequest);
  
  return agents.map(agent => ({
    id: agent.id!,
    name: agent.name!,
    status: agent.status === 1 ? "online" : "offline",
    enabled: agent.enabled ?? false,
    lastCompletedRequest: agent.lastCompletedRequest ? {
      requestId: agent.lastCompletedRequest.requestId!,
      finishTime: agent.lastCompletedRequest.finishTime?.toISOString() ?? "",
      result: mapResult(agent.lastCompletedRequest.result),
    } : undefined,
  }));
}

function mapResult(result?: number): "succeeded" | "failed" | "canceled" {
  switch (result) {
    case 2: return "succeeded";
    case 3: return "failed";
    case 4: return "canceled";
    default: return "failed";
  }
}

// ============================================================================
// PATTERN 4: Pipeline Runs (Queue Time Analysis)
// ============================================================================

/**
 * Pipeline Run from Azure DevOps API
 * Used to calculate queue wait times
 */
export interface PipelineRun {
  id: number;
  name: string;
  state: "unknown" | "inProgress" | "canceling" | "completed";
  result?: "unknown" | "succeeded" | "failed" | "canceled";
  createdDate: string;   // When queued
  finishedDate?: string; // When completed
  // Note: startedDate not in Pipelines API - need Build API for that
}

/**
 * Get pipeline runs
 * 
 * NOTE: Pipeline Runs API doesn't include startedDate!
 * For queue time analysis, you may need the Build API instead:
 * GET /{project}/_apis/build/builds
 */
export async function getPipelineRuns(
  connection: WebApi,
  project: string,
  pipelineId: number
): Promise<PipelineRun[]> {
  const pipelinesApi = await connection.getPipelinesApi();
  const runs = await pipelinesApi.listRuns(project, pipelineId);
  
  return runs.map(run => ({
    id: run.id!,
    name: run.name!,
    state: mapState(run.state),
    result: run.result ? mapRunResult(run.result) : undefined,
    createdDate: run.createdDate?.toISOString() ?? "",
    finishedDate: run.finishedDate?.toISOString(),
  }));
}

function mapState(state?: number): PipelineRun["state"] {
  switch (state) {
    case 1: return "inProgress";
    case 2: return "canceling";
    case 3: return "completed";
    default: return "unknown";
  }
}

function mapRunResult(result: number): PipelineRun["result"] {
  switch (result) {
    case 1: return "succeeded";
    case 2: return "failed";
    case 3: return "canceled";
    default: return "unknown";
  }
}

// ============================================================================
// PATTERN 5: Error Handling for LLM Tools
// ============================================================================

/**
 * All tool handlers MUST return this structure
 * This allows the LLM to understand and respond to errors
 */
export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
    retryable: boolean;
  };
}

/**
 * Wrap API calls in error handling for LLM consumption
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<ToolResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const err = error as Error & { statusCode?: number };
    
    return {
      success: false,
      error: {
        code: err.statusCode?.toString() ?? "UNKNOWN",
        message: `Failed to ${context}: ${err.message}`,
        details: err.stack,
        retryable: err.statusCode === 429 || err.statusCode === 503,
      },
    };
  }
}

// Example usage in a tool handler:
// return await withErrorHandling(
//   () => getAgentPools(connection),
//   "fetch agent pools"
// );

// ============================================================================
// REQUIRED PAT SCOPES
// ============================================================================

/**
 * Minimum required PAT scopes for FinOps analysis:
 * 
 * 1. vso.memberentitlementmanagement
 *    - Read user entitlements (licenses)
 *    - Required for: findInactiveUsers
 * 
 * 2. vso.agentpools
 *    - Read agent pools and agents
 *    - Required for: getAgentPools, getAgentsInPool
 * 
 * 3. vso.build
 *    - Read pipeline runs and builds
 *    - Required for: getPipelineRuns, queue time analysis
 * 
 * Optional:
 * - vso.project (read projects list)
 */

// ============================================================================
// ANTI-PATTERNS - DO NOT DO THESE
// ============================================================================

/**
 * ❌ WRONG: Using dev.azure.com for user entitlements
 */
// const url = `https://dev.azure.com/${org}/_apis/userentitlements`
// ^ This will 404! User entitlements are on vsaex.dev.azure.com

/**
 * ❌ WRONG: Throwing errors from tool handlers
 */
// if (!response.ok) throw new Error("API failed");
// ^ LLM can't catch exceptions. Return error object instead.

/**
 * ❌ WRONG: Not handling pagination
 */
// const users = await getUserEntitlements(org, pat);
// return users.items;
// ^ Large orgs have thousands of users. Check continuationToken!

/**
 * ❌ WRONG: Using Pipeline Runs API for queue time without startedDate
 */
// const queueTime = new Date(run.finishedDate) - new Date(run.createdDate);
// ^ This gives total time, not queue time. Use Build API for startedDate.
