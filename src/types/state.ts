/**
 * Shared state interface for the FinOps multi-agent system
 * This state is shared across all agents and persists analysis results
 */

/**
 * GitHub Actions usage metrics
 */
export interface GitHubActionsData {
  organization: string;
  totalMinutesUsed: number;
  paidMinutesUsed: number;
  includedMinutes: number;
  minutesByOS: {
    ubuntu: number;
    windows: number;
    macos: number;
  };
  topWorkflows: Array<{
    repo: string;
    workflow: string;
    minutesConsumed: number;
    failureRate: number;
  }>;
  timestamp: string;
}

/**
 * GitHub LFS storage metrics
 */
export interface GitHubLFSData {
  organization: string;
  storageGB: number;
  bandwidthGB: number;
  estimatedMonthlyCost: number;
  timestamp: string;
}

/**
 * GitHub Codespaces usage metrics
 */
export interface GitHubCodespacesData {
  organization: string;
  totalHours: number;
  paidHours: number;
  includedHours: number;
  hoursByMachineType: Record<string, number>;
  activeCodespaces: Array<{
    owner: string;
    machineType: string;
    lastUsed: string;
    hoursUsed: number;
  }>;
  idleCodespaces: Array<{
    owner: string;
    machineType: string;
    lastUsed: string;
    daysIdle: number;
  }>;
  timestamp: string;
}

/**
 * Combined GitHub usage data
 */
export interface GitHubUsageData {
  actions?: GitHubActionsData;
  lfs?: GitHubLFSData;
  codespaces?: GitHubCodespacesData;
}

/**
 * Azure DevOps parallel job usage
 */
export interface AzureDevOpsParallelJobData {
  organization: string;
  pools: Array<{
    poolId: number;
    poolName: string;
    isHosted: boolean;
    totalJobs: number;
    utilizationRate: number; // 0-1
    avgQueueTime: number; // minutes
  }>;
  hostedJobsPurchased: number;
  selfHostedAgents: number;
  timestamp: string;
}

/**
 * Azure DevOps pipeline run history
 */
export interface AzureDevOpsPipelineData {
  organization: string;
  project: string;
  pipelines: Array<{
    pipelineId: number;
    pipelineName: string;
    totalRuns: number;
    failureRate: number;
    avgDuration: number; // minutes
    avgQueueTime: number; // minutes
  }>;
  timestamp: string;
}

/**
 * Azure DevOps user license data
 */
export interface AzureDevOpsLicenseData {
  organization: string;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  licensesByType: Record<string, number>;
  inactiveUserDetails: Array<{
    userId: string;
    userName: string;
    licenseType: string;
    lastAccessDate: string;
    daysSinceLastAccess: number;
  }>;
  timestamp: string;
}

/**
 * Combined Azure DevOps usage data
 */
export interface AzureDevOpsUsageData {
  parallelJobs?: AzureDevOpsParallelJobData;
  pipelines?: AzureDevOpsPipelineData[];
  licenses?: AzureDevOpsLicenseData;
}

/**
 * Cost calculation results
 */
export interface CostBreakdown {
  category: string;
  currentMonthCost: number;
  projectedMonthCost: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  percentChange: number;
}

/**
 * Calculated costs for a platform
 */
export interface CalculatedCosts {
  github?: {
    actions: CostBreakdown;
    lfs: CostBreakdown;
    codespaces: CostBreakdown;
    total: number;
  };
  azureDevOps?: {
    parallelJobs: CostBreakdown;
    licenses: CostBreakdown;
    total: number;
  };
  grandTotal: number;
  timestamp: string;
}

/**
 * Individual recommendation
 */
export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'quick-win' | 'medium-effort' | 'strategic';
  title: string;
  description: string;
  estimatedSavings: number; // dollars per month
  effort: string; // e.g., "2 hours", "1 week"
  implementationSteps: string[];
  platform: 'github' | 'azuredevops' | 'both';
}

/**
 * Root state interface - shared across all agents
 */
export interface FinOpsState {
  // Configuration
  organizations: {
    github: string[];
    azureDevOps: string[];
  };

  // Raw usage data
  githubData: Record<string, GitHubUsageData>; // keyed by org name
  azureDevOpsData: Record<string, AzureDevOpsUsageData>; // keyed by org name

  // Calculated costs
  costs?: CalculatedCosts;

  // Generated recommendations
  recommendations: Recommendation[];

  // Metadata
  analysisStartTime: string;
  analysisEndTime?: string;
  cacheUsed: boolean;
}

/**
 * Initialize an empty state
 */
export function createEmptyState(
  githubOrgs: string[],
  azdoOrgs: string[]
): FinOpsState {
  return {
    organizations: {
      github: githubOrgs,
      azureDevOps: azdoOrgs,
    },
    githubData: {},
    azureDevOpsData: {},
    recommendations: [],
    analysisStartTime: new Date().toISOString(),
    cacheUsed: false,
  };
}
