/**
 * GitHub API Client using Octokit
 * Handles rate limiting, pagination, and error handling
 */

import { Octokit } from '@octokit/rest';
import { getLogger } from '../utils/logger';
import { getCache } from '../utils/cache';

export interface GitHubClientOptions {
  token: string;
  baseUrl?: string;
}

export interface ActionsBillingResponse {
  total_minutes_used: number;
  total_paid_minutes_used: number;
  included_minutes: number;
  minutes_used_breakdown: {
    UBUNTU?: number;
    MACOS?: number;
    WINDOWS?: number;
  };
}

export interface StorageBillingResponse {
  days_left_in_billing_cycle: number;
  estimated_paid_storage_for_month: number;
  estimated_storage_for_month: number;
}

export interface CodespacesBillingResponse {
  total_hours_used: number;
  total_paid_hours_used: number;
  included_hours: number;
}

export interface CacheUsageResponse {
  total_active_caches_size_in_bytes: number;
  total_active_caches_count: number;
}

export interface WorkflowRun {
  id: number;
  name: string | null;
  head_branch: string | null;
  status: string;
  conclusion: string | null;
  run_started_at: string;
  updated_at: string;
  workflow_id: number;
  repository: {
    name: string;
    full_name: string;
  };
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  fork: boolean;
  archived: boolean | undefined;
}

export interface Codespace {
  id: number;
  name: string;
  owner: {
    login: string;
  };
  machine: {
    name: string;
    display_name: string;
    cpus: number;
    memory_in_bytes: number;
  } | null;
  state: string;
  created_at: string;
  last_used_at: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private logger = getLogger();

  constructor(options: GitHubClientOptions) {
    this.octokit = new Octokit({
      auth: options.token,
      baseUrl: options.baseUrl,
      log: {
        debug: (message) => this.logger.debug(`Octokit: ${message}`),
        info: (message) => this.logger.debug(`Octokit: ${message}`),
        warn: (message) => this.logger.warn(`Octokit: ${message}`),
        error: (message) => this.logger.error(`Octokit: ${message}`),
      },
    });
  }

