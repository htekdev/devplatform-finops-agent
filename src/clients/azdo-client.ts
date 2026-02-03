/**
 * Azure DevOps API Client using axios
 * Handles authentication, pagination, and multiple base URLs
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { getLogger } from '../utils/logger';
import { getCache } from '../utils/cache';

export interface AzureDevOpsClientOptions {
  pat: string;
  organization: string;
}

export interface AgentPool {
  id: number;
  name: string;
  isHosted: boolean;
  poolType: string;
  size: number;
  targetSize: number;
  createdOn: string;
  autoProvision: boolean;
}

export interface Agent {
  id: number;
  name: string;
  version: string;
  osDescription: string;
  enabled: boolean;
  status: 'online' | 'offline';
  statusChangedOn: string;
  createdOn: string;
  maxParallelism: number;
  assignedRequest?: unknown;
  lastCompletedRequest?: unknown;
}

export interface PipelineRun {
  id: number;
  name: string;
  state: string;
  result: string;
  createdDate: string;
  finishedDate: string;
  pipeline: {
    id: number;
    name: string;
  };
}

export interface UserEntitlement {
  id: string;
  user: {
    displayName: string;
    mailAddress: string;
    principalName: string;
  };
  accessLevel: {
    accountLicenseType: string;
    licensingSource: string;
    status: string;
  };
  lastAccessedDate: string;
  dateCreated: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  state: string;
  visibility: string;
}

export class AzureDevOpsClient {
  private readonly pat: string;
  private logger = getLogger();
  private baseAxios: AxiosInstance;

  // Base URLs for different API endpoints
  private baseUrls = {
    core: `https://dev.azure.com`,
    vsaex: `https://vsaex.dev.azure.com`,
    vssps: `https://vssps.dev.azure.com`,
  };

  constructor(options: AzureDevOpsClientOptions) {
    this.pat = options.pat;

    // Create axios instance with default config
    this.baseAxios = axios.create({
      auth: {
        username: '',
        password: this.pat,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for logging
    this.baseAxios.interceptors.request.use((config) => {
      this.logger.debug(`ADO API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    // Add response interceptor for error handling
    this.baseAxios.interceptors.response.use(
      (response) => response,
      (error: { response?: { status: number } }) => {
        if (error.response) {
          const status = error.response.status;
          if (status === 401) {
            this.logger.error('Azure DevOps authentication failed. Check PAT validity.');
          } else if (status === 403) {
            this.logger.error(
              'Azure DevOps authorization failed. Check PAT scopes: vso.agentpools, vso.build, vso.memberentitlementmanagement'
            );
          } else if (status === 429) {
            this.logger.warn('Azure DevOps rate limit hit. Implement backoff.');
          }
        }
        throw error;
      }
    );
  }

  /**
   * Make a request with automatic pagination using continuation tokens
   */
  private async makeRequestWithPagination<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T[]> {
    const results: T[] = [];
    let continuationToken: string | null = null;

    do {
      const requestConfig: AxiosRequestConfig = {
        ...config,
        params: {
          ...(config?.params as Record<string, unknown>),
          'api-version': '7.0',
          ...(continuationToken && { continuationToken }),
        },
      };

      const response = await this.baseAxios.get<{
        value?: T[];
        members?: T[];
        continuationToken?: string;
      }>(url, requestConfig);

      // Handle different response formats
      if (response.data.value) {
        results.push(...response.data.value);
      } else if (response.data.members) {
        results.push(...response.data.members);
      } else if (Array.isArray(response.data)) {
        results.push(...(response.data as T[]));
      }

      // Check for continuation token in headers or response
      const headerToken = response.headers['x-ms-continuationtoken'] as string | undefined;
      continuationToken = headerToken || response.data.continuationToken || null;
    } while (continuationToken);

    return results;
  }

  /**
   * Get all agent pools for an organization
   */
  async getAgentPools(org: string): Promise<AgentPool[]> {
    const cacheKey = `azdo:agent-pools:${org}`;
    const cached = getCache().get<AgentPool[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for agent pools: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching agent pools for org: ${org}`);

    try {
      const url = `${this.baseUrls.core}/${org}/_apis/distributedtask/pools`;
      const pools = await this.makeRequestWithPagination<AgentPool>(url);

      getCache().set(cacheKey, pools);
      return pools;
    } catch (error) {
      this.logger.error(`Failed to fetch agent pools for ${org}:`, error);
      throw new Error(`Failed to fetch agent pools for ${org}: ${String(error)}`);
    }
  }

  /**
   * Get all agents in a specific pool
   */
  async getAgentsInPool(org: string, poolId: number): Promise<Agent[]> {
    const cacheKey = `azdo:agents:${org}:${poolId}`;
    const cached = getCache().get<Agent[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for agents in pool ${poolId}: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching agents in pool ${poolId} for org: ${org}`);

    try {
      const url = `${this.baseUrls.core}/${org}/_apis/distributedtask/pools/${poolId}/agents`;
      const agents = await this.makeRequestWithPagination<Agent>(url, {
        params: {
          includeCapabilities: false,
          includeAssignedRequest: true,
          includeLastCompletedRequest: true,
        },
      });

      getCache().set(cacheKey, agents);
      return agents;
    } catch (error) {
      this.logger.error(`Failed to fetch agents for pool ${poolId}:`, error);
      throw new Error(`Failed to fetch agents for pool ${poolId}: ${String(error)}`);
    }
  }

  /**
   * Get pipeline runs for a project
   */
  async getPipelineRuns(
    org: string,
    project: string,
    options?: {
      pipelineId?: number;
      minDate?: string;
    }
  ): Promise<PipelineRun[]> {
    const cacheKey = `azdo:pipeline-runs:${org}:${project}:${JSON.stringify(options || {})}`;
    const cached = getCache().get<PipelineRun[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for pipeline runs: ${org}/${project}`);
      return cached;
    }

    this.logger.debug(`Fetching pipeline runs for ${org}/${project}`);

    try {
      const url = `${this.baseUrls.core}/${org}/${project}/_apis/pipelines/runs`;
      const runs = await this.makeRequestWithPagination<PipelineRun>(url, {
        params: {
          ...(options?.pipelineId && { pipelineId: options.pipelineId }),
        },
      });

      // Filter by date if specified
      const filteredRuns = options?.minDate
        ? runs.filter((run) => new Date(run.createdDate) >= new Date(options.minDate!))
        : runs;

      getCache().set(cacheKey, filteredRuns);
      return filteredRuns;
    } catch (error) {
      this.logger.error(`Failed to fetch pipeline runs for ${org}/${project}:`, error);
      throw new Error(`Failed to fetch pipeline runs for ${org}/${project}: ${String(error)}`);
    }
  }

  /**
   * Get user entitlements for license analysis
   */
  async getUserEntitlements(org: string): Promise<UserEntitlement[]> {
    const cacheKey = `azdo:user-entitlements:${org}`;
    const cached = getCache().get<UserEntitlement[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for user entitlements: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching user entitlements for org: ${org}`);

    try {
      const url = `${this.baseUrls.vsaex}/${org}/_apis/userentitlements`;
      const entitlements = await this.makeRequestWithPagination<UserEntitlement>(url);

      getCache().set(cacheKey, entitlements);
      return entitlements;
    } catch (error) {
      this.logger.error(`Failed to fetch user entitlements for ${org}:`, error);
      throw new Error(`Failed to fetch user entitlements for ${org}: ${String(error)}`);
    }
  }

  /**
   * Get all projects in an organization
   */
  async getProjects(org: string): Promise<Project[]> {
    const cacheKey = `azdo:projects:${org}`;
    const cached = getCache().get<Project[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for projects: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching projects for org: ${org}`);

    try {
      const url = `${this.baseUrls.core}/${org}/_apis/projects`;
      const projects = await this.makeRequestWithPagination<Project>(url);

      getCache().set(cacheKey, projects);
      return projects;
    } catch (error) {
      this.logger.error(`Failed to fetch projects for ${org}:`, error);
      throw new Error(`Failed to fetch projects for ${org}: ${String(error)}`);
    }
  }
}