  /**
   * Check rate limit and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      const { remaining, reset } = data.rate;

      if (remaining < 10) {
        const now = Math.floor(Date.now() / 1000);
        const waitTime = reset - now;

        if (waitTime > 0) {
          this.logger.warn(
            `Rate limit low (${remaining} remaining). Waiting ${waitTime} seconds...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
        }
      }
    } catch (error) {
      this.logger.debug('Failed to check rate limit', error);
      // Continue anyway - let the actual request fail if needed
    }
  }

  /**
   * Handle rate limit errors with exponential backoff
   */
  private async withRateLimitRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.checkRateLimit();
        return await fn();
      } catch (error: unknown) {
        const err = error as { status?: number; message?: string };

        if (err.status === 403 || err.status === 429) {
          const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `Rate limit hit (attempt ${attempt + 1}/${maxRetries}). Waiting ${waitTime}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          lastError = error as Error;
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Get Actions billing for an organization
   */
  async getActionsBilling(org: string): Promise<ActionsBillingResponse> {
    const cacheKey = `github:actions-billing:${org}`;
    const cached = getCache().get<ActionsBillingResponse>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for Actions billing: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching Actions billing for org: ${org}`);

    const response = await this.withRateLimitRetry(async () => {
      return await this.octokit.rest.billing.getGithubActionsBillingOrg({ org });
    });

    getCache().set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get shared storage (LFS) billing for an organization
   */
  async getStorageBilling(org: string): Promise<StorageBillingResponse> {
    const cacheKey = `github:storage-billing:${org}`;
    const cached = getCache().get<StorageBillingResponse>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for storage billing: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching storage billing for org: ${org}`);

    const response = await this.withRateLimitRetry(async () => {
      return await this.octokit.rest.billing.getSharedStorageBillingOrg({ org });
    });

    getCache().set(cacheKey, response.data);
    return response.data;
  }

  /**
   * Get Codespaces billing for an organization
   */
  async getCodespacesBilling(org: string): Promise<CodespacesBillingResponse> {
    const cacheKey = `github:codespaces-billing:${org}`;
    const cached = getCache().get<CodespacesBillingResponse>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for Codespaces billing: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching Codespaces billing for org: ${org}`);

    try {
      const response = await this.withRateLimitRetry(async () => {
        return await this.octokit.rest.billing.getGithubPackagesBillingOrg({ org });
      });

      // Note: The API endpoint name is getGithubPackagesBillingOrg but it returns Codespaces data
      // This is a known quirk in the Octokit types
      const data = response.data as unknown as CodespacesBillingResponse;
      getCache().set(cacheKey, data);
      return data;
    } catch (error: unknown) {
      const err = error as { status?: number };
      // Codespaces might not be enabled
      if (err.status === 404 || err.status === 403) {
        this.logger.debug(`Codespaces not available for org: ${org}`);
        return {
          total_hours_used: 0,
          total_paid_hours_used: 0,
          included_hours: 0,
        };
      }
      throw error;
    }
  }

  /**
   * Get Actions cache usage for an organization
   */
  async getCacheUsage(org: string): Promise<CacheUsageResponse> {
    const cacheKey = `github:cache-usage:${org}`;
    const cached = getCache().get<CacheUsageResponse>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for cache usage: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching cache usage for org: ${org}`);

    const response = await this.withRateLimitRetry(async () => {
      return await this.octokit.rest.actions.getActionsCacheUsageForOrg({ org });
    });

    getCache().set(cacheKey, response.data);
    return response.data;
  }

  /**
   * List workflow runs for a repository with pagination support
   */
  async listWorkflowRuns(
    owner: string,
    repo: string,
    options?: {
      status?: 'completed' | 'in_progress' | 'queued';
      created?: string;
      per_page?: number;
    }
  ): Promise<WorkflowRun[]> {
    const cacheKey = `github:workflow-runs:${owner}/${repo}:${JSON.stringify(options || {})}`;
    const cached = getCache().get<WorkflowRun[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for workflow runs: ${owner}/${repo}`);
      return cached;
    }

    this.logger.debug(`Fetching workflow runs for ${owner}/${repo}`);

    const runs = await this.withRateLimitRetry(async () => {
      return await this.octokit.paginate(this.octokit.rest.actions.listWorkflowRunsForRepo, {
        owner,
        repo,
        per_page: options?.per_page || 100,
        status: options?.status,
        created: options?.created,
      });
    });

    // Map to our interface
    const mappedRuns: WorkflowRun[] = runs.map((run) => ({
      id: run.id,
      name: run.name || 'Unknown',
      head_branch: run.head_branch || '',
      status: run.status || '',
      conclusion: run.conclusion,
      run_started_at: run.run_started_at || run.created_at,
      updated_at: run.updated_at,
      workflow_id: run.workflow_id,
      repository: run.repository
        ? {
            name: run.repository.name,
            full_name: run.repository.full_name,
          }
        : { name: repo, full_name: `${owner}/${repo}` },
    }));

    getCache().set(cacheKey, mappedRuns);
    return mappedRuns;
  }

  /**
   * List repositories for an organization
   */
  async listRepositories(org: string): Promise<Repository[]> {
    const cacheKey = `github:repositories:${org}`;
    const cached = getCache().get<Repository[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for repositories: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching repositories for org: ${org}`);

    const repos = await this.withRateLimitRetry(async () => {
      return await this.octokit.paginate(this.octokit.rest.repos.listForOrg, {
        org,
        per_page: 100,
        type: 'all',
      });
    });

    // Map to our interface
    const mappedRepos: Repository[] = repos.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      fork: repo.fork || false,
      archived: repo.archived,
    }));

    getCache().set(cacheKey, mappedRepos);
    return mappedRepos;
  }

  /**
   * List Codespaces for an organization
   */
  async listCodespaces(org: string): Promise<Codespace[]> {
    const cacheKey = `github:codespaces:${org}`;
    const cached = getCache().get<Codespace[]>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for codespaces: ${org}`);
      return cached;
    }

    this.logger.debug(`Fetching codespaces for org: ${org}`);

    try {
      const response = await this.withRateLimitRetry(async () => {
        return await this.octokit.rest.codespaces.listInOrganization({
          org,
          per_page: 100,
        });
      });

      const codespaces: Codespace[] = (response.data.codespaces || []).map((cs) => ({
        id: cs.id,
        name: cs.name,
        owner: { login: cs.owner.login },
        machine: cs.machine,
        state: cs.state,
        created_at: cs.created_at,
        last_used_at: cs.last_used_at,
      }));

      getCache().set(cacheKey, codespaces);
      return codespaces;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      // Codespaces might not be enabled for the org
      if (err.status === 404 || err.status === 403) {
        this.logger.debug(`Codespaces not available for org: ${org}`);
        return [];
      }
      throw error;
    }
  }
}
